-- WDI IT Records – core schema
-- Lives in its own schema `it` so it can share the Supabase project with wdi-attendance
-- without touching that app's tables (public.users, public.attlog, ...).
--
-- Rules carried over from v1 (Apps Script):
--   * records are never deleted (audit trail) – DELETE is blocked by trigger, cancel via status instead
--   * calculated columns (hours, complete, ng_count, next_due, asset lookup) are computed by the DB, never typed
--   * legacy asset sheets are imported read-only into it.assets
--   * every insert/update is written to it.audit_log (who, when, old -> new)

create schema if not exists it;

-- ------------------------------------------------------------------ access control
create table it.members (
  email        text primary key check (email = lower(email)),
  role         text not null check (role in ('editor', 'viewer')),
  display_name text,
  created_at   timestamptz not null default now()
);

create or replace function it.current_email() returns text
language sql stable as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) $$;

create or replace function it.my_role() returns text
language sql stable security definer set search_path = '' as $$
  select role from it.members where email = it.current_email()
$$;

create or replace function it.is_member() returns boolean
language sql stable as $$ select it.my_role() is not null $$;

create or replace function it.is_editor() returns boolean
language sql stable as $$ select it.my_role() = 'editor' $$;

-- ------------------------------------------------------------------ lookup lists (was sheet "Lists")
create table it.list_items (
  list_key text not null,           -- type | system | dept | user | escalation | condition
  value    text not null,
  label    text,                    -- optional longer text (e.g. priority definition)
  sort     int  not null default 0,
  active   boolean not null default true,
  primary key (list_key, value)
);

create table it.maint_types (
  name         text primary key,
  every_months int  not null check (every_months > 0),
  sort         int  not null default 0
);

create table it.holidays (
  day  date primary key,
  name text
);

create table it.settings (
  key   text primary key,
  value text not null
);

-- ------------------------------------------------------------------ audit columns helper
create or replace function it.touch() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.created_by := it.current_email();
  else
    new.created_at := old.created_at;
    new.created_by := old.created_by;
  end if;
  new.updated_at := now();
  new.updated_by := it.current_email();
  return new;
end $$;

-- ------------------------------------------------------------------ records
create table it.service_log (
  id          bigint generated always as identity primary key,
  req_no      text unique not null check (req_no ~ '^SR-\d{4}-\d{3,}$'),
  req_date    date not null,
  req_time    time,
  requester   text not null,
  dept        text,
  type        text not null,
  system      text,
  detail      text,
  priority    text not null check (priority in ('P1', 'P2', 'P3', 'P4')),
  action      text,
  status      text not null check (status in ('Open', 'In Progress', 'Waiting HQ/Vendor', 'Closed', 'Cancelled')),
  close_date  date,
  close_time  time,
  hours       numeric generated always as (
                case when close_date is null then null
                     else round((extract(epoch from (close_date + coalesce(close_time, '00:00'))
                                              - (req_date + coalesce(req_time, '00:00'))) / 3600)::numeric, 1) end
              ) stored,
  escalation  text,
  esc_ref     text,
  created_at  timestamptz not null default now(),
  created_by  text,
  updated_at  timestamptz not null default now(),
  updated_by  text,
  constraint closed_needs_date check (status <> 'Closed' or close_date is not null),
  constraint close_after_open check (close_date is null or close_date >= req_date)
);

-- SR-YYYY-### assigned by the DB (no race between two editors)
create or replace function it.assign_req_no() returns trigger
language plpgsql as $$
declare yr text := to_char(new.req_date, 'YYYY'); n int;
begin
  if new.req_no is null or new.req_no = '' then
    perform pg_advisory_xact_lock(hashtext('it.service_log.req_no.' || yr));
    select coalesce(max(substring(req_no from 9)::int), 0) + 1 into n
      from it.service_log where req_no like 'SR-' || yr || '-%';
    new.req_no := 'SR-' || yr || '-' || lpad(n::text, 3, '0');
  end if;
  return new;
end $$;
create trigger assign_req_no before insert on it.service_log
  for each row execute function it.assign_req_no();

create table it.daily_check (
  id          bigint generated always as identity primary key,
  check_date  date unique not null,
  firewall    text check (firewall    in ('OK', 'NG', 'N/A')),
  wan         text check (wan         in ('OK', 'NG', 'N/A')),
  vpn         text check (vpn         in ('OK', 'NG', 'N/A')),
  core_switch text check (core_switch in ('OK', 'NG', 'N/A')),
  wifi        text check (wifi        in ('OK', 'NG', 'N/A')),
  cctv        text check (cctv        in ('OK', 'NG', 'N/A')),
  ups         text check (ups         in ('OK', 'NG', 'N/A')),
  remark      text,
  checker     text not null,
  complete    int generated always as (
                case when num_nonnulls(firewall, wan, vpn, core_switch, wifi, cctv, ups) = 7 then 1 else 0 end
              ) stored,
  ng_count    int generated always as (
                (firewall = 'NG')::int + (wan = 'NG')::int + (vpn = 'NG')::int + (core_switch = 'NG')::int
                + (wifi = 'NG')::int + (cctv = 'NG')::int + (ups = 'NG')::int
              ) stored,
  created_at  timestamptz not null default now(),
  created_by  text,
  updated_at  timestamptz not null default now(),
  updated_by  text
);

create table it.weekly_check (
  id          bigint generated always as identity primary key,
  week_start  date unique not null check (extract(isodow from week_start) = 1),
  backup      text not null check (backup in ('Success', 'Failed - Rerun OK', 'Failed')),
  backup_note text,
  disk_srv    numeric(5, 1) check (disk_srv between 0 and 100),   -- % free
  disk_nvr    numeric(5, 1) check (disk_nvr between 0 and 100),
  ad_locked   int check (ad_locked >= 0),
  ad_inactive int check (ad_inactive >= 0),
  unpatched   int check (unpatched >= 0),
  remark      text,
  checker     text not null,
  created_at  timestamptz not null default now(),
  created_by  text,
  updated_at  timestamptz not null default now(),
  updated_by  text
);

create table it.maintenance (
  id            bigint generated always as identity primary key,
  done_date     date not null,
  type          text not null references it.maint_types (name) on update cascade,
  scope         text,
  result        text not null check (result in ('Pass', 'Fail')),
  evidence      text,
  done_by       text not null,
  approved_by   text,
  approval_date date,
  remark        text,
  created_at    timestamptz not null default now(),
  created_by    text,
  updated_at    timestamptz not null default now(),
  updated_by    text
);

-- legacy asset sheets (Desktop-Laptop, Monitor, Software, Accessories, Other, Internet, Plan)
-- imported as-is; the app never writes here (no insert/update policy).
create table it.assets (
  id           bigint generated always as identity primary key,
  source_sheet text not null,
  source_row   int  not null,
  asset_tag    text,
  serial       text,
  name         text,
  model        text,
  category     text,
  manufacturer text,
  user_name    text,
  department   text,
  location     text,
  status       text,
  raw          jsonb not null,           -- every original column, untouched
  imported_at  timestamptz not null default now(),
  unique (source_sheet, source_row)
);
create index on it.assets (lower(trim(asset_tag)));
create index on it.assets (lower(trim(serial)));

create table it.handover (
  id         bigint generated always as identity primary key,
  h_date     date not null,
  action     text not null check (action in ('Issue', 'Return')),
  asset_key  text not null,              -- Asset Tag, or Serial No. if no tag
  user_name  text not null,
  dept       text,
  condition  text,
  form_ref   text,
  remark     text,
  created_at timestamptz not null default now(),
  created_by text,
  updated_at timestamptz not null default now(),
  updated_by text
);

create table it.documents (
  id          bigint generated always as identity primary key,
  doc_no      text not null,
  title_en    text not null,
  title_th    text,
  title_cn    text,
  rev         text not null,
  effective   date,
  prepared_by text,
  approved_by text,
  status      text not null check (status in ('Draft', 'Active', 'Under Revision', 'Obsolete')),
  remark      text,
  created_at  timestamptz not null default now(),
  created_by  text,
  updated_at  timestamptz not null default now(),
  updated_by  text,
  unique (doc_no, rev)
);

-- ------------------------------------------------------------------ computed views (was formula columns)
create view it.maintenance_v with (security_invoker = true) as
  select m.*, (m.done_date + make_interval(months => t.every_months))::date as next_due
  from it.maintenance m join it.maint_types t on t.name = m.type;

create view it.handover_v with (security_invoker = true) as
  select h.*, a.id as asset_id, a.model, a.category,
         coalesce(a.source_sheet, 'Not found') as found_in
  from it.handover h
  left join lateral (
    select * from it.assets a
    where a.source_sheet in ('Desktop-Laptop', 'Monitor', 'Accessories')
      and (lower(trim(a.asset_tag)) = lower(trim(h.asset_key)) or lower(trim(a.serial)) = lower(trim(h.asset_key)))
    order by (lower(trim(a.asset_tag)) = lower(trim(h.asset_key))) desc, a.id
    limit 1
  ) a on true;

-- ------------------------------------------------------------------ audit log (append-only)
create table it.audit_log (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  actor      text,
  table_name text not null,
  row_id     bigint,
  op         text not null,
  old_row    jsonb,
  new_row    jsonb,
  changed    jsonb                         -- {field: [old, new]} for updates
);
create index on it.audit_log (table_name, row_id);

create or replace function it.write_audit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare diff jsonb;
begin
  if tg_op = 'UPDATE' then
    select jsonb_object_agg(n.key, jsonb_build_array(o.value, n.value)) into diff
      from jsonb_each(to_jsonb(new)) n join jsonb_each(to_jsonb(old)) o using (key)
     where n.value is distinct from o.value and n.key not in ('updated_at', 'updated_by');
    if diff is null then return new; end if;   -- nothing actually changed
  end if;
  insert into it.audit_log (actor, table_name, row_id, op, old_row, new_row, changed)
  values (it.current_email(), tg_table_name, new.id, tg_op,
          case when tg_op = 'UPDATE' then to_jsonb(old) end, to_jsonb(new), diff);
  return new;
end $$;

create or replace function it.block_delete() returns trigger
language plpgsql as $$
begin
  raise exception 'Deleting % records is not allowed (audit trail). Use status Cancelled / Obsolete instead.', tg_table_name;
end $$;

create or replace function it.block_change() returns trigger
language plpgsql as $$
begin
  raise exception 'audit_log is append-only';
end $$;
create trigger audit_log_readonly before update or delete on it.audit_log
  for each row execute function it.block_change();

do $$
declare t text;
begin
  foreach t in array array['service_log', 'daily_check', 'weekly_check', 'maintenance', 'handover', 'documents'] loop
    execute format('create trigger touch before insert or update on it.%I for each row execute function it.touch()', t);
    execute format('create trigger audit after insert or update on it.%I for each row execute function it.write_audit()', t);
    execute format('create trigger no_delete before delete on it.%I for each row execute function it.block_delete()', t);
  end loop;
end $$;
create trigger no_delete before delete on it.assets for each row execute function it.block_delete();

-- ------------------------------------------------------------------ privileges + RLS
revoke all on schema it from public, anon;
grant usage on schema it to authenticated, service_role;
grant select on all tables in schema it to authenticated;
grant insert, update on it.service_log, it.daily_check, it.weekly_check, it.maintenance,
                        it.handover, it.documents to authenticated;
grant all on all tables in schema it to service_role;
grant execute on all functions in schema it to authenticated, service_role;

do $$
declare t text;
begin
  foreach t in array array['members', 'list_items', 'maint_types', 'holidays', 'settings', 'assets', 'audit_log',
                           'service_log', 'daily_check', 'weekly_check', 'maintenance', 'handover', 'documents'] loop
    execute format('alter table it.%I enable row level security', t);
    execute format('create policy member_read on it.%I for select to authenticated using (it.is_member())', t);
  end loop;
  foreach t in array array['service_log', 'daily_check', 'weekly_check', 'maintenance', 'handover', 'documents'] loop
    execute format('create policy editor_insert on it.%I for insert to authenticated with check (it.is_editor())', t);
    execute format('create policy editor_update on it.%I for update to authenticated using (it.is_editor()) with check (it.is_editor())', t);
  end loop;
end $$;
-- lookup lists, members, assets, audit_log: changed only via service role / SQL (admin), never from the app

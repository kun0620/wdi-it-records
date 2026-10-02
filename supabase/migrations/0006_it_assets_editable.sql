-- Asset register becomes editable (single editor), with auto-numbered tags and a status lifecycle.
--   tag   = WDI-<prefix>-0001, sequence per prefix, issued by the DB (advisory lock -> never duplicated)
--   status: In Use / In Stock / Repair / Retired / Lost / Planned (Planned = not bought yet -> no tag)
-- Imported rows keep source_sheet/source_row/raw as provenance. Still no DELETE: retire instead.

alter table it.assets
  alter column source_sheet drop not null,
  alter column source_row   drop not null,
  alter column raw          set default '{}'::jsonb,
  add column ip_address    text,
  add column mac           text,
  add column purchase_date date,
  add column warranty_end  date,
  add column vendor        text,
  add column price         numeric(12, 2) check (price >= 0),
  add column remark        text,
  add column created_at    timestamptz,
  add column created_by    text,
  add column updated_at    timestamptz,
  add column updated_by    text;

-- backfill from the imported sheets
update it.assets set
  ip_address = nullif(trim(raw ->> 'IP Address'), ''),
  mac        = nullif(trim(raw ->> 'MAC'), ''),
  status     = case when source_sheet = 'Plan' then 'Planned' else 'In Use' end,
  created_at = imported_at,
  created_by = 'import',
  updated_at = imported_at,
  updated_by = 'import';

alter table it.assets
  alter column status set default 'In Stock',
  alter column status set not null,
  add constraint asset_status check (status in ('In Use', 'In Stock', 'Repair', 'Retired', 'Lost', 'Planned')),
  add constraint warranty_after_purchase check (warranty_end is null or purchase_date is null or warranty_end >= purchase_date);

create unique index assets_tag_unique on it.assets (lower(asset_tag)) where asset_tag is not null;

-- category -> tag prefix
create or replace function it.asset_prefix(cat text) returns text
language sql immutable set search_path = '' as $$
  select case
    when cat ilike 'desktop%'                    then 'PC'
    when cat ilike 'laptop%' or cat ilike 'notebook%' then 'NB'
    when cat ilike '%nvr%' or cat ilike '%cctv%' or cat ilike '%camera%' then 'CA'
    when cat ilike 'network%'                    then 'NW'
    when cat ilike 'printer%'                    then 'PR'
    when cat ilike 'access control%'             then 'AC'
    else 'OT' end
$$;

create or replace function it.next_asset_tag(cat text) returns text
language plpgsql security definer set search_path = '' as $$
declare p text := it.asset_prefix(cat); n int;
begin
  perform pg_advisory_xact_lock(hashtext('it.asset_tag.' || p));
  select coalesce(max(substring(asset_tag from '^WDI-' || p || '-(\d+)$')::int), 0) + 1 into n
    from it.assets where asset_tag ~ ('^WDI-' || p || '-\d+$');
  return format('WDI-%s-%s', p, lpad(n::text, 4, '0'));
end $$;

-- issue a tag when a real (non-Planned) asset has none; tags are never changed once issued
create or replace function it.assign_asset_tag() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.asset_tag := nullif(trim(new.asset_tag), '');
  if tg_op = 'UPDATE' and old.asset_tag is not null and new.asset_tag is distinct from old.asset_tag then
    raise exception 'Asset tag % cannot be changed', old.asset_tag;
  end if;
  if new.asset_tag is null and new.status <> 'Planned' then
    new.asset_tag := it.next_asset_tag(new.category);
  end if;
  return new;
end $$;

create trigger touch before insert or update on it.assets for each row execute function it.touch();
create trigger tag   before insert or update on it.assets for each row execute function it.assign_asset_tag();
create trigger audit after insert or update on it.assets for each row execute function it.write_audit();

-- tag every existing real asset in sheet order, one statement per row so each sees the previous tag
do $$
declare r record;
begin
  for r in select id from it.assets where asset_tag is null and status <> 'Planned' order by source_sheet, source_row loop
    update it.assets set status = status where id = r.id;
  end loop;
end $$;

grant insert, update on it.assets to authenticated;
create policy editor_insert on it.assets for insert to authenticated with check (it.is_editor());
create policy editor_update on it.assets for update to authenticated using (it.is_editor()) with check (it.is_editor());

-- handover lookup: match any registered asset (not only the old Desktop-Laptop/Monitor/Accessories sheets)
create or replace view it.handover_v with (security_invoker = true) as
  select h.*, a.id as asset_id, a.model, a.category,
         case when a.id is null then 'Not found' else coalesce(a.source_sheet, 'Register') end as found_in
  from it.handover h
  left join lateral (
    select * from it.assets a
    where lower(trim(a.asset_tag)) = lower(trim(h.asset_key)) or lower(trim(a.serial)) = lower(trim(h.asset_key))
    order by (lower(trim(a.asset_tag)) = lower(trim(h.asset_key))) desc, a.id
    limit 1
  ) a on true;

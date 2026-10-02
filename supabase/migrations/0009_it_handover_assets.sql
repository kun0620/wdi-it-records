-- Handover is now tied to a registered asset and drives the asset's holder/status.
--   Issue  : asset must be In Stock (or Repair); -> In Use, user/department set
--   Return : asset must be In Use;               -> In Stock (Repair if Damaged / Missing Parts), user cleared
-- Planned / Retired / Lost assets can't be handed over. asset_id and action are fixed once saved
-- (a mistake is corrected by a new opposite record, so the asset history stays truthful).

alter table it.handover add column asset_id bigint references it.assets (id);
alter table it.handover alter column asset_id set not null;   -- table is empty at this point
create index on it.handover (asset_id, h_date);

create or replace function it.handover_check() returns trigger
language plpgsql set search_path = '' as $$
declare a it.assets;
begin
  if tg_op = 'UPDATE' then
    if new.asset_id <> old.asset_id or new.action <> old.action then
      raise exception 'Asset and action of a handover record cannot be changed — record a new Issue/Return instead';
    end if;
    return new;
  end if;

  select * into a from it.assets where id = new.asset_id for update;
  if a.id is null then raise exception 'Asset % not found', new.asset_id; end if;
  if a.status in ('Planned', 'Retired', 'Lost') then
    raise exception '% has status % and cannot be handed over', coalesce(a.asset_tag, a.name), a.status;
  end if;
  if new.action = 'Issue' and a.status = 'In Use' then
    raise exception '% is still with % — record a Return first', a.asset_tag, coalesce(a.user_name, '(unknown)');
  end if;
  if new.action = 'Return' and a.status <> 'In Use' then
    raise exception '% is not issued to anyone (status %)', a.asset_tag, a.status;
  end if;
  new.asset_key := a.asset_tag;
  return new;
end $$;

create or replace function it.handover_apply() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.action = 'Issue' then
    update it.assets set status = 'In Use', user_name = new.user_name, department = coalesce(new.dept, department)
     where id = new.asset_id;
  else
    update it.assets
       set status = case when new.condition in ('Damaged', 'Missing Parts') then 'Repair' else 'In Stock' end,
           user_name = null
     where id = new.asset_id;
  end if;
  return new;
end $$;

create trigger check_asset before insert or update on it.handover for each row execute function it.handover_check();
create trigger apply_asset after insert on it.handover for each row execute function it.handover_apply();

-- lookup view now joins on the real link
create or replace view it.handover_v with (security_invoker = true) as
  select h.*, a.model, a.category, coalesce(a.source_sheet, 'Register') as found_in
  from it.handover h join it.assets a on a.id = h.asset_id;

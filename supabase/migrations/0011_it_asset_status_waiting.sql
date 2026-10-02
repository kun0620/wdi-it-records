-- New status "Waiting" (รอของ): a machine is assigned to a person/position but has not arrived yet.
-- It keeps its tag, but can't be handed over until it is actually here.

alter table it.assets drop constraint asset_status;
alter table it.assets add constraint asset_status
  check (status in ('In Use', 'In Stock', 'Repair', 'Waiting', 'Retired', 'Lost', 'Planned'));

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
  if a.status in ('Planned', 'Waiting', 'Retired', 'Lost') then
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

-- Job position of the person using a Desktop/Laptop (was the "Position" column of the Desktop-Laptop sheet).
-- Handover carries it too: Issue sets the asset's position, Return clears it with the user.

alter table it.assets add column position text;
update it.assets set position = nullif(trim(raw ->> 'Position'), '')
 where source_sheet = 'Desktop-Laptop' and user_name is not null;

alter table it.handover add column position text;

create or replace function it.handover_apply() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.action = 'Issue' then
    update it.assets set status = 'In Use', user_name = new.user_name, position = new.position,
                         department = coalesce(new.dept, department)
     where id = new.asset_id;
  else
    update it.assets
       set status = case when new.condition in ('Damaged', 'Missing Parts') then 'Repair' else 'In Stock' end,
           user_name = null, position = null
     where id = new.asset_id;
  end if;
  return new;
end $$;

-- h.* gained a column: recreate the view (column order changed)
drop view it.handover_v;
create view it.handover_v with (security_invoker = true) as
  select h.*, a.model, a.category, coalesce(a.source_sheet, 'Register') as found_in
  from it.handover h join it.assets a on a.id = h.asset_id;
grant select on it.handover_v to authenticated;

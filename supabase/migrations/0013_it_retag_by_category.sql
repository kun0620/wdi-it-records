-- Re-tag assets whose tag prefix no longer matches their category (PC-0002/0003/0007 became Laptops).
-- Tags stay immutable for normal edits; it.retag_asset() is the one deliberate escape hatch,
-- and the old tag remains in it.audit_log. Old numbers are not reused.

create or replace function it.assign_asset_tag() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.asset_tag := nullif(trim(new.asset_tag), '');
  if tg_op = 'UPDATE' and old.asset_tag is not null and new.asset_tag is distinct from old.asset_tag
     and coalesce(current_setting('it.retag', true), '') <> 'on' then
    raise exception 'Asset tag % cannot be changed', old.asset_tag;
  end if;
  if new.asset_tag is null and new.status <> 'Planned' then
    new.asset_tag := it.next_asset_tag(new.category);
  end if;
  return new;
end $$;

-- Give an asset a new tag from its current category's sequence (editors only).
create or replace function it.retag_asset(asset bigint) returns text
language plpgsql set search_path = '' as $$
declare cat text; t text;
begin
  if not it.is_editor() then raise exception 'editor only'; end if;
  select category into cat from it.assets where id = asset;
  t := it.next_asset_tag(cat);
  perform set_config('it.retag', 'on', true);
  update it.assets set asset_tag = t where id = asset;
  perform set_config('it.retag', '', true);
  return t;
end $$;
grant execute on function it.retag_asset(bigint) to authenticated;

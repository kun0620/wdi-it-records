-- Accounting asset codes (WDICN-L001, WDITH-D001, ...) become the asset tag.
-- The tag is now editable by the editor; every change is kept in it.audit_log.
-- An asset saved without a tag still gets an automatic WDI-<prefix>-#### tag.

create or replace function it.assign_asset_tag() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.asset_tag := nullif(upper(trim(new.asset_tag)), '');
  if new.asset_tag is null and new.status <> 'Planned' then
    new.asset_tag := it.next_asset_tag(new.category);
  end if;
  return new;
end $$;

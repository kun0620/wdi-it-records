-- Private bucket for the daily/monthly .xlsx exports.
--   it-exports/YYYY/MM/daily/IT-Records_YYYY-MM-DD.xlsx
--   it-exports/YYYY/monthly/IT-Records_YYYY-MM.xlsx   (overwritten daily -> month-end snapshot)
-- Members may download; editors may create/overwrite. No delete policy: exports are kept.
insert into storage.buckets (id, name, public)
values ('it-exports', 'it-exports', false)
on conflict (id) do nothing;

create policy "it members read exports" on storage.objects
  for select to authenticated using (bucket_id = 'it-exports' and it.is_member());

create policy "it editors write exports" on storage.objects
  for insert to authenticated with check (bucket_id = 'it-exports' and it.is_editor());

create policy "it editors overwrite exports" on storage.objects
  for update to authenticated using (bucket_id = 'it-exports' and it.is_editor())
  with check (bucket_id = 'it-exports' and it.is_editor());

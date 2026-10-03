-- A service request / incident may be about one registered asset (optional).
-- The asset page lists its repair history; exports show the tag.

alter table it.service_log add column asset_id bigint references it.assets (id);
create index on it.service_log (asset_id);

create view it.service_log_v with (security_invoker = true) as
  select s.*, a.asset_tag, a.model as asset_model, a.category as asset_category
  from it.service_log s left join it.assets a on a.id = s.asset_id;
grant select on it.service_log_v to authenticated;

-- ng_count was NULL whenever any check was still unanswered (NULL = 'NG' is NULL).
-- Count only explicit NG answers so a partly-filled day reports 0..7, never NULL.
alter table it.daily_check alter column ng_count set expression as (
  (coalesce(firewall, '') = 'NG')::int + (coalesce(wan, '') = 'NG')::int + (coalesce(vpn, '') = 'NG')::int
  + (coalesce(core_switch, '') = 'NG')::int + (coalesce(wifi, '') = 'NG')::int
  + (coalesce(cctv, '') = 'NG')::int + (coalesce(ups, '') = 'NG')::int
);

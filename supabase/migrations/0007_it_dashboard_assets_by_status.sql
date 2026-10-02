-- Dashboard: count assets by status (source_sheet is NULL for assets added in the app,
-- and a NULL key would make jsonb_object_agg fail). Rest unchanged from 0004.
create or replace function it.dashboard(report_date date default (now() at time zone 'Asia/Bangkok')::date)
returns jsonb
language sql stable security invoker set search_path = '' as $$
with p as (
  select report_date as d,
         (report_date - (extract(isodow from report_date)::int - 1)) as wk_start,
         (report_date - (extract(isodow from report_date)::int - 1) + 6) as wk_end,
         date_trunc('month', report_date)::date as mo_start,
         (date_trunc('month', report_date) + interval '1 month - 1 day')::date as mo_end
),
sl as (select * from it.service_log),
open_sl as (select * from sl where status not in ('Closed', 'Cancelled')),
-- Working days so far this month: Mon–Fri (+ Sat when work_saturday = Y), minus holidays.
workdays as (
  select count(*) as n
  from p, generate_series(p.mo_start, least(p.d, p.mo_end), interval '1 day') g(day)
  where (extract(isodow from g.day) < 6
         or (extract(isodow from g.day) = 6 and coalesce((select value from it.settings where key = 'work_saturday'), 'Y') = 'Y'))
    and not exists (select 1 from it.holidays h where h.day = g.day::date)
),
latest_week as (select * from it.weekly_check order by week_start desc limit 1),
maint as (
  select t.name, t.every_months, t.sort,
         (select max(m.done_date) from it.maintenance m where m.type = t.name and m.result = 'Pass') as last_pass
  from it.maint_types t
)
select jsonb_build_object(
  'period', (select jsonb_build_object('date', d, 'week_start', wk_start, 'week_end', wk_end, 'month_start', mo_start, 'month_end', mo_end) from p),

  'service', (select jsonb_build_object(
      'week',  jsonb_build_object(
        'received',  count(*) filter (where sl.req_date between p.wk_start and p.wk_end),
        'incidents', count(*) filter (where sl.req_date between p.wk_start and p.wk_end and sl.type = 'Incident'),
        'p1',        count(*) filter (where sl.req_date between p.wk_start and p.wk_end and sl.priority = 'P1'),
        'closed',    count(*) filter (where sl.close_date between p.wk_start and p.wk_end and sl.status = 'Closed'),
        'escalated', count(*) filter (where sl.req_date between p.wk_start and p.wk_end and coalesce(sl.escalation, 'None') <> 'None'),
        'avg_hours', round(avg(sl.hours) filter (where sl.close_date between p.wk_start and p.wk_end and sl.status = 'Closed'), 1)),
      'month', jsonb_build_object(
        'received',  count(*) filter (where sl.req_date between p.mo_start and p.mo_end),
        'incidents', count(*) filter (where sl.req_date between p.mo_start and p.mo_end and sl.type = 'Incident'),
        'p1',        count(*) filter (where sl.req_date between p.mo_start and p.mo_end and sl.priority = 'P1'),
        'closed',    count(*) filter (where sl.close_date between p.mo_start and p.mo_end and sl.status = 'Closed'),
        'escalated', count(*) filter (where sl.req_date between p.mo_start and p.mo_end and coalesce(sl.escalation, 'None') <> 'None'),
        'avg_hours', round(avg(sl.hours) filter (where sl.close_date between p.mo_start and p.mo_end and sl.status = 'Closed'), 1)))
    from p left join sl on true),

  'backlog', (select jsonb_build_object(
      'by_priority', coalesce(jsonb_agg(jsonb_build_object('priority', pr, 'open', n, 'oldest_days', oldest) order by pr), '[]'),
      'total', coalesce(sum(n), 0),
      'oldest_days', max(oldest),
      'waiting', (select count(*) from sl where status = 'Waiting HQ/Vendor'))
    from (select pr, count(o.id) as n, (select d from p) - min(o.req_date) as oldest
          from unnest(array['P1', 'P2', 'P3', 'P4']) pr left join open_sl o on o.priority = pr group by pr) x),

  'open', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'req_no', req_no, 'req_date', req_date, 'requester', requester,
                                                       'priority', priority, 'status', status, 'detail', detail, 'system', system)
                                     order by req_date, id), '[]')
           from (select * from open_sl order by req_date, id limit 12) o),

  'by_type', (select coalesce(jsonb_agg(jsonb_build_object('type', li.value,
        'week',  (select count(*) from sl, p where sl.type = li.value and sl.req_date between p.wk_start and p.wk_end),
        'month', (select count(*) from sl, p where sl.type = li.value and sl.req_date between p.mo_start and p.mo_end)) order by li.sort), '[]')
      from it.list_items li where li.list_key = 'type' and li.active),

  'checks', (select jsonb_build_object(
      'working_days', (select n from workdays),
      'days_complete', (select count(*) from it.daily_check dc, p where dc.check_date between p.mo_start and least(p.d, p.mo_end) and dc.complete = 1),
      'ng_week',  (select coalesce(sum(ng_count), 0) from it.daily_check dc, p where dc.check_date between p.wk_start and p.wk_end),
      'ng_month', (select coalesce(sum(ng_count), 0) from it.daily_check dc, p where dc.check_date between p.mo_start and p.mo_end),
      'weekly_done', exists (select 1 from it.weekly_check wc, p where wc.week_start between p.wk_start and p.wk_end),
      'latest_backup', (select backup from latest_week),
      'latest_week', (select week_start from latest_week),
      'lowest_disk', (select least(disk_srv, disk_nvr) from latest_week))),

  'maintenance', (select jsonb_build_object(
      'types', coalesce(jsonb_agg(jsonb_build_object(
          'type', name, 'every_months', every_months, 'last_pass', last_pass, 'next_due', next_due,
          'status', case when last_pass is null then 'NOT DONE'
                         when next_due < (select d from p) then 'OVERDUE'
                         when next_due - (select d from p) <= 14 then 'DUE SOON'
                         else 'OK' end) order by sort), '[]'),
      'pending_signoff', (select count(*) from it.maintenance where type like 'Quarterly%' and coalesce(approved_by, '') = ''),
      'failed_month', (select count(*) from it.maintenance m, p where m.result = 'Fail' and m.done_date between p.mo_start and p.mo_end))
    from (select *, (last_pass + make_interval(months => every_months))::date as next_due from maint) mt),

  'assets', (select coalesce(jsonb_object_agg(status, n), '{}') from (select status, count(*) n from it.assets group by 1) a),

  'trend', (select jsonb_agg(jsonb_build_object('week_start', ws,
        'total', (select count(*) from sl where sl.req_date between ws and ws + 6),
        'incidents', (select count(*) from sl where sl.req_date between ws and ws + 6 and sl.type = 'Incident')) order by ws)
      from p, generate_series(p.wk_start - 49, p.wk_start, interval '7 days') g(t), lateral (select g.t::date as ws) w),

  'heat', (select coalesce(jsonb_object_agg(check_date, jsonb_build_object('c', complete, 'ng', ng_count)), '{}')
           from it.daily_check dc, p where dc.check_date >= p.wk_start - 105)
)
$$;

grant execute on function it.dashboard(date) to authenticated;

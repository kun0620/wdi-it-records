-- Pin search_path on every it.* function (Supabase advisor lint 0011).
-- All bodies already use schema-qualified names, so '' is safe.
alter function it.current_email() set search_path = '';
alter function it.is_member() set search_path = '';
alter function it.is_editor() set search_path = '';
alter function it.touch() set search_path = '';
alter function it.assign_req_no() set search_path = '';
alter function it.block_delete() set search_path = '';
alter function it.block_change() set search_path = '';

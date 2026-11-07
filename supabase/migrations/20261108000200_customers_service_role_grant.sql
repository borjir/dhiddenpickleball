-- The guest migration revokes customers from anon/authenticated and grants
-- select to authenticated staff. The server-only service role also reads this
-- table for email outbox joins and admin tooling; RLS bypass does not grant
-- table privileges, so grant it explicitly.
grant select on public.customers to service_role;

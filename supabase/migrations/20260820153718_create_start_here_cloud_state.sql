create table if not exists public.start_here_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  state_version integer not null check (state_version > 0),
  revision bigint not null default 1 check (revision > 0),
  device_id uuid not null,
  client_updated_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.start_here_state enable row level security;

revoke all on table public.start_here_state from anon;
grant select, insert, update, delete on table public.start_here_state to authenticated;

create policy "Users can read their own Start Here state"
on public.start_here_state for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own Start Here state"
on public.start_here_state for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own Start Here state"
on public.start_here_state for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own Start Here state"
on public.start_here_state for delete
to authenticated
using ((select auth.uid()) = user_id);

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.prepare_start_here_state_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.user_id := old.user_id;
  new.revision := old.revision + 1;
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.prepare_start_here_state_update() from public, anon, authenticated;

create trigger prepare_start_here_state_update
before update on public.start_here_state
for each row execute function private.prepare_start_here_state_update();

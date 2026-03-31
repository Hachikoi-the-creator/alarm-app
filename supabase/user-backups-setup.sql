-- Run in Supabase SQL Editor (Dashboard → SQL).
-- Optional cloud backup: one row per user, JSON payload, 30-day retention from last write.

create table if not exists public.user_backups (
  user_id uuid primary key references auth.users (id) on delete cascade,
  backup_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);

create index if not exists user_backups_expires_at_idx on public.user_backups (expires_at);

alter table public.user_backups enable row level security;

create policy "Users can manage their own backups"
on public.user_backups for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Scheduled cleanup (e.g. pg_cron daily): select public.cleanup_expired_user_backups();
create or replace function public.cleanup_expired_user_backups()
returns integer
language sql
security definer
set search_path = public
as $$
  with d as (
    delete from public.user_backups
    where expires_at < now()
    returning 1
  )
  select coalesce(count(*)::integer, 0) from d;
$$;

revoke all on function public.cleanup_expired_user_backups() from public;
grant execute on function public.cleanup_expired_user_backups() to service_role;

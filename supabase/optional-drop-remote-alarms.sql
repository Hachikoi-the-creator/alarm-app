-- Run only if you previously created a remote `alarms` table in Supabase.
-- Alarms live on-device (expo-sqlite); cloud is backup-only via user_backups.

drop policy if exists "Users can manage their own alarms" on public.alarms;

drop table if exists public.alarms;

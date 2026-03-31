alter table public.alarms 
add column user_id uuid not null 
references auth.users(id) on delete cascade;
create policy "Users can manage their own alarms"
on public.alarms
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

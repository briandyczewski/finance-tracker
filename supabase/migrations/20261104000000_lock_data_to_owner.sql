-- Make every row belong to a signed-in user, and only let that user see or change it.
-- Before this, the public (anon) key could read, add and delete everything.

-- 1. Owner column. Existing rows start with no owner (hidden from everyone)
--    until they are assigned. New rows get the signed-in user's id automatically.
alter table public.transactions    add column user_id uuid references auth.users (id) on delete cascade;
alter table public.subscriptions   add column user_id uuid references auth.users (id) on delete cascade;
alter table public.savings_entries add column user_id uuid references auth.users (id) on delete cascade;
alter table public.budgets         add column user_id uuid references auth.users (id) on delete cascade;
alter table public.app_settings    add column user_id uuid references auth.users (id) on delete cascade;

alter table public.transactions    alter column user_id set default auth.uid();
alter table public.subscriptions   alter column user_id set default auth.uid();
alter table public.savings_entries alter column user_id set default auth.uid();
alter table public.budgets         alter column user_id set default auth.uid();
alter table public.app_settings    alter column user_id set default auth.uid();

create index transactions_user_id_idx    on public.transactions (user_id);
create index subscriptions_user_id_idx   on public.subscriptions (user_id);
create index savings_entries_user_id_idx on public.savings_entries (user_id);

-- 2. Remove the "anyone with the public key" rules.
drop policy "anon can read transactions"    on public.transactions;
drop policy "anon can add transactions"     on public.transactions;
drop policy "anon can delete transactions"  on public.transactions;
drop policy "anon can read subscriptions"   on public.subscriptions;
drop policy "anon can add subscriptions"    on public.subscriptions;
drop policy "anon can delete subscriptions" on public.subscriptions;
drop policy "anon can read savings"         on public.savings_entries;
drop policy "anon can add savings"          on public.savings_entries;
drop policy "anon can delete savings"       on public.savings_entries;
drop policy "anon can read budgets"         on public.budgets;
drop policy "anon can add budgets"          on public.budgets;
drop policy "anon can update budgets"       on public.budgets;
drop policy "anon can delete budgets"       on public.budgets;
drop policy "anon can read settings"        on public.app_settings;
drop policy "anon can add settings"         on public.app_settings;
drop policy "anon can update settings"      on public.app_settings;

-- 3. Signed-in users can only touch their own rows.
do $$
declare
  t text;
begin
  foreach t in array array['transactions', 'subscriptions', 'savings_entries', 'budgets', 'app_settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "owner can read" on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('create policy "owner can add" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "owner can update" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "owner can delete" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t);
  end loop;
end
$$;

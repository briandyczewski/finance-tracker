-- Run after every existing row has been given an owner (user_id).
-- Makes the owner required, and lets each user keep their own budgets and settings
-- (they used to be shared by category / key across the whole app).

alter table public.transactions    alter column user_id set not null;
alter table public.subscriptions   alter column user_id set not null;
alter table public.savings_entries alter column user_id set not null;
alter table public.budgets         alter column user_id set not null;
alter table public.app_settings    alter column user_id set not null;

alter table public.budgets drop constraint budgets_pkey;
alter table public.budgets add primary key (user_id, category);

alter table public.app_settings drop constraint app_settings_pkey;
alter table public.app_settings add primary key (user_id, key);

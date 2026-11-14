-- Optional bank / card linking through Plaid.
-- Manual transactions keep working exactly as before; imported ones are marked
-- with plaid_transaction_id so the app can show where they came from.

-- One row per linked bank login. Owners can see their own; only the server
-- (the "plaid" Edge Function) adds, changes or removes them.
create table public.plaid_items (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null unique,
  institution_name text,
  accounts jsonb not null default '[]'::jsonb,
  import_from date not null default current_date,
  last_synced_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.plaid_items enable row level security;

create policy "owner can read" on public.plaid_items
  for select to authenticated
  using ((select auth.uid()) = user_id);

create index plaid_items_user_id_idx on public.plaid_items (user_id);

-- Plaid access tokens and sync cursors. RLS on with no policies, and no grants:
-- nobody using the app can read this table, only the server.
create table public.plaid_item_secrets (
  item_id text primary key references public.plaid_items(item_id) on delete cascade,
  access_token text not null,
  cursor text
);

alter table public.plaid_item_secrets enable row level security;
revoke all on public.plaid_item_secrets from anon, authenticated;

-- Imported transactions.
alter table public.transactions
  add column plaid_transaction_id text unique,
  add column plaid_item_id text references public.plaid_items(item_id) on delete set null,
  add column account_name text;

create index transactions_plaid_item_id_idx on public.transactions (plaid_item_id);

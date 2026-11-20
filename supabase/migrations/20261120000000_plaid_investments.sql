-- Optional brokerage linking (Robinhood etc.) through Plaid Investments.
-- Brokerages only show holdings and value on the Savings tab; they never
-- add transactions, so spending, budgets and Safe Spending are unaffected.

alter table public.plaid_items
  add column kind text not null default 'bank'
  check (kind in ('bank', 'brokerage'));

-- Latest snapshot of each linked brokerage's holdings. Replaced on every refresh.
-- Owners can read their own; only the server writes.
create table public.investment_holdings (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null references public.plaid_items(item_id) on delete cascade,
  account_id text not null,
  account_name text,
  name text not null,
  ticker text,
  type text,
  quantity numeric not null default 0,
  price numeric,
  value numeric not null default 0,
  cost_basis numeric,
  updated_at timestamptz not null default now()
);

alter table public.investment_holdings enable row level security;

create policy "owner can read" on public.investment_holdings
  for select to authenticated
  using ((select auth.uid()) = user_id);

create index investment_holdings_user_id_idx on public.investment_holdings (user_id);
create index investment_holdings_item_id_idx on public.investment_holdings (item_id);

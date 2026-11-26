-- Split the old "Food" category into "Groceries" and "Takeout".
-- Existing Food transactions named like a grocery run become Groceries;
-- everything else (restaurants, fast food, coffee, snacks) becomes Takeout.

update public.transactions
set category = 'Groceries'
where category = 'Food'
  and (name ilike '%grocer%' or name ilike '%supermarket%' or name ilike '%aldi%'
       or name ilike '%giant eagle%' or name ilike '%walmart%' or name ilike '%costco%'
       or name ilike '%trader joe%' or name ilike '%whole foods%' or name ilike '%kroger%');

update public.transactions
set category = 'Takeout'
where category = 'Food';

-- Carry the old Food budget over to Groceries (Takeout starts with no limit).
insert into public.budgets (user_id, category, amount)
select user_id, 'Groceries', amount from public.budgets where category = 'Food'
on conflict (user_id, category) do nothing;

delete from public.budgets where category = 'Food';

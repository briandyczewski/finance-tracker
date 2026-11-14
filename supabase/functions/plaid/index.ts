// Optional bank / card linking through Plaid.
//
// Actions (POST JSON { action, ... }), all for the signed-in user only:
//   link_token  -> starts Plaid Link
//   exchange    -> saves a newly linked bank and imports its transactions
//   sync        -> pulls new / changed / removed transactions for every linked bank
//   unlink      -> disconnects a bank (already imported transactions are kept)
//
// Secrets (set in Supabase > Edge Functions > Secrets):
//   PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV ("sandbox" or "production")
//
// Plaid access tokens never leave the server: they live in plaid_item_secrets,
// which the app itself has no permission to read.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function reply(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function adminKey() {
  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (secretKeys) {
    try {
      const parsed = JSON.parse(secretKeys);
      if (parsed?.default) return parsed.default as string;
    } catch {
      // fall through
    }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
}

class PlaidError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function plaidBaseUrl() {
  return Deno.env.get("PLAID_ENV") === "production"
    ? "https://production.plaid.com"
    : "https://sandbox.plaid.com";
}

// deno-lint-ignore no-explicit-any
async function plaid(path: string, body: Record<string, unknown>): Promise<any> {
  const response = await fetch(`${plaidBaseUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: Deno.env.get("PLAID_CLIENT_ID"),
      secret: Deno.env.get("PLAID_SECRET"),
      ...body,
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new PlaidError(
      data.error_code ?? "PLAID_ERROR",
      data.display_message ?? data.error_message ?? "Plaid request failed."
    );
  }
  return data;
}

// ---------- Category mapping ----------

type Mapped = { type: "income" | "expense"; category: string; name?: string } | null;

// deno-lint-ignore no-explicit-any
function mapTransaction(tx: any): Mapped {
  const primary: string = tx.personal_finance_category?.primary ?? "";
  const detailed: string = tx.personal_finance_category?.detailed ?? "";
  const amount = Number(tx.amount); // Plaid: positive = money out, negative = money in

  // Paying off a credit card or moving money between your own accounts isn't
  // new spending, and would double count if both accounts are linked.
  if (detailed === "LOAN_PAYMENTS_CREDIT_CARD_PAYMENT") return null;
  if (primary === "TRANSFER_IN") return null;
  if (detailed === "TRANSFER_OUT_ACCOUNT_TRANSFER") return null;

  if (amount < 0) {
    const label = tx.merchant_name ?? tx.name;
    return primary === "INCOME"
      ? { type: "income", category: "Income" }
      : { type: "income", category: "Income", name: `Refund: ${label}` };
  }

  if (detailed === "TRANSFER_OUT_SAVINGS") return { type: "expense", category: "Savings" };
  if (detailed === "TRANSFER_OUT_INVESTMENT_AND_RETIREMENT_FUNDS")
    return { type: "expense", category: "Investing" };

  switch (primary) {
    case "FOOD_AND_DRINK":
      return { type: "expense", category: "Food" };
    case "TRANSPORTATION":
      return { type: "expense", category: detailed === "TRANSPORTATION_GAS" ? "Gas" : "Other" };
    case "RENT_AND_UTILITIES":
      return {
        type: "expense",
        category: detailed === "RENT_AND_UTILITIES_RENT" ? "Rent" : "Bills",
      };
    case "LOAN_PAYMENTS":
      return { type: "expense", category: "Bills" };
    case "ENTERTAINMENT":
      return { type: "expense", category: "Fun" };
    case "INCOME":
      return { type: "income", category: "Income" };
    default:
      return { type: "expense", category: "Other" };
  }
}

// ---------- Actions ----------

type Item = {
  item_id: string;
  user_id: string;
  import_from: string;
  accounts: { id: string; name: string; mask?: string | null }[];
};

async function syncItem(admin: SupabaseClient, item: Item) {
  const { data: secret, error: secretError } = await admin
    .from("plaid_item_secrets")
    .select("access_token, cursor")
    .eq("item_id", item.item_id)
    .single();
  if (secretError || !secret) throw new Error("Missing access token");

  const startCursor: string | null = secret.cursor;

  // deno-lint-ignore no-explicit-any
  let added: any[] = [], modified: any[] = [], removed: any[] = [];
  let cursor = startCursor;

  for (let page = 0; page < 50; page++) {
    try {
      const data = await plaid("/transactions/sync", {
        access_token: secret.access_token,
        ...(cursor ? { cursor } : {}),
        count: 500,
      });
      added = added.concat(data.added);
      modified = modified.concat(data.modified);
      removed = removed.concat(data.removed);
      cursor = data.next_cursor;
      if (!data.has_more) break;
    } catch (error) {
      if (error instanceof PlaidError && error.code === "TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION") {
        added = [];
        modified = [];
        removed = [];
        cursor = startCursor;
        continue;
      }
      throw error;
    }
  }

  const accountNames = new Map(
    item.accounts.map((account) => [
      account.id,
      account.mask ? `${account.name} ••${account.mask}` : account.name,
    ])
  );

  const rows = added
    .filter((tx) => !tx.pending && tx.date >= item.import_from)
    .map((tx) => {
      const mapped = mapTransaction(tx);
      if (!mapped) return null;
      return {
        user_id: item.user_id,
        name: mapped.name ?? tx.merchant_name ?? tx.name,
        amount: Math.abs(Number(tx.amount)),
        type: mapped.type,
        category: mapped.category,
        date: tx.date,
        plaid_transaction_id: tx.transaction_id,
        plaid_item_id: item.item_id,
        account_name: accountNames.get(tx.account_id) ?? null,
      };
    })
    .filter((row) => row !== null);

  if (rows.length) {
    const { error } = await admin
      .from("transactions")
      .upsert(rows, { onConflict: "plaid_transaction_id", ignoreDuplicates: true });
    if (error) throw error;
  }

  // Corrections from the bank: update the amount, date and name, keep the category.
  for (const tx of modified) {
    if (tx.pending) continue;
    await admin
      .from("transactions")
      .update({
        amount: Math.abs(Number(tx.amount)),
        date: tx.date,
        name: tx.merchant_name ?? tx.name,
      })
      .eq("plaid_transaction_id", tx.transaction_id)
      .eq("user_id", item.user_id);
  }

  const removedIds = removed.map((tx) => tx.transaction_id).filter(Boolean);
  if (removedIds.length) {
    await admin
      .from("transactions")
      .delete()
      .in("plaid_transaction_id", removedIds)
      .eq("user_id", item.user_id);
  }

  await admin.from("plaid_item_secrets").update({ cursor }).eq("item_id", item.item_id);
  await admin
    .from("plaid_items")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("item_id", item.item_id);

  return rows.length;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Use POST." }, 405);

  if (!Deno.env.get("PLAID_CLIENT_ID") || !Deno.env.get("PLAID_SECRET")) {
    return reply({ error: "Card linking isn't set up yet (Plaid keys missing)." }, 503);
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, adminKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Who is asking? Every action is limited to this user's own data.
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData?.user) return reply({ error: "Please sign in again." }, 401);
  const userId = userData.user.id;

  // deno-lint-ignore no-explicit-any
  let body: any;
  try {
    body = await req.json();
  } catch {
    return reply({ error: "Bad request." }, 400);
  }

  try {
    switch (body.action) {
      case "link_token": {
        const data = await plaid("/link/token/create", {
          client_name: "Finance Tracker",
          user: { client_user_id: userId },
          products: ["transactions"],
          transactions: { days_requested: 90 },
          country_codes: ["US"],
          language: "en",
        });
        return reply({ link_token: data.link_token });
      }

      case "exchange": {
        const publicToken = String(body.public_token ?? "");
        if (!publicToken) return reply({ error: "Missing public token." }, 400);

        const allowedStarts = [0, 30, 90];
        const daysBack = allowedStarts.includes(Number(body.days_back)) ? Number(body.days_back) : 0;
        const importFrom = new Date(Date.now() - daysBack * 86400000).toISOString().slice(0, 10);

        const exchanged = await plaid("/item/public_token/exchange", { public_token: publicToken });

        // deno-lint-ignore no-explicit-any
        const accounts = (Array.isArray(body.accounts) ? body.accounts : []).map((account: any) => ({
          id: String(account.id ?? ""),
          name: String(account.name ?? "Account").slice(0, 80),
          mask: account.mask ? String(account.mask).slice(0, 8) : null,
        }));

        const item: Item = {
          item_id: exchanged.item_id,
          user_id: userId,
          import_from: importFrom,
          accounts,
        };

        const { error: itemError } = await admin.from("plaid_items").insert({
          ...item,
          institution_name: body.institution_name ? String(body.institution_name).slice(0, 80) : null,
        });
        if (itemError) throw itemError;

        const { error: secretError } = await admin
          .from("plaid_item_secrets")
          .insert({ item_id: exchanged.item_id, access_token: exchanged.access_token });
        if (secretError) throw secretError;

        // Transactions are often still loading right after linking; that's fine,
        // the next sync picks them up.
        let imported = 0;
        try {
          imported = await syncItem(admin, item);
        } catch (error) {
          console.error("Initial sync failed:", error);
        }
        return reply({ ok: true, imported });
      }

      case "sync": {
        const { data: items, error } = await admin
          .from("plaid_items")
          .select("item_id, user_id, import_from, accounts")
          .eq("user_id", userId);
        if (error) throw error;

        let imported = 0;
        const problems: string[] = [];
        for (const item of items ?? []) {
          try {
            imported += await syncItem(admin, item as Item);
          } catch (error) {
            console.error("Sync failed for item", item.item_id, error);
            if (error instanceof PlaidError && error.code === "ITEM_LOGIN_REQUIRED") {
              problems.push("A linked bank needs you to sign in again. Unlink it and connect it again.");
            } else {
              problems.push("One linked bank couldn't be synced right now.");
            }
          }
        }
        return reply({ ok: true, imported, problems });
      }

      case "unlink": {
        const itemId = String(body.item_id ?? "");
        const { data: item } = await admin
          .from("plaid_items")
          .select("item_id")
          .eq("item_id", itemId)
          .eq("user_id", userId)
          .maybeSingle();
        if (!item) return reply({ error: "That bank isn't linked." }, 404);

        const { data: secret } = await admin
          .from("plaid_item_secrets")
          .select("access_token")
          .eq("item_id", itemId)
          .maybeSingle();

        if (secret?.access_token) {
          try {
            await plaid("/item/remove", { access_token: secret.access_token });
          } catch (error) {
            console.error("Plaid item/remove failed:", error);
          }
        }

        await admin.from("plaid_items").delete().eq("item_id", itemId).eq("user_id", userId);
        return reply({ ok: true });
      }

      default:
        return reply({ error: "Unknown action." }, 400);
    }
  } catch (error) {
    console.error("plaid function error:", error);
    const message =
      error instanceof PlaidError ? error.message : "Something went wrong talking to your bank.";
    return reply({ error: message }, 502);
  }
});

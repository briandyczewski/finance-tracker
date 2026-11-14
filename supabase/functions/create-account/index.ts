// Creates a new Finance Tracker account from a username and password.
//
// Supabase logins are email-based, so each username is stored as a private
// placeholder address (username@users.finance-tracker.invalid). ".invalid" is a
// reserved domain that can never receive mail, and no email is ever sent.
// The account is created already confirmed, so the new user can sign in right away.
//
// Deployed with verify_jwt off because people creating an account aren't signed in yet.
// It only ever creates a brand-new, empty account; row level security keeps every
// account's data private to its owner.
import { createClient } from "npm:@supabase/supabase-js@2";

const USERNAME_DOMAIN = "users.finance-tracker.invalid";
const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

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
  // Newer projects expose secret keys as JSON; older ones as the service role key.
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Use POST." }, 405);

  let body: { username?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return reply({ error: "Something went wrong. Try again." }, 400);
  }

  const username = String(body.username ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!USERNAME_PATTERN.test(username)) {
    return reply(
      { error: "Usernames are 3–20 characters: letters, numbers and underscores only." },
      400
    );
  }

  if (password.length < 8) {
    return reply({ error: "Password needs to be at least 8 characters." }, 400);
  }

  if (password.length > 72) {
    return reply({ error: "Password can be at most 72 characters." }, 400);
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, adminKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await admin.auth.admin.createUser({
    email: `${username}@${USERNAME_DOMAIN}`,
    password,
    email_confirm: true,
    user_metadata: { username },
  });

  if (error) {
    if (error.code === "email_exists" || /already/i.test(error.message)) {
      return reply({ error: "That username is taken. Try another one." }, 409);
    }
    if (error.code === "weak_password") {
      return reply({ error: "That password is too weak. Try a longer one." }, 400);
    }
    console.error("create-account failed:", error);
    return reply({ error: "Couldn't create the account. Try again." }, 500);
  }

  return reply({ ok: true });
});

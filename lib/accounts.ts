// Username accounts are stored in Supabase Auth under a private placeholder
// email (see supabase/functions/create-account). This keeps that detail in one place.
export const USERNAME_DOMAIN = "users.finance-tracker.invalid";

export const USERNAME_RULES =
  "3–20 characters: letters, numbers and underscores only.";

// Turns what someone typed in the sign-in box into the address Supabase expects.
// Anything with an @ is treated as a normal email (older accounts sign in that way).
export function loginEmail(usernameOrEmail: string) {
  const value = usernameOrEmail.trim().toLowerCase();
  return value.includes("@") ? value : `${value}@${USERNAME_DOMAIN}`;
}

export async function createAccount(username: string, password: string) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-account`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      },
      body: JSON.stringify({ username, password }),
    }
  ).catch(() => null);

  if (!response) {
    return { error: "Couldn't reach the server. Check your connection and try again." };
  }

  const result = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    return { error: result.error ?? "Couldn't create the account. Try again." };
  }

  return { error: null };
}

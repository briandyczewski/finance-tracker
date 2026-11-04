import { createBrowserClient } from "@supabase/ssr";

// Keeps the login session in cookies so proxy.ts can check it on every request.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

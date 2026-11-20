import { supabase } from "@/lib/supabase";

// Talks to the "plaid" Supabase Edge Function. Plaid keys and bank access
// tokens stay on the server; the app only ever sees the short-lived link token.

type PlaidAccount = { id: string; name: string; mask?: string | null };

type PlaidLinkMetadata = {
  institution?: { name?: string } | null;
  accounts?: PlaidAccount[];
};

type PlaidLinkError = { display_message?: string | null; error_message?: string } | null;

type PlaidHandler = { open: () => void; destroy: () => void };

declare global {
  interface Window {
    Plaid?: {
      create: (config: {
        token: string;
        onSuccess: (publicToken: string, metadata: PlaidLinkMetadata) => void;
        onExit?: (error: PlaidLinkError) => void;
      }) => PlaidHandler;
    };
  }
}

export type PlaidResult = {
  error?: string;
  link_token?: string;
  imported?: number;
  holdings?: number;
  problems?: string[];
  cancelled?: boolean;
};

export type LinkKind = "bank" | "brokerage";

export async function callPlaid(
  action: "link_token" | "exchange" | "sync" | "unlink",
  body: Record<string, unknown> = {}
): Promise<PlaidResult> {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) return { error: "Please sign in again." };

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/plaid`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ action, ...body }),
    }
  ).catch(() => null);

  if (!response) return { error: "Couldn't reach the server. Check your connection." };

  const result = (await response.json().catch(() => ({}))) as PlaidResult;
  if (!response.ok) return { error: result.error ?? "Something went wrong." };
  return result;
}

let scriptPromise: Promise<void> | null = null;

// Loads Plaid's official Link script once, only when someone chooses to link.
export function loadPlaidLink() {
  if (window.Plaid) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.plaid.com/link/v2/stable/link-initialize.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error("Couldn't load Plaid."));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

// Opens Plaid Link and saves the new connection. Resolves once it's done,
// cancelled, or failed. onSaving fires when the person finished in Plaid
// and the app is saving the connection.
export async function linkWithPlaid(
  kind: LinkKind,
  extra: Record<string, unknown> = {},
  onSaving?: () => void
): Promise<PlaidResult> {
  const tokenResult = await callPlaid("link_token", { kind });
  if (tokenResult.error || !tokenResult.link_token) {
    return { error: tokenResult.error ?? "Couldn't start linking." };
  }

  try {
    await loadPlaidLink();
  } catch {
    return { error: "Couldn't load Plaid. Check your connection and try again." };
  }

  return new Promise((resolve) => {
    const handler = window.Plaid!.create({
      token: tokenResult.link_token!,
      onSuccess: async (publicToken, metadata) => {
        onSaving?.();
        const result = await callPlaid("exchange", {
          public_token: publicToken,
          institution_name: metadata.institution?.name ?? null,
          accounts: metadata.accounts ?? [],
          kind,
          ...extra,
        });
        handler.destroy();
        resolve(result);
      },
      onExit: (error) => {
        handler.destroy();
        resolve(
          error
            ? { error: error.display_message ?? "Linking didn't finish. Try again." }
            : { cancelled: true }
        );
      },
    });
    handler.open();
  });
}

export type { PlaidLinkMetadata };

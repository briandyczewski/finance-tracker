"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CreditCard, Link2, RefreshCw, Unlink } from "lucide-react";
import CategoryIcon from "@/components/CategoryIcon";
import { supabase } from "@/lib/supabase";
import { callPlaid, loadPlaidLink } from "@/lib/plaid";

type LinkedBank = {
  item_id: string;
  institution_name: string | null;
  accounts: { name: string; mask?: string | null }[];
  last_synced_at: string | null;
};

type LinkedAccountsCardProps = {
  // Called after new transactions were imported so the page can reload them.
  onImported: () => void;
};

function syncedLabel(value: string | null) {
  if (!value) return "Not synced yet";
  const date = new Date(value);
  return `Synced ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

export default function LinkedAccountsCard({ onImported }: LinkedAccountsCardProps) {
  const [banks, setBanks] = useState<LinkedBank[]>([]);
  const [busy, setBusy] = useState<"" | "linking" | "syncing">("");
  const [message, setMessage] = useState("");
  const [daysBack, setDaysBack] = useState(0);
  const autoSynced = useRef(false);
  const onImportedRef = useRef(onImported);

  useEffect(() => {
    onImportedRef.current = onImported;
  }, [onImported]);

  const loadBanks = useCallback(async () => {
    const { data, error } = await supabase
      .from("plaid_items")
      .select("item_id, institution_name, accounts, last_synced_at")
      .order("created_at");
    if (error) {
      console.error("Error loading linked banks:", error);
      return [];
    }
    setBanks((data ?? []) as LinkedBank[]);
    return data ?? [];
  }, []);

  const sync = useCallback(
    async (quiet = false) => {
      setBusy("syncing");
      if (!quiet) setMessage("");
      const result = await callPlaid("sync");
      setBusy("");

      if (result.error) {
        if (!quiet) setMessage(result.error);
        return;
      }

      const imported = result.imported ?? 0;
      const notes = result.problems ?? [];
      if (imported > 0) onImportedRef.current();
      if (!quiet || imported > 0 || notes.length) {
        setMessage(
          [
            imported > 0
              ? `Imported ${imported} new transaction${imported === 1 ? "" : "s"}.`
              : quiet
                ? ""
                : "You're up to date.",
            ...notes,
          ]
            .filter(Boolean)
            .join(" ")
        );
      }
      await loadBanks();
    },
    [loadBanks]
  );

  // Load linked banks, then quietly check for new transactions once per visit.
  useEffect(() => {
    loadBanks().then((list) => {
      if (list.length && !autoSynced.current) {
        autoSynced.current = true;
        sync(true);
      }
    });
  }, [loadBanks, sync]);

  async function connect() {
    setBusy("linking");
    setMessage("");

    const tokenResult = await callPlaid("link_token");
    if (tokenResult.error || !tokenResult.link_token) {
      setBusy("");
      setMessage(tokenResult.error ?? "Couldn't start linking.");
      return;
    }

    try {
      await loadPlaidLink();
    } catch {
      setBusy("");
      setMessage("Couldn't load Plaid. Check your connection and try again.");
      return;
    }

    const handler = window.Plaid!.create({
      token: tokenResult.link_token,
      onSuccess: async (publicToken, metadata) => {
        setMessage("Linking… importing your transactions.");
        const result = await callPlaid("exchange", {
          public_token: publicToken,
          institution_name: metadata.institution?.name ?? null,
          accounts: metadata.accounts ?? [],
          days_back: daysBack,
        });
        setBusy("");

        if (result.error) {
          setMessage(result.error);
          return;
        }

        const imported = result.imported ?? 0;
        setMessage(
          imported > 0
            ? `Linked! Imported ${imported} transaction${imported === 1 ? "" : "s"}.`
            : "Linked! Your bank is still sending transactions. Tap Sync in a minute."
        );
        if (imported > 0) onImported();
        await loadBanks();
        handler.destroy();
      },
      onExit: (error) => {
        setBusy("");
        if (error) setMessage(error.display_message ?? "Linking didn't finish. Try again.");
        handler.destroy();
      },
    });

    handler.open();
  }

  async function unlink(bank: LinkedBank) {
    const name = bank.institution_name ?? "this bank";
    const ok = window.confirm(
      `Unlink ${name}? New transactions will stop importing. Transactions already imported stay in your list.`
    );
    if (!ok) return;

    const result = await callPlaid("unlink", { item_id: bank.item_id });
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setMessage(`Unlinked ${name}.`);
    await loadBanks();
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2>Linked cards</h2>
        {banks.length > 0 && (
          <button
            type="button"
            className="link-button"
            onClick={() => sync(false)}
            disabled={busy !== ""}
          >
            <RefreshCw size={14} className={busy === "syncing" ? "spin" : undefined} />
            &nbsp;{busy === "syncing" ? "Syncing…" : "Sync"}
          </button>
        )}
      </div>

      {banks.length === 0 ? (
        <p className="empty-state">
          Optional: link a card or bank to import transactions automatically. Adding them by
          hand still works either way.
        </p>
      ) : (
        <div className="row-list">
          {banks.map((bank) => (
            <div className="list-row" key={bank.item_id}>
              <CategoryIcon icon={CreditCard} color="#2f80ed" />
              <div className="row-text">
                <strong>{bank.institution_name ?? "Linked bank"}</strong>
                <span>
                  {bank.accounts
                    .map((account) => (account.mask ? `${account.name} ••${account.mask}` : account.name))
                    .join(", ") || "Accounts"}
                  {" · "}
                  {syncedLabel(bank.last_synced_at)}
                </span>
              </div>
              <button
                type="button"
                className="row-delete always-visible"
                onClick={() => unlink(bank)}
                aria-label={`Unlink ${bank.institution_name ?? "bank"}`}
                title="Unlink"
              >
                <Unlink size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="link-controls">
        <label className="field">
          <span>Import starting</span>
          <select
            value={daysBack}
            onChange={(event) => setDaysBack(Number(event.target.value))}
            disabled={busy !== ""}
          >
            <option value={0}>From today on</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </label>
        <button
          type="button"
          className="primary-button"
          onClick={connect}
          disabled={busy !== ""}
        >
          <Link2 size={17} />
          {busy === "linking" ? "Opening…" : "Link a card or bank"}
        </button>
        {daysBack > 0 && (
          <p className="auth-hint">
            Heads up: if you already typed some of these in by hand, you&apos;ll see them twice.
            Delete either copy.
          </p>
        )}
      </div>

      {message && (
        <p className="link-message" role="status">
          {message}
        </p>
      )}
    </section>
  );
}

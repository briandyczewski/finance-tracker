"use client";

import { useCallback, useEffect, useState } from "react";
import { Link2, RefreshCw, TrendingUp, Unlink } from "lucide-react";
import CategoryIcon from "@/components/CategoryIcon";
import { formatMoney } from "@/lib/finance";
import { supabase } from "@/lib/supabase";
import { callPlaid, linkWithPlaid } from "@/lib/plaid";

// Linked brokerages (Robinhood etc.) on the Savings tab. Shows what your
// investments are worth now. It never adds transactions, so spending,
// budgets and Safe Spending are unaffected.

const INVEST_COLOR = "#2f80ed";
const SHOW_FIRST = 6;
const REFRESH_AFTER_MS = 6 * 60 * 60 * 1000; // Plaid updates holdings about once a day

type Brokerage = {
  item_id: string;
  institution_name: string | null;
  accounts: { id: string; name: string; mask?: string | null; balance?: number | null }[];
  last_synced_at: string | null;
};

type Holding = {
  id: number;
  item_id: string;
  name: string;
  ticker: string | null;
  quantity: number;
  price: number | null;
  value: number;
  cost_basis: number | null;
};

function formatShares(quantity: number) {
  return quantity.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function updatedLabel(value: string | null) {
  if (!value) return "Waiting for first update";
  const date = new Date(value);
  return `Updated ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

export default function BrokerageCard() {
  const [brokerages, setBrokerages] = useState<Brokerage[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<"" | "linking" | "refreshing">("");
  const [message, setMessage] = useState("");
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    const [itemsResult, holdingsResult] = await Promise.all([
      supabase
        .from("plaid_items")
        .select("item_id, institution_name, accounts, last_synced_at")
        .eq("kind", "brokerage")
        .order("created_at"),
      supabase
        .from("investment_holdings")
        .select("id, item_id, name, ticker, quantity, price, value, cost_basis")
        .order("value", { ascending: false }),
    ]);

    if (itemsResult.error) console.error("Error loading brokerages:", itemsResult.error);
    if (holdingsResult.error) console.error("Error loading holdings:", holdingsResult.error);

    const items = (itemsResult.data ?? []) as Brokerage[];
    setBrokerages(items);
    setHoldings(
      (holdingsResult.data ?? []).map((row) => ({
        ...row,
        quantity: Number(row.quantity),
        price: row.price === null ? null : Number(row.price),
        value: Number(row.value),
        cost_basis: row.cost_basis === null ? null : Number(row.cost_basis),
      })) as Holding[]
    );
    setLoaded(true);
    return items;
  }, []);

  const refresh = useCallback(
    async (quiet = false) => {
      setBusy("refreshing");
      if (!quiet) setMessage("");
      const result = await callPlaid("sync");
      setBusy("");
      if (result.error) {
        if (!quiet) setMessage(result.error);
        return;
      }
      const notes = result.problems ?? [];
      if (notes.length) setMessage(notes.join(" "));
      else if (!quiet) setMessage("Up to date.");
      await load();
    },
    [load]
  );

  // Load, then refresh quietly if the numbers are more than a few hours old.
  useEffect(() => {
    load().then((items) => {
      const stale = items.some(
        (item) =>
          !item.last_synced_at ||
          Date.now() - new Date(item.last_synced_at).getTime() > REFRESH_AFTER_MS
      );
      if (items.length && stale) refresh(true);
    });
  }, [load, refresh]);

  async function connect() {
    setBusy("linking");
    setMessage("");
    const result = await linkWithPlaid("brokerage", {}, () =>
      setMessage("Linking… loading your holdings.")
    );
    setBusy("");

    if (result.cancelled) {
      setMessage("");
      return;
    }
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setMessage(
      (result.holdings ?? 0) > 0
        ? "Linked! Your holdings are below."
        : "Linked! Your brokerage is still sending your holdings. Tap Refresh in a minute."
    );
    await load();
  }

  async function unlink(brokerage: Brokerage) {
    const name = brokerage.institution_name ?? "this brokerage";
    if (!window.confirm(`Unlink ${name}? Its holdings will be removed from this page.`)) return;

    const result = await callPlaid("unlink", { item_id: brokerage.item_id });
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setMessage(`Unlinked ${name}.`);
    await load();
  }

  // Account balances include uninvested cash; fall back to holdings if missing.
  const holdingsValue = holdings.reduce((sum, holding) => sum + holding.value, 0);
  const balances = brokerages.flatMap((brokerage) => brokerage.accounts.map((account) => account.balance));
  const totalValue = balances.length && balances.every((balance) => typeof balance === "number")
    ? balances.reduce((sum: number, balance) => sum + Number(balance), 0)
    : holdingsValue;

  const withCost = holdings.filter((holding) => holding.cost_basis !== null && holding.cost_basis > 0);
  const costTotal = withCost.reduce((sum, holding) => sum + Number(holding.cost_basis), 0);
  const gain = withCost.reduce((sum, holding) => sum + holding.value, 0) - costTotal;
  const gainPercent = costTotal > 0 ? (gain / costTotal) * 100 : null;

  const visible = showAll ? holdings : holdings.slice(0, SHOW_FIRST);

  return (
    <section className="card">
      <div className="card-head">
        <h2>Brokerage</h2>
        {brokerages.length > 0 && (
          <button
            type="button"
            className="link-button"
            onClick={() => refresh(false)}
            disabled={busy !== ""}
          >
            <RefreshCw size={14} className={busy === "refreshing" ? "spin" : undefined} />
            &nbsp;{busy === "refreshing" ? "Refreshing…" : "Refresh"}
          </button>
        )}
      </div>

      {loaded && brokerages.length === 0 && (
        <p className="empty-state">
          Optional: link Robinhood or another brokerage to see what your investments are worth.
          It doesn&apos;t change your spending, budgets or Safe Spending.
        </p>
      )}

      {brokerages.length > 0 && (
        <>
          <p className="hero-label">Worth now</p>
          <p className="brokerage-total">{formatMoney(totalValue)}</p>
          {gainPercent !== null && (
            <p className={gain >= 0 ? "brokerage-gain positive" : "brokerage-gain negative"}>
              {gain >= 0 ? "+" : "−"}
              {formatMoney(Math.abs(gain))} ({gain >= 0 ? "+" : "−"}
              {Math.abs(gainPercent).toFixed(1)}%) total return
            </p>
          )}

          <div className="row-list">
            {brokerages.map((brokerage) => (
              <div className="list-row" key={brokerage.item_id}>
                <CategoryIcon icon={TrendingUp} color={INVEST_COLOR} />
                <div className="row-text">
                  <strong>{brokerage.institution_name ?? "Brokerage"}</strong>
                  <span>{updatedLabel(brokerage.last_synced_at)}</span>
                </div>
                <button
                  type="button"
                  className="row-delete always-visible"
                  onClick={() => unlink(brokerage)}
                  aria-label={`Unlink ${brokerage.institution_name ?? "brokerage"}`}
                  title="Unlink"
                >
                  <Unlink size={16} />
                </button>
              </div>
            ))}
          </div>

          {holdings.length > 0 && (
            <>
              <div className="card-head holdings-head">
                <h2>Holdings</h2>
                <span>{holdings.length}</span>
              </div>
              <div className="row-list">
                {visible.map((holding) => {
                  const holdingGain =
                    holding.cost_basis !== null && holding.cost_basis > 0
                      ? holding.value - holding.cost_basis
                      : null;
                  return (
                    <div className="list-row" key={holding.id}>
                      <CategoryIcon
                        color={INVEST_COLOR}
                        letter={(holding.ticker ?? holding.name).charAt(0).toUpperCase()}
                      />
                      <div className="row-text">
                        <strong>{holding.ticker ?? holding.name}</strong>
                        <span>
                          {formatShares(holding.quantity)} share{holding.quantity === 1 ? "" : "s"}
                          {holding.price !== null && ` · ${formatMoney(holding.price)}`}
                        </span>
                      </div>
                      <div className="holding-value">
                        <strong className="row-value">{formatMoney(holding.value)}</strong>
                        {holdingGain !== null && (
                          <span className={holdingGain >= 0 ? "positive" : "negative"}>
                            {holdingGain >= 0 ? "+" : "−"}
                            {formatMoney(Math.abs(holdingGain))}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {holdings.length > SHOW_FIRST && (
                <button type="button" className="link-button show-more" onClick={() => setShowAll(!showAll)}>
                  {showAll ? "Show less" : `Show all ${holdings.length}`}
                </button>
              )}
            </>
          )}
        </>
      )}

      <div className="link-controls">
        <button type="button" className="primary-button" onClick={connect} disabled={busy !== ""}>
          <Link2 size={17} />
          {busy === "linking" ? "Opening…" : brokerages.length ? "Link another brokerage" : "Link a brokerage"}
        </button>
      </div>

      {message && (
        <p className="link-message" role="status">
          {message}
        </p>
      )}
    </section>
  );
}

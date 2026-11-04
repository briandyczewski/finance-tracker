"use client";

import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PiggyBank, Trash, TrendingUp } from "lucide-react";

import CategoryIcon from "@/components/CategoryIcon";
import {
  SavingsEntry,
  formatMoney,
  formatMoneyShort,
  formatMonthLabel,
  formatMonthLong,
  formatShortDate,
  getToday,
  shiftMonth,
  sumSavings,
} from "@/lib/finance";
import { supabase } from "@/lib/supabase";

type SavingsPanelProps = {
  entries: SavingsEntry[];
  setEntries: React.Dispatch<React.SetStateAction<SavingsEntry[]>>;
  selectedMonth: string;
};

type MonthTotals = {
  month: string;
  savings: number;
  investments: number;
  savingsToDate: number;
  investmentsToDate: number;
};

const SAVINGS_COLOR = "#16a34a";
const INVEST_COLOR = "#2f80ed";

export default function SavingsPanel({ entries, setEntries, selectedMonth }: SavingsPanelProps) {
  const today = getToday();

  // Every month from the first entry (or 11 months back) through the
  // current month, with monthly totals and running all-time totals.
  const monthTotals = useMemo<MonthTotals[]>(() => {
    const currentMonth = today.slice(0, 7);
    const earliestEntry = entries.reduce(
      (min, entry) => (entry.date.slice(0, 7) < min ? entry.date.slice(0, 7) : min),
      currentMonth
    );
    const defaultStart = shiftMonth(currentMonth, -11);
    let month = earliestEntry < defaultStart ? earliestEntry : defaultStart;

    const rows: MonthTotals[] = [];
    let savingsToDate = 0;
    let investmentsToDate = 0;

    while (month <= currentMonth) {
      const savings = sumSavings(entries, "savings", month);
      const investments = sumSavings(entries, "investment", month);
      savingsToDate += savings;
      investmentsToDate += investments;
      rows.push({ month, savings, investments, savingsToDate, investmentsToDate });
      month = shiftMonth(month, 1);
    }

    return rows;
  }, [entries, today]);

  const monthSavings = sumSavings(entries, "savings", selectedMonth);
  const monthInvestments = sumSavings(entries, "investment", selectedMonth);
  const allTimeSavings = sumSavings(entries, "savings");
  const allTimeInvestments = sumSavings(entries, "investment");
  const shortMonth = formatMonthLong(selectedMonth).split(" ")[0];

  const chartData = monthTotals.slice(-12).map((row) => ({
    month: formatMonthLabel(row.month).split(" ")[0],
    Savings: row.savings,
    Investments: row.investments,
    "All-time total": row.savingsToDate + row.investmentsToDate,
  }));

  const monthEntries = entries
    .filter((entry) => entry.date.startsWith(selectedMonth))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

  async function deleteEntry(id: number) {
    const { error } = await supabase.from("savings_entries").delete().eq("id", id);

    if (error) {
      console.error("Error deleting entry:", error);
      alert("Entry could not be deleted.");
      return;
    }

    setEntries((current) =>
      current.filter((entry) => entry.source === "transaction" || entry.id !== id)
    );
  }

  return (
    <div className="split">
      <div className="split-main">
        <section className="card hero-card o-1">
          <p className="hero-label">Saved + invested, all time</p>
          <p className="hero-amount">{formatMoney(allTimeSavings + allTimeInvestments)}</p>

          <div className="stat-row two">
            <div className="stat">
              <span>Total saved</span>
              <strong className="positive">{formatMoney(allTimeSavings)}</strong>
            </div>
            <div className="stat">
              <span>Total invested</span>
              <strong className="invest">{formatMoney(allTimeInvestments)}</strong>
            </div>
          </div>

          <div className="tile-row">
            <div className="tile">
              <CategoryIcon icon={PiggyBank} color={SAVINGS_COLOR} size="sm" />
              <span>Saved in {shortMonth}</span>
              <strong>{formatMoney(monthSavings)}</strong>
            </div>
            <div className="tile">
              <CategoryIcon icon={TrendingUp} color={INVEST_COLOR} size="sm" />
              <span>Invested in {shortMonth}</span>
              <strong>{formatMoney(monthInvestments)}</strong>
            </div>
          </div>
        </section>

        <section className="card o-3">
          <div className="card-head">
            <h2>Entries</h2>
            <span>{formatMonthLabel(selectedMonth)}</span>
          </div>

          {monthEntries.length === 0 && (
            <p className="empty-state">Nothing logged this month yet.</p>
          )}

          <div className="row-list">
            {monthEntries.map((entry) => {
              const isSavings = entry.account === "savings";
              return (
                <div className="list-row" key={`${entry.source ?? "manual"}-${entry.id}`}>
                  <CategoryIcon
                    icon={isSavings ? PiggyBank : TrendingUp}
                    color={isSavings ? SAVINGS_COLOR : INVEST_COLOR}
                  />
                  <div className="row-text">
                    <strong>{entry.note || (isSavings ? "Savings" : "Investment")}</strong>
                    <span>
                      {isSavings ? "Savings" : "Investments"} · {formatShortDate(entry.date)}
                      {entry.source === "transaction" && " · From transactions"}
                    </span>
                  </div>
                  <strong className={entry.amount >= 0 ? "row-value positive" : "row-value negative"}>
                    {entry.amount >= 0 ? "+" : ""}
                    {formatMoney(entry.amount)}
                  </strong>
                  {entry.source === "transaction" ? (
                    <span className="row-delete-spacer" />
                  ) : (
                    <button
                      type="button"
                      className="row-delete"
                      onClick={() => deleteEntry(entry.id)}
                      aria-label="Delete entry"
                      title="Delete"
                    >
                      <Trash size={16} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="split-side">
        <section className="card o-2">
          <div className="card-head">
            <h2>Growth</h2>
            <span>Last 12 months</span>
          </div>

          <div className="chart-box">
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={chartData} margin={{ top: 8, right: 0, bottom: 0, left: -8 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--text-3)", fontSize: 11 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--text-3)", fontSize: 11 }}
                  tickFormatter={formatMoneyShort}
                  width={48}
                />
                <Tooltip
                  cursor={{ fill: "var(--surface-2)" }}
                  content={({ active, payload, label }) =>
                    active && payload?.length ? (
                      <div className="chart-tooltip">
                        <strong>{label}</strong>
                        {payload.map((item) => (
                          <span key={String(item.dataKey)}>
                            <i className="dot" style={{ background: item.color }} />
                            {item.name}: {formatMoney(Number(item.value))}
                          </span>
                        ))}
                      </div>
                    ) : null
                  }
                />
                <Bar dataKey="Savings" fill={SAVINGS_COLOR} radius={[5, 5, 0, 0]} maxBarSize={14} />
                <Bar dataKey="Investments" fill={INVEST_COLOR} radius={[5, 5, 0, 0]} maxBarSize={14} />
                <Line
                  type="monotone"
                  dataKey="All-time total"
                  stroke="var(--accent)"
                  strokeWidth={2.5}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-key">
            <span><i className="dot" style={{ background: SAVINGS_COLOR }} />Savings</span>
            <span><i className="dot" style={{ background: INVEST_COLOR }} />Investments</span>
            <span><i className="dot accent" />All-time total</span>
          </div>
        </section>

        <section className="card o-4">
          <div className="card-head">
            <h2>Monthly history</h2>
            <span>With running totals</span>
          </div>

          <div className="table">
            <div className="table-row table-head">
              <span>Month</span>
              <span>Saved</span>
              <span>Invested</span>
              <span>Total</span>
            </div>
            {[...monthTotals].reverse().map((row) => (
              <div className="table-row" key={row.month}>
                <span>{formatMonthLabel(row.month)}</span>
                <span className="positive">{formatMoney(row.savings)}</span>
                <span className="invest">{formatMoney(row.investments)}</span>
                <strong>{formatMoney(row.savingsToDate + row.investmentsToDate)}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

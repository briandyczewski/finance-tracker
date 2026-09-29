"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  SavingsAccount,
  SavingsEntry,
  formatMoney,
  formatMonthLabel,
  getToday,
  sumSavings,
} from "@/lib/finance";
import { supabase } from "@/lib/supabase";

type SavingsPanelProps = {
  entries: SavingsEntry[];
  setEntries: React.Dispatch<React.SetStateAction<SavingsEntry[]>>;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
};

type MonthTotals = {
  month: string;
  savings: number;
  investments: number;
  savingsToDate: number;
  investmentsToDate: number;
};

function shiftMonth(month: string, delta: number) {
  const [year, monthIndex] = month.split("-").map(Number);
  const date = new Date(year, monthIndex - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function SavingsPanel({
  entries,
  setEntries,
  selectedMonth,
  setSelectedMonth,
}: SavingsPanelProps) {
  const today = getToday();

  const [account, setAccount] = useState<SavingsAccount>("savings");
  const [direction, setDirection] = useState<"add" | "withdraw">("add");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

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

  const chartData = monthTotals.slice(-12).map((row) => ({
    month: formatMonthLabel(row.month).split(" ")[0],
    Savings: row.savings,
    Investments: row.investments,
    "All-time total": row.savingsToDate + row.investmentsToDate,
  }));

  const monthEntries = entries
    .filter((entry) => entry.date.startsWith(selectedMonth))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

  async function addEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0 || !date || saving) return;

    setSaving(true);
    const { data, error } = await supabase
      .from("savings_entries")
      .insert({
        account,
        amount: direction === "add" ? numericAmount : -numericAmount,
        date,
        note: note.trim() || null,
      })
      .select()
      .single();
    setSaving(false);

    if (error) {
      console.error("Error saving entry:", error);
      alert("Entry could not be saved.");
      return;
    }

    setEntries((current) => [
      {
        id: Number(data.id),
        account: data.account,
        amount: Number(data.amount),
        date: data.date,
        note: data.note ?? "",
      },
      ...current,
    ]);

    setAmount("");
    setNote("");
    setDirection("add");
  }

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
    <div className="screen-stack">
      <section className="card">
        <div className="section-heading">
          <h2>Savings & Investments</h2>
          <input
            className="month-picker"
            type="month"
            value={selectedMonth}
            onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
          />
        </div>

        <p className="savings-subhead">{formatMonthLabel(selectedMonth)}</p>
        <div className="savings-grid">
          <div className="recommendation-card green-card">
            <p>Saved this month</p>
            <strong>{formatMoney(monthSavings)}</strong>
          </div>
          <div className="recommendation-card blue-card">
            <p>Invested this month</p>
            <strong>{formatMoney(monthInvestments)}</strong>
          </div>
        </div>

        <p className="savings-subhead">All time</p>
        <div className="savings-grid">
          <div className="recommendation-card green-card">
            <p>Total saved</p>
            <strong>{formatMoney(allTimeSavings)}</strong>
          </div>
          <div className="recommendation-card blue-card">
            <p>Total invested</p>
            <strong>{formatMoney(allTimeInvestments)}</strong>
          </div>
          <div className="recommendation-card dark-card savings-span">
            <p>Saved + invested</p>
            <strong>{formatMoney(allTimeSavings + allTimeInvestments)}</strong>
          </div>
        </div>
      </section>

      <form className="card" onSubmit={addEntry}>
        <div className="section-heading">
          <h2>Log Money</h2>
          <span>Deposits & withdrawals</span>
        </div>

        <div className="input-grid">
          <label>
            <span>Account</span>
            <select
              value={account}
              onChange={(e) => setAccount(e.target.value as SavingsAccount)}
            >
              <option value="savings">Savings</option>
              <option value="investment">Investments</option>
            </select>
          </label>

          <label>
            <span>Type</span>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as "add" | "withdraw")}
            >
              <option value="add">Added</option>
              <option value="withdraw">Withdrew</option>
            </select>
          </label>
        </div>

        <div className="input-grid">
          <label>
            <span>Amount</span>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              type="number"
              min="0"
              step="0.01"
            />
          </label>

          <label>
            <span>Date</span>
            <input value={date} onChange={(e) => setDate(e.target.value)} type="date" />
          </label>
        </div>

        <label>
          <span>Note (optional)</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex: Roth IRA, emergency fund, brokerage"
          />
        </label>

        <button className="primary-button" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Add Entry"}
        </button>
      </form>

      <section className="card">
        <div className="section-heading">
          <h2>Growth</h2>
          <span>Last 12 months</span>
        </div>

        <div className="trend-chart">
          <ResponsiveContainer width="100%" height={236}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} width={48} />
              <Tooltip formatter={(value) => formatMoney(Number(value))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Savings" fill="#12b76a" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Investments" fill="#2563eb" radius={[6, 6, 0, 0]} />
              <Line
                type="monotone"
                dataKey="All-time total"
                stroke="#8b5cf6"
                strokeWidth={3}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card">
        <div className="section-heading">
          <h2>Entries</h2>
          <span>{formatMonthLabel(selectedMonth)}</span>
        </div>

        <div className="transaction-list">
          {monthEntries.length === 0 && (
            <p className="empty-state">Nothing logged this month yet.</p>
          )}

          {monthEntries.map((entry) => (
            <article className="transaction-card" key={`${entry.source ?? "manual"}-${entry.id}`}>
              <div>
                <h3>
                  {entry.note || (entry.account === "savings" ? "Savings" : "Investment")}{" "}
                  <span className={entry.account === "savings" ? "goal-pill" : "budget-pill"}>
                    {entry.account === "savings" ? "Savings" : "Invest"}
                  </span>
                </h3>
                <p>
                  <span className={entry.amount >= 0 ? "positive" : "negative"}>
                    {entry.amount >= 0 ? "+" : ""}
                    {formatMoney(entry.amount)}
                  </span>{" "}
                  • {entry.date}
                </p>
              </div>

              {entry.source === "transaction" ? (
                <span className="auto-tag">From transactions</span>
              ) : (
                <button
                  type="button"
                  className="delete-button"
                  onClick={() => deleteEntry(entry.id)}
                >
                  Delete
                </button>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="section-heading">
          <h2>Monthly History</h2>
          <span>With running totals</span>
        </div>

        <div className="month-list">
          {[...monthTotals].reverse().map((row) => (
            <article className="month-card" key={row.month}>
              <h3>{formatMonthLabel(row.month)}</h3>

              <div className="month-row">
                <span>Saved</span>
                <strong className="positive">{formatMoney(row.savings)}</strong>
              </div>

              <div className="month-row">
                <span>Invested</span>
                <strong className="invest-text">{formatMoney(row.investments)}</strong>
              </div>

              <div className="month-row total">
                <span>All-time total</span>
                <strong>{formatMoney(row.savingsToDate + row.investmentsToDate)}</strong>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

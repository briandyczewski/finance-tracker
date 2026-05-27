"use client";

import { useEffect, useMemo, useState } from "react";
import RecommendationCard from "@/components/RecommendationCard";
import BalanceCard from "@/components/BalanceCard";
import TrendChart from "@/components/TrendChart";
import TransactionForm from "@/components/TransactionForm";
import SpendingChart from "@/components/SpendingChart";
import TransactionList from "@/components/TransactionList";
import SubscriptionPanel from "@/components/SubscriptionPanel";
import HistoryPanel from "@/components/HistoryPanel";
import BudgetPanel from "@/components/BudgetPanel";

export type TransactionType = "income" | "expense";
export type Frequency = "weekly" | "monthly" | "yearly";

export type Transaction = {
  id: number;
  type: TransactionType;
  name: string;
  amount: number;
  category: string;
  date: string;
};

export type Subscription = {
  id: number;
  name: string;
  amount: number;
  frequency: Frequency;
  startDate: string;
};

export const categories = [
  "Rent",
  "Bills",
  "Food",
  "Gas",
  "Fun",
  "Savings",
  "Subscriptions",
  "Other",
];

export function getToday() {
  return new Date().toISOString().split("T")[0];
}

export function getMonthRange(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);

  return {
    start: new Date(year, monthIndex - 1, 1),
    end: new Date(year, monthIndex, 0),
  };
}

export function countSubscriptionCharges(
  subscription: Subscription,
  month: string
) {
  const { start, end } = getMonthRange(month);
  const subStart = new Date(subscription.startDate + "T00:00:00");

  if (subStart > end) return 0;
  if (subscription.frequency === "monthly") return 1;

  if (subscription.frequency === "yearly") {
    return subStart.getMonth() === start.getMonth() ? 1 : 0;
  }

  let count = 0;
  const chargeDate = new Date(subStart);

  while (chargeDate <= end) {
    if (chargeDate >= start) count++;
    chargeDate.setDate(chargeDate.getDate() + 7);
  }

  return count;
}

export default function Home() {
  const today = getToday();
  const currentMonth = today.slice(0, 7);

  const [activeTab, setActiveTab] = useState<
    "dashboard" | "budgets" | "subscriptions" | "history"
  >("dashboard");

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [hasLoadedSavedData, setHasLoadedSavedData] = useState(false);

  useEffect(() => {
    const savedTransactions = localStorage.getItem("finance-transactions");
    const savedSubscriptions = localStorage.getItem("finance-subscriptions");
    const savedBudgets = localStorage.getItem("finance-budgets");

    if (savedTransactions) setTransactions(JSON.parse(savedTransactions));
    if (savedSubscriptions) setSubscriptions(JSON.parse(savedSubscriptions));
    if (savedBudgets) setBudgets(JSON.parse(savedBudgets));

    setHasLoadedSavedData(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedSavedData) return;
    localStorage.setItem("finance-transactions", JSON.stringify(transactions));
  }, [transactions, hasLoadedSavedData]);

  useEffect(() => {
    if (!hasLoadedSavedData) return;
    localStorage.setItem("finance-subscriptions", JSON.stringify(subscriptions));
  }, [subscriptions, hasLoadedSavedData]);

  useEffect(() => {
    if (!hasLoadedSavedData) return;
    localStorage.setItem("finance-budgets", JSON.stringify(budgets));
  }, [budgets, hasLoadedSavedData]);

  const monthlyTransactions = useMemo(() => {
    return transactions.filter((t) => t.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  const subscriptionExpenses = useMemo(() => {
    return subscriptions.reduce((total, sub) => {
      return total + sub.amount * countSubscriptionCharges(sub, selectedMonth);
    }, 0);
  }, [subscriptions, selectedMonth]);

  const income = monthlyTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const manualExpenses = monthlyTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const expenses = manualExpenses + subscriptionExpenses;
  const balance = income - expenses;

  const categoryTotals = categories.map((cat) => {
    if (cat === "Subscriptions") {
      return { category: cat, total: subscriptionExpenses };
    }

    const total = monthlyTransactions
      .filter((t) => t.type === "expense" && t.category === cat)
      .reduce((sum, t) => sum + t.amount, 0);

    return { category: cat, total };
  });

  const monthSummaries = Array.from({ length: 12 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - index);
    const month = date.toISOString().slice(0, 7);

    const monthlyTx = transactions.filter((t) => t.date.startsWith(month));

    const monthIncome = monthlyTx
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const monthManualExpenses = monthlyTx
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const monthSubscriptionExpenses = subscriptions.reduce((sum, sub) => {
      return sum + sub.amount * countSubscriptionCharges(sub, month);
    }, 0);

    return {
      month,
      income: monthIncome,
      expenses: monthManualExpenses + monthSubscriptionExpenses,
    };
  });

  return (
    <main className="app-shell">
      <div className="app-container">
        <header className="app-header">
          <div>
            <p className="eyebrow">Welcome back</p>
            <h1>Finance Tracker</h1>
          </div>

          <div className="profile-badge">$</div>
        </header>

        <nav className="tabs tabs-four">
          <button
            className={activeTab === "dashboard" ? "tab active" : "tab"}
            onClick={() => setActiveTab("dashboard")}
          >
            Home
          </button>

          <button
            className={activeTab === "budgets" ? "tab active" : "tab"}
            onClick={() => setActiveTab("budgets")}
          >
            Budgets
          </button>

          <button
            className={activeTab === "subscriptions" ? "tab active" : "tab"}
            onClick={() => setActiveTab("subscriptions")}
          >
            Subs
          </button>

          <button
            className={activeTab === "history" ? "tab active" : "tab"}
            onClick={() => setActiveTab("history")}
          >
            History
          </button>
        </nav>

{activeTab === "dashboard" && (
  <div className="screen-stack">
    <BalanceCard
      selectedMonth={selectedMonth}
      setSelectedMonth={setSelectedMonth}
      income={income}
      expenses={expenses}
      balance={balance}
    />

    <RecommendationCard
      income={income}
      expenses={expenses}
    />

    <TrendChart monthSummaries={monthSummaries} />

    <TransactionForm setTransactions={setTransactions} />

    <SpendingChart
      categoryTotals={categoryTotals}
      expenses={expenses}
    />

    <TransactionList
      transactions={monthlyTransactions}
      setTransactions={setTransactions}
    />
  </div>
)}

        {activeTab === "budgets" && (
          <BudgetPanel
            budgets={budgets}
            setBudgets={setBudgets}
            categoryTotals={categoryTotals}
          />
        )}

        {activeTab === "subscriptions" && (
          <SubscriptionPanel
            subscriptions={subscriptions}
            setSubscriptions={setSubscriptions}
            selectedMonth={selectedMonth}
            subscriptionExpenses={subscriptionExpenses}
          />
        )}

        {activeTab === "history" && (
          <HistoryPanel monthSummaries={monthSummaries} />
        )}
      </div>
    </main>
  );
}
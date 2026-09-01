"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

import {
  Transaction,
  Subscription,
  categories,
  getToday,
  countSubscriptionCharges,
} from "@/lib/finance";

import BalanceCard from "@/components/BalanceCard";
import TransactionForm from "@/components/TransactionForm";
import SpendingChart from "@/components/SpendingChart";
import TransactionList from "@/components/TransactionList";
import SubscriptionPanel from "@/components/SubscriptionPanel";
import HistoryPanel from "@/components/HistoryPanel";
import BudgetPanel from "@/components/BudgetPanel";
import RecommendationCard from "@/components/RecommendationCard";
import TrendChart from "@/components/TrendChart";

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
  const [darkMode, setDarkMode] = useState(false);
  const [hasLoadedSavedData, setHasLoadedSavedData] = useState(false);

  useEffect(() => {
    async function loadTransactions() {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading transactions:", error);
        return;
      }

      if (data) {
        setTransactions(
          data.map((item) => ({
            id: Number(item.id),
            name: item.name,
            amount: Number(item.amount),
            type: item.type,
            category: item.category,
            date: item.date,
          }))
        );
      }
    }

    async function loadSubscriptions() {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading subscriptions:", error);
        return;
      }

      if (data) {
        setSubscriptions(
          data.map((item) => ({
            id: Number(item.id),
            name: item.name,
            amount: Number(item.amount),
            frequency: item.frequency,
            startDate: item.start_date,
          }))
        );
      }
    }

    const savedBudgets = localStorage.getItem("finance-budgets");
    const savedDarkMode = localStorage.getItem("finance-dark-mode");

    if (savedBudgets) {
      setBudgets(JSON.parse(savedBudgets));
    }

    if (savedDarkMode === "true") {
      setDarkMode(true);
    }

    loadTransactions();
    loadSubscriptions();

    setHasLoadedSavedData(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedSavedData) return;

    localStorage.setItem(
      "finance-budgets",
      JSON.stringify(budgets)
    );
  }, [budgets, hasLoadedSavedData]);

  useEffect(() => {
    localStorage.setItem("finance-dark-mode", String(darkMode));

    if (darkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  }, [darkMode]);

  const monthlyTransactions = useMemo(() => {
    return transactions.filter((transaction) =>
      transaction.date.startsWith(selectedMonth)
    );
  }, [transactions, selectedMonth]);

  const subscriptionExpenses = useMemo(() => {
    return subscriptions.reduce((total, subscription) => {
      return (
        total +
        subscription.amount *
          countSubscriptionCharges(subscription, selectedMonth)
      );
    }, 0);
  }, [subscriptions, selectedMonth]);

  const income = monthlyTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const manualExpenses = monthlyTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const expenses = manualExpenses + subscriptionExpenses;
  const balance = income - expenses;

  const categoryTotals = categories.map((category) => {
    if (category === "Subscriptions") {
      return {
        category,
        total: subscriptionExpenses,
      };
    }

    const total = monthlyTransactions
      .filter(
        (transaction) =>
          transaction.type === "expense" &&
          transaction.category === category
      )
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    return {
      category,
      total,
    };
  });

  const monthSummaries = Array.from({ length: 12 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - index);

    const month = date.toISOString().slice(0, 7);

    const monthlyTx = transactions.filter((transaction) =>
      transaction.date.startsWith(month)
    );

    const monthIncome = monthlyTx
      .filter((transaction) => transaction.type === "income")
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    const monthManualExpenses = monthlyTx
      .filter((transaction) => transaction.type === "expense")
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    const monthSubscriptionExpenses = subscriptions.reduce(
      (sum, subscription) => {
        return (
          sum +
          subscription.amount *
            countSubscriptionCharges(subscription, month)
        );
      },
      0
    );

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

          <button
            type="button"
            className="theme-toggle"
            onClick={() => setDarkMode((current) => !current)}
          >
            {darkMode ? "☀️" : "🌙"}
          </button>
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
            className={
              activeTab === "subscriptions" ? "tab active" : "tab"
            }
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

            <TransactionForm
              setTransactions={setTransactions}
            />

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
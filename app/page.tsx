"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

import {
  Transaction,
  Subscription,
  SavingsEntry,
  categories,
  sumSavings,
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
import SavingsPanel from "@/components/SavingsPanel";

export default function Home() {
  const today = getToday();
  const currentMonth = today.slice(0, 7);

  const [activeTab, setActiveTab] = useState<
    "dashboard" | "budgets" | "savings" | "subscriptions" | "history"
  >("dashboard");

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [savingsEntries, setSavingsEntries] = useState<SavingsEntry[]>([]);
  const [darkMode, setDarkMode] = useState(false);
  const budgetSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

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

    async function loadBudgets() {
      const { data, error } = await supabase.from("budgets").select("*");

      if (error) {
        console.error("Error loading budgets:", error);
        return;
      }

      const loaded: Record<string, number> = {};
      for (const row of data ?? []) {
        loaded[row.category] = Number(row.amount);
      }

      // One-time move of budgets that were only saved in this browser.
      const legacy = localStorage.getItem("finance-budgets");
      if (legacy) {
        try {
          const legacyBudgets: Record<string, number> = JSON.parse(legacy);
          const toUpload = Object.entries(legacyBudgets)
            .filter(([category, amount]) => !(category in loaded) && Number(amount) > 0)
            .map(([category, amount]) => ({ category, amount: Number(amount) }));

          if (toUpload.length > 0) {
            const { error: uploadError } = await supabase.from("budgets").upsert(toUpload);
            if (uploadError) {
              console.error("Error moving budgets to Supabase:", uploadError);
              setBudgets({ ...legacyBudgets, ...loaded });
              return;
            }
            toUpload.forEach(({ category, amount }) => (loaded[category] = amount));
          }
          localStorage.removeItem("finance-budgets");
        } catch {
          localStorage.removeItem("finance-budgets");
        }
      }

      setBudgets(loaded);
    }

    async function loadSettings() {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "dark_mode")
        .maybeSingle();

      if (error) {
        console.error("Error loading settings:", error);
        return;
      }

      const legacy = localStorage.getItem("finance-dark-mode");

      if (data) {
        setDarkMode(data.value === true);
      } else if (legacy !== null) {
        const value = legacy === "true";
        setDarkMode(value);
        await supabase.from("app_settings").upsert({ key: "dark_mode", value });
      }

      localStorage.removeItem("finance-dark-mode");
    }

    async function loadSavings() {
      const { data, error } = await supabase
        .from("savings_entries")
        .select("*")
        .order("date", { ascending: false });

      if (error) {
        console.error("Error loading savings:", error);
        return;
      }

      setSavingsEntries(
        (data ?? []).map((item) => ({
          id: Number(item.id),
          account: item.account,
          amount: Number(item.amount),
          date: item.date,
          note: item.note ?? "",
        }))
      );
    }

    loadTransactions();
    loadSubscriptions();
    loadBudgets();
    loadSettings();
    loadSavings();
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  }, [darkMode]);

  async function toggleDarkMode() {
    const value = !darkMode;
    setDarkMode(value);

    const { error } = await supabase
      .from("app_settings")
      .upsert({ key: "dark_mode", value, updated_at: new Date().toISOString() });

    if (error) console.error("Error saving dark mode:", error);
  }

  function updateBudget(category: string, value: number) {
    setBudgets((current) => ({ ...current, [category]: value }));

    // Wait until typing pauses before saving.
    clearTimeout(budgetSaveTimers.current[category]);
    budgetSaveTimers.current[category] = setTimeout(async () => {
      const { error } = await supabase.from("budgets").upsert({
        category,
        amount: value > 0 ? value : 0,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error("Error saving budget:", error);
        alert(`Budget for ${category} could not be saved.`);
      }
    }, 600);
  }

  const monthlyTransactions = useMemo(() => {
    return transactions.filter((transaction) =>
      transaction.date.startsWith(selectedMonth)
    );
  }, [transactions, selectedMonth]);

  // Expenses tagged "Savings" count as money added to savings.
  const allSavingsEntries = useMemo<SavingsEntry[]>(() => {
    const fromTransactions: SavingsEntry[] = transactions
      .filter(
        (transaction) =>
          transaction.type === "expense" && transaction.category === "Savings"
      )
      .map((transaction) => ({
        id: transaction.id,
        account: "savings",
        amount: transaction.amount,
        date: transaction.date,
        note: transaction.name,
        source: "transaction",
      }));

    return [...savingsEntries, ...fromTransactions];
  }, [savingsEntries, transactions]);

  const monthSavingsTotal = sumSavings(allSavingsEntries, "savings", selectedMonth);

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
            onClick={toggleDarkMode}
          >
            {darkMode ? "☀️" : "🌙"}
          </button>
        </header>

        <nav className="tabs tabs-five">
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
            className={activeTab === "savings" ? "tab active" : "tab"}
            onClick={() => setActiveTab("savings")}
          >
            Savings
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
            updateBudget={updateBudget}
            savingsThisMonth={monthSavingsTotal}
            categoryTotals={categoryTotals}
          />
        )}

        {activeTab === "savings" && (
          <SavingsPanel
            entries={allSavingsEntries}
            setEntries={setSavingsEntries}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
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
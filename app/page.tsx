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
  shiftMonth,
} from "@/lib/finance";

import AppShell, { type Tab } from "@/components/AppShell";
import PageHeader from "@/components/PageHeader";
import Sheet from "@/components/Sheet";
import BalanceCard from "@/components/BalanceCard";
import TransactionForm from "@/components/TransactionForm";
import SpendingChart from "@/components/SpendingChart";
import TransactionList from "@/components/TransactionList";
import UpcomingCard from "@/components/UpcomingCard";
import SubscriptionPanel from "@/components/SubscriptionPanel";
import SubscriptionForm from "@/components/SubscriptionForm";
import HistoryPanel from "@/components/HistoryPanel";
import BudgetPanel from "@/components/BudgetPanel";
import RecommendationCard from "@/components/RecommendationCard";
import TrendChart from "@/components/TrendChart";
import SavingsPanel from "@/components/SavingsPanel";
import SavingsForm from "@/components/SavingsForm";

type SheetName = "transaction" | "savings" | "subscription";

const pageTitles: Record<Tab, string> = {
  dashboard: "Overview",
  budgets: "Budgets",
  savings: "Savings & investing",
  subscriptions: "Recurring",
  history: "History",
};

export default function Home() {
  const today = getToday();
  const currentMonth = today.slice(0, 7);

  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [openSheet, setOpenSheet] = useState<SheetName | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [savingsEntries, setSavingsEntries] = useState<SavingsEntry[]>([]);
  const [darkMode, setDarkMode] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const budgetSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    // If the session ends (signed out in another tab, or it expired), go back to sign in.
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") window.location.replace("/login");
    });

    return () => listener.subscription.unsubscribe();
  }, []);

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

    async function loadBudgets(userId: string) {
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
            .map(([category, amount]) => ({
              user_id: userId,
              category,
              amount: Number(amount),
            }));

          if (toUpload.length > 0) {
            const { error: uploadError } = await supabase
              .from("budgets")
              .upsert(toUpload, { onConflict: "user_id,category" });
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

    async function loadSettings(userId: string) {
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
        await supabase
          .from("app_settings")
          .upsert(
            { user_id: userId, key: "dark_mode", value },
            { onConflict: "user_id,key" }
          );
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

    async function loadAll() {
      const { data } = await supabase.auth.getSession();
      const signedInId = data.session?.user.id;

      if (!signedInId) {
        window.location.replace("/login");
        return;
      }

      setUserId(signedInId);
      await Promise.all([
        loadTransactions(),
        loadSubscriptions(),
        loadBudgets(signedInId),
        loadSettings(signedInId),
        loadSavings(),
      ]);
      setLoaded(true);
    }

    loadAll();
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
    if (!userId) return;

    const { error } = await supabase
      .from("app_settings")
      .upsert(
        { user_id: userId, key: "dark_mode", value, updated_at: new Date().toISOString() },
        { onConflict: "user_id,key" }
      );

    if (error) console.error("Error saving dark mode:", error);
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.replace("/login");
  }

  function updateBudget(category: string, value: number) {
    setBudgets((current) => ({ ...current, [category]: value }));

    // Wait until typing pauses before saving.
    clearTimeout(budgetSaveTimers.current[category]);
    budgetSaveTimers.current[category] = setTimeout(async () => {
      if (!userId) return;

      const { error } = await supabase.from("budgets").upsert(
        {
          user_id: userId,
          category,
          amount: value > 0 ? value : 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,category" }
      );

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

  // Expenses tagged "Savings" or "Investing" count as money added
  // to savings or investments.
  const allSavingsEntries = useMemo<SavingsEntry[]>(() => {
    const fromTransactions: SavingsEntry[] = transactions
      .filter(
        (transaction) =>
          transaction.type === "expense" &&
          (transaction.category === "Savings" ||
            transaction.category === "Investing")
      )
      .map((transaction) => ({
        id: transaction.id,
        account: transaction.category === "Investing" ? "investment" : "savings",
        amount: transaction.amount,
        date: transaction.date,
        note: transaction.name,
        source: "transaction",
      }));

    return [...savingsEntries, ...fromTransactions];
  }, [savingsEntries, transactions]);

  const monthSavingsTotal = sumSavings(allSavingsEntries, "savings", selectedMonth);
  const monthInvestingTotal = sumSavings(allSavingsEntries, "investment", selectedMonth);

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
    const month = shiftMonth(currentMonth, -index);

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

  const closeSheet = () => setOpenSheet(null);

  if (!loaded) {
    return (
      <div className="loading-screen" aria-busy="true" aria-label="Loading">
        <span className="brand-mark pulse" />
      </div>
    );
  }

  // The main button in each page's header.
  const headerActions: Record<Tab, { actionLabel?: string; onAction?: () => void }> = {
    dashboard: { actionLabel: "Add", onAction: () => setOpenSheet("transaction") },
    budgets: {},
    savings: { actionLabel: "Log money", onAction: () => setOpenSheet("savings") },
    subscriptions: { actionLabel: "Add", onAction: () => setOpenSheet("subscription") },
    history: {},
  };

  return (
    <AppShell
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      darkMode={darkMode}
      onToggleDarkMode={toggleDarkMode}
      onSignOut={signOut}
    >
      <PageHeader
        eyebrow={activeTab === "dashboard" ? "Welcome back" : undefined}
        title={pageTitles[activeTab]}
        month={activeTab === "history" ? undefined : selectedMonth}
        currentMonth={currentMonth}
        setMonth={setSelectedMonth}
        {...headerActions[activeTab]}
      />

      {activeTab === "dashboard" && (
        <div className="split home">
          <div className="split-main">
            <div className="o-1">
              <BalanceCard
                month={selectedMonth}
                today={today}
                income={income}
                expenses={expenses}
                balance={balance}
                transactions={transactions}
                subscriptions={subscriptions}
              />
            </div>
            <div className="o-3">
              <SpendingChart categoryTotals={categoryTotals} expenses={expenses} />
            </div>
            <div className="o-5">
              <TransactionList
                transactions={monthlyTransactions}
                setTransactions={setTransactions}
                today={today}
              />
            </div>
          </div>

          <div className="split-side">
            <div className="o-2">
              <RecommendationCard
                income={income}
                expenses={expenses}
                savedThisMonth={monthSavingsTotal}
                investedThisMonth={monthInvestingTotal}
              />
            </div>
            <div className="o-4">
              <UpcomingCard
                subscriptions={subscriptions}
                month={selectedMonth}
                today={today}
                onSeeAll={() => setActiveTab("subscriptions")}
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === "budgets" && (
        <BudgetPanel
          budgets={budgets}
          updateBudget={updateBudget}
          savingsThisMonth={monthSavingsTotal}
          investingThisMonth={monthInvestingTotal}
          categoryTotals={categoryTotals}
        />
      )}

      {activeTab === "savings" && (
        <SavingsPanel
          entries={allSavingsEntries}
          setEntries={setSavingsEntries}
          selectedMonth={selectedMonth}
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
        <div className="stack">
          <TrendChart monthSummaries={monthSummaries} />
          <HistoryPanel monthSummaries={monthSummaries} />
        </div>
      )}

      <Sheet open={openSheet === "transaction"} title="Add transaction" onClose={closeSheet}>
        <TransactionForm setTransactions={setTransactions} onDone={closeSheet} />
      </Sheet>

      <Sheet open={openSheet === "savings"} title="Log money" onClose={closeSheet}>
        <SavingsForm setEntries={setSavingsEntries} onDone={closeSheet} />
      </Sheet>

      <Sheet open={openSheet === "subscription"} title="Add recurring charge" onClose={closeSheet}>
        <SubscriptionForm setSubscriptions={setSubscriptions} onDone={closeSheet} />
      </Sheet>
    </AppShell>
  );
}

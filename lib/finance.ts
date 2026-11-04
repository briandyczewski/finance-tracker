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
  "Investing",
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

export function daysInMonth(month: string) {
  return getMonthRange(month).end.getDate();
}

export function shiftMonth(month: string, delta: number) {
  const [year, monthIndex] = month.split("-").map(Number);
  const date = new Date(year, monthIndex - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// Days of the month (1-31) a subscription is charged in the given month.
export function subscriptionChargeDays(
  subscription: Subscription,
  month: string
) {
  const { start, end } = getMonthRange(month);
  const subStart = new Date(subscription.startDate + "T00:00:00");

  if (subStart > end) return [];

  if (subscription.frequency === "monthly") {
    return [Math.min(subStart.getDate(), end.getDate())];
  }

  if (subscription.frequency === "yearly") {
    return subStart.getMonth() === start.getMonth()
      ? [Math.min(subStart.getDate(), end.getDate())]
      : [];
  }

  const days: number[] = [];
  const chargeDate = new Date(subStart);

  while (chargeDate <= end) {
    if (chargeDate >= start) {
      days.push(chargeDate.getDate());
    }

    chargeDate.setDate(chargeDate.getDate() + 7);
  }

  return days;
}

export function countSubscriptionCharges(
  subscription: Subscription,
  month: string
) {
  return subscriptionChargeDays(subscription, month).length;
}

// Running total of spending for each day of the month
// (expense transactions plus subscription charges).
export function cumulativeSpending(
  transactions: Transaction[],
  subscriptions: Subscription[],
  month: string
) {
  const perDay = new Array<number>(daysInMonth(month)).fill(0);

  for (const transaction of transactions) {
    if (transaction.type === "expense" && transaction.date.startsWith(month)) {
      perDay[Number(transaction.date.slice(8, 10)) - 1] += transaction.amount;
    }
  }

  for (const subscription of subscriptions) {
    for (const day of subscriptionChargeDays(subscription, month)) {
      perDay[day - 1] += subscription.amount;
    }
  }

  let running = 0;
  return perDay.map((amount) => (running += amount));
}

export type SavingsAccount = "savings" | "investment";

export type SavingsEntry = {
  id: number;
  account: SavingsAccount;
  // Positive = money added, negative = money withdrawn
  amount: number;
  date: string;
  note: string;
  // "transaction" = pulled automatically from a Savings-category expense
  source?: "manual" | "transaction";
};

export function sumSavings(
  entries: SavingsEntry[],
  account: SavingsAccount,
  month?: string
) {
  return entries
    .filter(
      (entry) =>
        entry.account === account &&
        (!month || entry.date.startsWith(month))
    )
    .reduce((sum, entry) => sum + entry.amount, 0);
}

const moneyFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

// $1,234.56 (negative: -$1,234.56)
export function formatMoney(value: number) {
  return moneyFormat.format(value);
}

// Short form for chart axes: $950, $1.2k
export function formatMoneyShort(value: number) {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`;
  return `${sign}$${Math.round(abs)}`;
}

export function formatMonthLabel(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  return new Date(year, monthIndex - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export function formatMonthLong(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  return new Date(year, monthIndex - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

// "2026-11-04" -> "Nov 4"
export function formatShortDate(date: string) {
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

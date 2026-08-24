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

  if (subscription.frequency === "monthly") {
    return 1;
  }

  if (subscription.frequency === "yearly") {
    return subStart.getMonth() === start.getMonth() ? 1 : 0;
  }

  let count = 0;
  const chargeDate = new Date(subStart);

  while (chargeDate <= end) {
    if (chargeDate >= start) {
      count++;
    }

    chargeDate.setDate(chargeDate.getDate() + 7);
  }

  return count;
}
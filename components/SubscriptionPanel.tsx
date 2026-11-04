"use client";

import { Trash } from "lucide-react";
import CategoryIcon from "@/components/CategoryIcon";
import {
  Subscription,
  formatMoney,
  formatMonthLong,
  subscriptionChargeDays,
} from "@/lib/finance";
import { supabase } from "@/lib/supabase";

type SubscriptionPanelProps = {
  subscriptions: Subscription[];
  setSubscriptions: React.Dispatch<React.SetStateAction<Subscription[]>>;
  selectedMonth: string;
  subscriptionExpenses: number;
};

const frequencyLabel = { weekly: "Weekly", monthly: "Monthly", yearly: "Yearly" };

export default function SubscriptionPanel({
  subscriptions,
  setSubscriptions,
  selectedMonth,
  subscriptionExpenses,
}: SubscriptionPanelProps) {
  const monthName = formatMonthLong(selectedMonth).split(" ")[0];
  const shortMonth = monthName.slice(0, 3);

  async function deleteSubscription(id: number) {
    const { error } = await supabase.from("subscriptions").delete().eq("id", id);

    if (error) {
      console.error("Error deleting subscription:", error);
      alert("Subscription could not be deleted.");
      return;
    }

    setSubscriptions((current) => current.filter((sub) => sub.id !== id));
  }

  // Soonest charge in the selected month first; ones with no charge this month last.
  const rows = subscriptions
    .map((subscription) => ({
      subscription,
      days: subscriptionChargeDays(subscription, selectedMonth),
    }))
    .sort((a, b) => (a.days[0] ?? 99) - (b.days[0] ?? 99));

  const chargedCount = rows.filter((row) => row.days.length > 0).length;

  return (
    <div className="split">
      <div className="split-side">
        <section className="card hero-card o-1">
          <p className="hero-label">Recurring in {monthName}</p>
          <p className="hero-amount">{formatMoney(subscriptionExpenses)}</p>
          <div className="stat-row two">
            <div className="stat">
              <span>Subscriptions</span>
              <strong>{subscriptions.length}</strong>
            </div>
            <div className="stat">
              <span>Charging this month</span>
              <strong>{chargedCount}</strong>
            </div>
          </div>
        </section>
      </div>

      <div className="split-main">
        <section className="card o-2">
          <div className="card-head">
            <h2>Your subscriptions</h2>
            <span>{formatMoney(subscriptionExpenses)} this month</span>
          </div>

          {rows.length === 0 && (
            <p className="empty-state">No subscriptions yet. Add one with the button above.</p>
          )}

          <div className="row-list">
            {rows.map(({ subscription, days }) => (
              <div className="list-row" key={subscription.id}>
                <CategoryIcon
                  category="Subscriptions"
                  letter={subscription.name.charAt(0).toUpperCase()}
                />
                <div className="row-text">
                  <strong>{subscription.name}</strong>
                  <span>
                    {frequencyLabel[subscription.frequency]} ·{" "}
                    {days.length === 0
                      ? "No charge this month"
                      : `${days.length} charge${days.length === 1 ? "" : "s"} this month (${days
                          .map((day) => `${shortMonth} ${day}`)
                          .join(", ")})`}
                  </span>
                </div>
                <strong className="row-value">{formatMoney(subscription.amount)}</strong>
                <button
                  type="button"
                  className="row-delete"
                  onClick={() => deleteSubscription(subscription.id)}
                  aria-label={`Delete ${subscription.name}`}
                  title="Delete"
                >
                  <Trash size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

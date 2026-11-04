import { ChevronRight } from "lucide-react";
import CategoryIcon from "@/components/CategoryIcon";
import {
  Subscription,
  formatMoney,
  formatMonthLong,
  subscriptionChargeDays,
} from "@/lib/finance";

type UpcomingCardProps = {
  subscriptions: Subscription[];
  month: string;
  today: string;
  onSeeAll: () => void;
};

export default function UpcomingCard({
  subscriptions,
  month,
  today,
  onSeeAll,
}: UpcomingCardProps) {
  const currentMonth = today.slice(0, 7);
  const todayDay = Number(today.slice(8, 10));
  const shortMonth = formatMonthLong(month).slice(0, 3);

  const charges = subscriptions
    .flatMap((subscription) =>
      subscriptionChargeDays(subscription, month).map((day) => ({ subscription, day }))
    )
    .sort((a, b) => a.day - b.day);

  const total = charges.reduce((sum, charge) => sum + charge.subscription.amount, 0);

  return (
    <section className="card">
      <div className="card-head">
        <h2>Recurring this month</h2>
        <button type="button" className="link-button" onClick={onSeeAll}>
          See all <ChevronRight size={15} />
        </button>
      </div>

      {charges.length === 0 ? (
        <p className="empty-state">No recurring charges this month.</p>
      ) : (
        <>
          <div className="row-list">
            {charges.slice(0, 5).map(({ subscription, day }) => {
              const charged =
                month < currentMonth || (month === currentMonth && day < todayDay);
              return (
                <div
                  className={charged ? "list-row is-past" : "list-row"}
                  key={`${subscription.id}-${day}`}
                >
                  <CategoryIcon
                    category="Subscriptions"
                    letter={subscription.name.charAt(0).toUpperCase()}
                  />
                  <div className="row-text">
                    <strong>{subscription.name}</strong>
                    <span>
                      {charged ? "Charged" : "Due"} {shortMonth} {day}
                    </span>
                  </div>
                  <strong className="row-value">{formatMoney(subscription.amount)}</strong>
                </div>
              );
            })}
          </div>

          <div className="card-foot">
            <span>
              {charges.length} charge{charges.length === 1 ? "" : "s"}
            </span>
            <strong>{formatMoney(total)}</strong>
          </div>
        </>
      )}
    </section>
  );
}

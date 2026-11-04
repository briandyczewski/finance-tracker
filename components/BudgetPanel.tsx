import type { CSSProperties } from "react";
import CategoryIcon from "@/components/CategoryIcon";
import { categoryStyle } from "@/lib/categories";
import { categories, formatMoney } from "@/lib/finance";

type CategoryTotal = {
  category: string;
  total: number;
};

type BudgetPanelProps = {
  budgets: Record<string, number>;
  updateBudget: (category: string, value: number) => void;
  categoryTotals: CategoryTotal[];
  // Savings tab total for the month (manual entries + Savings transactions)
  savingsThisMonth: number;
  // Savings tab investment total for the month
  investingThisMonth: number;
};

const goalCategories = ["Savings", "Investing"];
const spendingCategories = categories.filter(
  (category) => category !== "Subscriptions" && !goalCategories.includes(category)
);

function Gauge({ percent, over }: { percent: number; over: boolean }) {
  return (
    <svg className="gauge" viewBox="0 0 200 110" aria-hidden="true">
      <path className="gauge-track" d="M 16 100 A 84 84 0 0 1 184 100" pathLength={100} />
      {percent > 0 && (
        <path
          className={over ? "gauge-fill over" : "gauge-fill"}
          d="M 16 100 A 84 84 0 0 1 184 100"
          pathLength={100}
          strokeDasharray={`${Math.min(percent, 100)} 100`}
        />
      )}
    </svg>
  );
}

function LimitInput({
  category,
  value,
  placeholder,
  updateBudget,
}: {
  category: string;
  value: number;
  placeholder: string;
  updateBudget: (category: string, value: number) => void;
}) {
  return (
    <label className="money-input small">
      <span>$</span>
      <input
        value={value || ""}
        onChange={(event) => updateBudget(category, Number(event.target.value))}
        placeholder={placeholder}
        aria-label={`${category} monthly ${placeholder.toLowerCase()}`}
        type="number"
        inputMode="decimal"
        min="0"
        step="0.01"
      />
    </label>
  );
}

export default function BudgetPanel({
  budgets,
  updateBudget,
  categoryTotals,
  savingsThisMonth,
  investingThisMonth,
}: BudgetPanelProps) {
  const spentIn = (category: string) =>
    category === "Savings"
      ? savingsThisMonth
      : category === "Investing"
        ? investingThisMonth
        : categoryTotals.find((item) => item.category === category)?.total || 0;

  const budgeted = spendingCategories.filter((category) => (budgets[category] || 0) > 0);
  const totalLimit = budgeted.reduce((sum, category) => sum + budgets[category], 0);
  const totalSpent = budgeted.reduce((sum, category) => sum + spentIn(category), 0);
  const left = totalLimit - totalSpent;
  const gaugePercent = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;

  return (
    <div className="split">
      <div className="split-side">
        <section className="card gauge-card o-1">
          <Gauge percent={gaugePercent} over={left < 0} />
          <div className="gauge-text">
            {totalLimit > 0 ? (
              <>
                <span>{left < 0 ? "Over budget by" : "Left to spend"}</span>
                <strong className={left < 0 ? "negative" : ""}>
                  {formatMoney(Math.abs(left))}
                </strong>
                <span>
                  {formatMoney(totalSpent)} of {formatMoney(totalLimit)} budgeted
                </span>
              </>
            ) : (
              <>
                <span>No limits set yet</span>
                <strong>{formatMoney(0)}</strong>
                <span>Add a monthly limit to any category</span>
              </>
            )}
          </div>
        </section>

        <section className="card o-3">
          <div className="card-head">
            <h2>Goals</h2>
            <span>Monthly targets</span>
          </div>

          <div className="row-list spaced">
            {goalCategories.map((category) => {
              const spent = spentIn(category);
              const target = budgets[category] || 0;
              const percent = target > 0 ? Math.min((spent / target) * 100, 100) : 0;
              const complete = target > 0 && spent >= target;

              return (
                <div className="budget-row" key={category}>
                  <div className="row-main">
                    <CategoryIcon category={category} />
                    <div className="row-text">
                      <strong>{category}</strong>
                      <span>
                        {formatMoney(spent)} {category === "Investing" ? "invested" : "saved"}
                        {target > 0 && ` of ${formatMoney(target)}`}
                      </span>
                    </div>
                    <LimitInput
                      category={category}
                      value={target}
                      placeholder="Goal"
                      updateBudget={updateBudget}
                    />
                  </div>

                  <div
                    className="bar"
                    style={{ "--c": categoryStyle(category).color } as CSSProperties}
                  >
                    <div className="bar-fill" style={{ width: `${percent}%` }} />
                  </div>

                  {target > 0 && (
                    <p className={complete ? "row-note positive" : "row-note"}>
                      {complete
                        ? "Goal reached 🎉"
                        : `${formatMoney(target - spent)} left to reach your goal`}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="split-main">
        <section className="card o-2">
          <div className="card-head">
            <h2>Spending limits</h2>
            <span>Per month</span>
          </div>

          <div className="row-list spaced">
            {spendingCategories.map((category) => {
              const spent = spentIn(category);
              const limit = budgets[category] || 0;
              const percent = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
              const over = limit > 0 && spent > limit;

              return (
                <div className="budget-row" key={category}>
                  <div className="row-main">
                    <CategoryIcon category={category} />
                    <div className="row-text">
                      <strong>{category}</strong>
                      <span>
                        {formatMoney(spent)} spent
                        {limit > 0 && ` of ${formatMoney(limit)}`}
                      </span>
                    </div>
                    <LimitInput
                      category={category}
                      value={limit}
                      placeholder="Limit"
                      updateBudget={updateBudget}
                    />
                  </div>

                  <div
                    className="bar"
                    style={
                      { "--c": over ? "var(--negative)" : categoryStyle(category).color } as CSSProperties
                    }
                  >
                    <div className="bar-fill" style={{ width: `${percent}%` }} />
                  </div>

                  {over ? (
                    <p className="row-note negative">
                      Over budget by {formatMoney(spent - limit)}
                    </p>
                  ) : (
                    limit > 0 && <p className="row-note">{formatMoney(limit - spent)} left</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

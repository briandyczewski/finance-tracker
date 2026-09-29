import { categories } from "@/lib/finance";

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

export default function BudgetPanel({
  budgets,
  updateBudget,
  categoryTotals,
  savingsThisMonth,
  investingThisMonth,
}: BudgetPanelProps) {
  return (
    <section className="card">
      <div className="section-heading">
        <h2>Budgets & Goals</h2>

        <span>Monthly limits</span>
      </div>

      <div className="budget-list">
        {categories
          .filter(
            (category) =>
              category !== "Subscriptions"
          )
          .map((category) => {
            const spent =
              category === "Savings"
                ? savingsThisMonth
                : category === "Investing"
                  ? investingThisMonth
                  : categoryTotals.find(
                (item) =>
                  item.category === category
              )?.total || 0;

            const target =
              budgets[category] || 0;

            const percentage =
              target > 0
                ? Math.min(
                    (spent / target) * 100,
                    100
                  )
                : 0;

            const isGoal =
              goalCategories.includes(
                category
              );

            const isOverBudget =
              !isGoal &&
              target > 0 &&
              spent > target;

            const isGoalComplete =
              isGoal &&
              target > 0 &&
              spent >= target;

            return (
              <div
                className="budget-card"
                key={category}
              >
                <div className="budget-top">
                  <div>
                    <h3>
                      {category}{" "}
                      <span
                        className={
                          isGoal
                            ? "goal-pill"
                            : "budget-pill"
                        }
                      >
                        {isGoal
                          ? "Goal"
                          : "Budget"}
                      </span>
                    </h3>

                    <p>
                      ${spent.toFixed(2)}{" "}
                      {isGoal
                        ? category === "Investing"
                          ? "invested"
                          : "saved"
                        : "spent"}

                      {target > 0 &&
                        ` of $${target.toFixed(
                          2
                        )}`}
                    </p>
                  </div>

                  <input
                    value={target || ""}
                    onChange={(e) =>
                      updateBudget(
                        category,
                        Number(e.target.value)
                      )
                    }
                    placeholder={
                      isGoal
                        ? "Goal"
                        : "Limit"
                    }
                    type="number"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="budget-progress-bg">
                  <div
                    className={
                      isGoal
                        ? "budget-progress-fill goal"
                        : isOverBudget
                          ? "budget-progress-fill over"
                          : "budget-progress-fill"
                    }
                    style={{
                      width: `${percentage}%`,
                    }}
                  />
                </div>

                {!isGoal &&
                  isOverBudget && (
                    <p className="budget-warning">
                      Over budget by $
                      {(
                        spent - target
                      ).toFixed(2)}
                    </p>
                  )}

                {isGoal &&
                  target > 0 &&
                  !isGoalComplete && (
                    <p className="goal-message">
                      $
                      {(
                        target - spent
                      ).toFixed(2)}{" "}
                      left to reach your goal
                    </p>
                  )}

                {isGoal &&
                  isGoalComplete && (
                    <p className="goal-complete">
                      Goal reached 🎉
                    </p>
                  )}
              </div>
            );
          })}
      </div>
    </section>
  );
}
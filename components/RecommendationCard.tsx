type RecommendationCardProps = {
  income: number;
  expenses: number;
  savedThisMonth: number;
  investedThisMonth: number;
};

function Progress({
  target,
  contributed,
  verb,
}: {
  target: number;
  contributed: number;
  verb: "save" | "invest";
}) {
  const remaining = target - contributed;

  return (
    <div className="target-progress">
      <span>${contributed.toFixed(2)} contributed</span>
      {target > 0 &&
        (remaining > 0 ? (
          <span>
            You still need to {verb} ${remaining.toFixed(2)}
          </span>
        ) : (
          <span>Target reached 🎉</span>
        ))}
    </div>
  );
}

export default function RecommendationCard({
  income,
  expenses,
  savedThisMonth,
  investedThisMonth,
}: RecommendationCardProps) {
  const recommendedSavings = income * 0.2;

  const recommendedInvesting = income * 0.1;

  const safeSpendingLeft =
    income -
    expenses -
    recommendedSavings -
    recommendedInvesting;

  return (
    <section className="card">
      <div className="section-heading">
        <h2>Money Plan</h2>
        <span>Suggested targets</span>
      </div>

      <div className="recommendation-grid">
        <div className="recommendation-card green-card">
          <p>Save</p>

          <strong>
            ${recommendedSavings.toFixed(2)}
          </strong>

          <Progress
            target={recommendedSavings}
            contributed={savedThisMonth}
            verb="save"
          />
        </div>

        <div className="recommendation-card blue-card">
          <p>Invest</p>

          <strong>
            ${recommendedInvesting.toFixed(2)}
          </strong>

          <Progress
            target={recommendedInvesting}
            contributed={investedThisMonth}
            verb="invest"
          />
        </div>

        <div className="recommendation-card dark-card">
          <p>Safe Spending Left</p>

          <strong>
            ${safeSpendingLeft.toFixed(2)}
          </strong>
        </div>
      </div>
    </section>
  );
}
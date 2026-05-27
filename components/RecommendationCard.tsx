type RecommendationCardProps = {
  income: number;
  expenses: number;
};

export default function RecommendationCard({
  income,
  expenses,
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
        </div>

        <div className="recommendation-card blue-card">
          <p>Invest</p>

          <strong>
            ${recommendedInvesting.toFixed(2)}
          </strong>
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
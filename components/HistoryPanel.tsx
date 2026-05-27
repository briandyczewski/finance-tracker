type MonthSummary = {
  month: string;
  income: number;
  expenses: number;
};

type HistoryPanelProps = {
  monthSummaries: MonthSummary[];
};

export default function HistoryPanel({
  monthSummaries,
}: HistoryPanelProps) {
  return (
    <section className="card">
      <div className="section-heading">
        <h2>Past Months</h2>
        <span>Last 12 months</span>
      </div>

      <div className="month-list">
        {monthSummaries.map((month) => (
          <article className="month-card" key={month.month}>
            <h3>{month.month}</h3>

            <div className="month-row">
              <span>Income</span>

              <strong className="positive">
                ${month.income.toFixed(2)}
              </strong>
            </div>

            <div className="month-row">
              <span>Expenses</span>

              <strong className="negative">
                ${month.expenses.toFixed(2)}
              </strong>
            </div>

            <div className="month-row total">
              <span>Left Over</span>

              <strong>
                ${(month.income - month.expenses).toFixed(2)}
              </strong>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
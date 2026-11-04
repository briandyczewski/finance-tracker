import { formatMoney, formatMonthLabel } from "@/lib/finance";

type MonthSummary = {
  month: string;
  income: number;
  expenses: number;
};

type HistoryPanelProps = {
  monthSummaries: MonthSummary[];
};

export default function HistoryPanel({ monthSummaries }: HistoryPanelProps) {
  return (
    <section className="card">
      <div className="card-head">
        <h2>Past months</h2>
        <span>Last 12 months</span>
      </div>

      <div className="table">
        <div className="table-row table-head">
          <span>Month</span>
          <span>Income</span>
          <span>Spent</span>
          <span>Left over</span>
        </div>

        {monthSummaries.map((month) => {
          const leftOver = month.income - month.expenses;
          return (
            <div className="table-row" key={month.month}>
              <span>{formatMonthLabel(month.month)}</span>
              <span className="positive">{formatMoney(month.income)}</span>
              <span>{formatMoney(month.expenses)}</span>
              <strong className={leftOver < 0 ? "negative" : "positive"}>
                {formatMoney(leftOver)}
              </strong>
            </div>
          );
        })}
      </div>
    </section>
  );
}

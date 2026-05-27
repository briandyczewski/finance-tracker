type BalanceCardProps = {
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  income: number;
  expenses: number;
  balance: number;
};

export default function BalanceCard({
  selectedMonth,
  setSelectedMonth,
  income,
  expenses,
  balance,
}: BalanceCardProps) {
  return (
    <section className="balance-card">
      <div className="balance-card-top">
        <div>
          <p className="muted-light">Monthly Balance</p>
          <h2>${balance.toFixed(2)}</h2>
        </div>

        <input
          className="month-picker"
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
        />
      </div>

      <div className="summary-grid">
        <div className="summary-tile">
          <span>Income</span>
          <strong className="positive">${income.toFixed(2)}</strong>
        </div>

        <div className="summary-tile">
          <span>Expenses</span>
          <strong className="negative">${expenses.toFixed(2)}</strong>
        </div>
      </div>
    </section>
  );
}
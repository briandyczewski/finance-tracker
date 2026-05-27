import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type MonthSummary = {
  month: string;
  income: number;
  expenses: number;
};

type TrendChartProps = {
  monthSummaries: MonthSummary[];
};

export default function TrendChart({ monthSummaries }: TrendChartProps) {
  const chartData = [...monthSummaries]
    .reverse()
    .map((month) => ({
      month: month.month.slice(5),
      Income: month.income,
      Expenses: month.expenses,
      Balance: month.income - month.expenses,
    }));

  return (
    <section className="card">
      <div className="section-heading">
        <h2>Monthly Trends</h2>
        <span>Last 12 months</span>
      </div>

      <div className="trend-chart">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData}>
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />

            <Line type="monotone" dataKey="Income" stroke="#12b76a" strokeWidth={3} />
            <Line type="monotone" dataKey="Expenses" stroke="#f04438" strokeWidth={3} />
            <Line type="monotone" dataKey="Balance" stroke="#2563eb" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
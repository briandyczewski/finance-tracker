"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney, formatMoneyShort, formatMonthLabel } from "@/lib/finance";

type MonthSummary = {
  month: string;
  income: number;
  expenses: number;
};

type TrendChartProps = {
  monthSummaries: MonthSummary[];
};

const INCOME_COLOR = "#16a34a";
const SPENT_COLOR = "#f97316";

export default function TrendChart({ monthSummaries }: TrendChartProps) {
  const chartData = [...monthSummaries].reverse().map((month) => ({
    month: formatMonthLabel(month.month).split(" ")[0],
    Income: month.income,
    Expenses: month.expenses,
    Balance: month.income - month.expenses,
  }));

  return (
    <section className="card">
      <div className="card-head">
        <h2>Monthly trends</h2>
        <span>Last 12 months</span>
      </div>

      <div className="chart-box">
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 0, bottom: 0, left: -8 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--text-3)", fontSize: 11 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--text-3)", fontSize: 11 }}
              tickFormatter={formatMoneyShort}
              width={48}
            />
            <Tooltip
              cursor={{ fill: "var(--surface-2)" }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <div className="chart-tooltip">
                    <strong>{label}</strong>
                    {payload.map((item) => (
                      <span key={String(item.dataKey)}>
                        <i className="dot" style={{ background: item.color }} />
                        {item.name}: {formatMoney(Number(item.value))}
                      </span>
                    ))}
                  </div>
                ) : null
              }
            />
            <Bar dataKey="Income" fill={INCOME_COLOR} radius={[5, 5, 0, 0]} maxBarSize={16} />
            <Bar dataKey="Expenses" fill={SPENT_COLOR} radius={[5, 5, 0, 0]} maxBarSize={16} />
            <Line
              type="monotone"
              dataKey="Balance"
              stroke="var(--accent)"
              strokeWidth={2.5}
              dot={{ r: 3, strokeWidth: 0, fill: "var(--accent)" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-key">
        <span><i className="dot" style={{ background: INCOME_COLOR }} />Income</span>
        <span><i className="dot" style={{ background: SPENT_COLOR }} />Expenses</span>
        <span><i className="dot accent" />Balance</span>
      </div>
    </section>
  );
}

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type CategoryTotal = {
  category: string;
  total: number;
};

type SpendingChartProps = {
  categoryTotals: CategoryTotal[];
  expenses: number;
};

const chartColors = [
  "#2563eb",
  "#14b8a6",
  "#f97316",
  "#a855f7",
  "#ef4444",
  "#22c55e",
  "#64748b",
  "#0f172a",
];

export default function SpendingChart({
  categoryTotals,
  expenses,
}: SpendingChartProps) {
  const pieData = categoryTotals.filter((item) => item.total > 0);

  return (
    <section className="card">
      <div className="section-heading">
        <h2>Spending by Category</h2>
        <span>${expenses.toFixed(2)} total</span>
      </div>

      {pieData.length > 0 ? (
        <>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="total"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={92}
                  paddingAngle={4}
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={entry.category}
                      fill={chartColors[index % chartColors.length]}
                    />
                  ))}
                </Pie>

                <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="legend-list">
            {pieData.map((item, index) => (
              <div className="legend-row" key={item.category}>
                <div>
                  <span
                    className="legend-dot"
                    style={{
                      backgroundColor: chartColors[index % chartColors.length],
                    }}
                  />
                  <span>{item.category}</span>
                </div>

                <strong>${item.total.toFixed(2)}</strong>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="empty-state">No expenses for this month yet.</p>
      )}
    </section>
  );
}
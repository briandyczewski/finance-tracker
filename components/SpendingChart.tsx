"use client";

import type { CSSProperties } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import CategoryIcon from "@/components/CategoryIcon";
import { categoryStyle } from "@/lib/categories";
import { formatMoney } from "@/lib/finance";

type CategoryTotal = {
  category: string;
  total: number;
};

type SpendingChartProps = {
  categoryTotals: CategoryTotal[];
  expenses: number;
};

export default function SpendingChart({ categoryTotals, expenses }: SpendingChartProps) {
  const pieData = categoryTotals
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total);

  return (
    <section className="card">
      <div className="card-head">
        <h2>Spending by category</h2>
        <span>{formatMoney(expenses)} total</span>
      </div>

      {pieData.length > 0 ? (
        <div className="breakdown">
          <div className="donut">
            <ResponsiveContainer width="100%" height={196}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="total"
                  nameKey="category"
                  innerRadius={66}
                  outerRadius={92}
                  paddingAngle={2}
                  cornerRadius={4}
                  stroke="none"
                >
                  {pieData.map((item) => (
                    <Cell key={item.category} fill={categoryStyle(item.category).color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <div className="chart-tooltip">
                        <strong>{payload[0].name}</strong>
                        <span>{formatMoney(Number(payload[0].value))}</span>
                      </div>
                    ) : null
                  }
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center">
              <span>Total</span>
              <strong>{formatMoney(expenses)}</strong>
            </div>
          </div>

          <div className="row-list">
            {pieData.map((item) => {
              const share = expenses > 0 ? (item.total / expenses) * 100 : 0;
              return (
                <div className="list-row stacked" key={item.category}>
                  <CategoryIcon category={item.category} size="sm" />
                  <div className="row-text">
                    <div className="row-line">
                      <strong>{item.category}</strong>
                      <strong className="row-value">{formatMoney(item.total)}</strong>
                    </div>
                    <div className="row-line">
                      <div
                        className="bar thin"
                        style={{ "--c": categoryStyle(item.category).color } as CSSProperties}
                      >
                        <div className="bar-fill" style={{ width: `${share}%` }} />
                      </div>
                      <span className="pct">{Math.round(share)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="empty-state">No expenses for this month yet.</p>
      )}
    </section>
  );
}

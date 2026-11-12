"use client";

import { useMemo } from "react";
import {
  Area,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import {
  Subscription,
  Transaction,
  cumulativeSpending,
  formatMoney,
  formatMonthLong,
  shiftMonth,
} from "@/lib/finance";

type BalanceCardProps = {
  month: string;
  today: string;
  income: number;
  expenses: number;
  savedOrInvested: number;
  balance: number;
  transactions: Transaction[];
  subscriptions: Subscription[];
};

type Point = { day: number; thisMonth: number | null; lastMonth: number | null };

function monthName(month: string) {
  return formatMonthLong(month).split(" ")[0];
}

export default function BalanceCard({
  month,
  today,
  income,
  expenses,
  savedOrInvested,
  balance,
  transactions,
  subscriptions,
}: BalanceCardProps) {
  const previousMonth = shiftMonth(month, -1);
  const isCurrentMonth = today.startsWith(month);
  const todayDay = Number(today.slice(8, 10));

  const thisMonth = useMemo(
    () => cumulativeSpending(transactions, subscriptions, month),
    [transactions, subscriptions, month]
  );
  const lastMonth = useMemo(
    () => cumulativeSpending(transactions, subscriptions, previousMonth),
    [transactions, subscriptions, previousMonth]
  );

  // Draw this month's line only up to today.
  const lastDrawnDay = isCurrentMonth ? todayDay : thisMonth.length;
  const totalDays = thisMonth.length;

  const data: Point[] = Array.from({ length: totalDays }, (_, index) => ({
    day: index + 1,
    thisMonth: index < Math.min(thisMonth.length, lastDrawnDay) ? thisMonth[index] : null,
    lastMonth: index < lastMonth.length ? lastMonth[index] : null,
  }));

  // Compare with the same point last month (or the full month for past months).
  const compareDay = Math.min(lastDrawnDay, thisMonth.length);
  const spentSoFar = thisMonth[compareDay - 1] ?? 0;
  const lastMonthSoFar = lastMonth[Math.min(compareDay, lastMonth.length) - 1] ?? 0;
  const difference = spentSoFar - lastMonthSoFar;
  const lastName = monthName(previousMonth);
  const ticks = [1, 8, 15, 22, totalDays];

  return (
    <section className="card hero-card">
      <p className="hero-label">Spent in {monthName(month)}</p>
      <p className="hero-amount">{formatMoney(expenses)}</p>

      {savedOrInvested > 0 ? (
        <p className="hero-sub">
          <span className="positive">{formatMoney(savedOrInvested)}</span> of that was saved or
          invested, so <strong>{formatMoney(expenses - savedOrInvested)}</strong> was actually spent
        </p>
      ) : null}

      {lastMonthSoFar > 0 || spentSoFar > 0 ? (
        <p className={difference > 0 ? "trend-chip up" : "trend-chip down"}>
          {difference > 0 ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
          {formatMoney(Math.abs(difference))} {difference > 0 ? "more" : "less"} than{" "}
          {isCurrentMonth ? `this time in ${lastName}` : lastName}
        </p>
      ) : (
        <p className="trend-chip">No spending yet</p>
      )}

      <div className="hero-chart">
        <ResponsiveContainer width="100%" height={168}>
          <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="day"
              ticks={ticks}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--text-3)", fontSize: 11 }}
              tickFormatter={(day) => `${monthName(month).slice(0, 3)} ${day}`}
              interval={0}
              padding={{ left: 18, right: 18 }}
            />
            <YAxis hide domain={[0, "dataMax"]} />
            <Tooltip
              cursor={{ stroke: "var(--border-strong)", strokeDasharray: "3 3" }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0].payload as Point;
                return (
                  <div className="chart-tooltip">
                    <strong>Day {label}</strong>
                    {point.thisMonth !== null && (
                      <span>
                        <i className="dot accent" />
                        {monthName(month)}: {formatMoney(point.thisMonth)}
                      </span>
                    )}
                    {point.lastMonth !== null && (
                      <span>
                        <i className="dot muted" />
                        {lastName}: {formatMoney(point.lastMonth)}
                      </span>
                    )}
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="lastMonth"
              stroke="var(--text-3)"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              activeDot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="thisMonth"
              stroke="var(--accent)"
              strokeWidth={3}
              fill="url(#spendFill)"
              dot={false}
              activeDot={{ r: 5, strokeWidth: 0, fill: "var(--accent)" }}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-key">
        <span><i className="dot accent" />{monthName(month)}</span>
        <span><i className="dot muted" />{lastName}</span>
      </div>

      <div className="stat-row">
        <div className="stat">
          <span>Income</span>
          <strong className="positive">{formatMoney(income)}</strong>
        </div>
        <div className="stat">
          <span>Spent</span>
          <strong>{formatMoney(expenses)}</strong>
        </div>
        <div className="stat">
          <span>Left over</span>
          <strong className={balance < 0 ? "negative" : "positive"}>
            {formatMoney(balance)}
          </strong>
        </div>
      </div>
    </section>
  );
}

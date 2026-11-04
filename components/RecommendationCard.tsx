import type { CSSProperties } from "react";
import { PiggyBank, ShieldCheck, TrendingUp, type LucideIcon } from "lucide-react";
import CategoryIcon from "@/components/CategoryIcon";
import { formatMoney } from "@/lib/finance";

type RecommendationCardProps = {
  income: number;
  expenses: number;
  savedThisMonth: number;
  investedThisMonth: number;
};

function PlanRow({
  icon,
  color,
  label,
  target,
  contributed,
  verb,
}: {
  icon: LucideIcon;
  color: string;
  label: string;
  target: number;
  contributed: number;
  verb: "save" | "invest";
}) {
  const remaining = target - contributed;
  const percent = target > 0 ? Math.min((contributed / target) * 100, 100) : 0;

  return (
    <div className="plan-row">
      <div className="row-main">
        <CategoryIcon icon={icon} color={color} />
        <div className="row-text">
          <strong>{label}</strong>
          <span>
            {target <= 0
              ? `${formatMoney(contributed)} contributed`
              : remaining > 0
                ? `You still need to ${verb} ${formatMoney(remaining)}`
                : "Target reached 🎉"}
          </span>
        </div>
        <div className="row-amount">
          <strong>{formatMoney(target)}</strong>
          <span>{formatMoney(contributed)} in</span>
        </div>
      </div>

      <div className="bar" style={{ "--c": color } as CSSProperties}>
        <div className="bar-fill" style={{ width: `${percent}%` }} />
      </div>
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
  const safeSpendingLeft = income - expenses - recommendedSavings - recommendedInvesting;

  return (
    <section className="card">
      <div className="card-head">
        <h2>Money plan</h2>
        <span>Suggested targets</span>
      </div>

      <div className="plan-list">
        <PlanRow
          icon={PiggyBank}
          color="#16a34a"
          label="Save 20%"
          target={recommendedSavings}
          contributed={savedThisMonth}
          verb="save"
        />
        <PlanRow
          icon={TrendingUp}
          color="#2f80ed"
          label="Invest 10%"
          target={recommendedInvesting}
          contributed={investedThisMonth}
          verb="invest"
        />
      </div>

      <div className={safeSpendingLeft < 0 ? "safe-box over" : "safe-box"}>
        <ShieldCheck size={20} />
        <div>
          <span>Safe spending left</span>
          <strong>{formatMoney(safeSpendingLeft)}</strong>
        </div>
      </div>
    </section>
  );
}

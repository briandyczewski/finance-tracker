import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { formatMonthLong, shiftMonth } from "@/lib/finance";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  month?: string;
  currentMonth: string;
  setMonth?: (month: string) => void;
  actionLabel?: string;
  onAction?: () => void;
};

export default function PageHeader({
  eyebrow,
  title,
  month,
  currentMonth,
  setMonth,
  actionLabel,
  onAction,
}: PageHeaderProps) {
  return (
    <div className="page-header">
      <div className="page-title">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
      </div>

      <div className="page-controls">
        {month && setMonth && (
          <div className="month-switch">
            <button
              type="button"
              className="month-step"
              onClick={() => setMonth(shiftMonth(month, -1))}
              aria-label="Previous month"
            >
              <ChevronLeft size={18} />
            </button>

            <span className="month-label">{formatMonthLong(month)}</span>

            <button
              type="button"
              className="month-step"
              onClick={() => setMonth(shiftMonth(month, 1))}
              aria-label="Next month"
            >
              <ChevronRight size={18} />
            </button>

            {month !== currentMonth && (
              <button
                type="button"
                className="month-today"
                onClick={() => setMonth(currentMonth)}
              >
                Today
              </button>
            )}
          </div>
        )}

        {actionLabel && onAction && (
          <button type="button" className="action-button" onClick={onAction}>
            <Plus size={17} strokeWidth={2.6} />
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

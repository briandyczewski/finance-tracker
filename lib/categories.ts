import {
  Banknote,
  Fuel,
  House,
  PiggyBank,
  Receipt,
  Repeat,
  Shapes,
  Ticket,
  TrendingUp,
  Utensils,
  type LucideIcon,
} from "lucide-react";

type CategoryStyle = { Icon: LucideIcon; color: string };

const styles: Record<string, CategoryStyle> = {
  Rent: { Icon: House, color: "#6366f1" },
  Bills: { Icon: Receipt, color: "#f59e0b" },
  Food: { Icon: Utensils, color: "#f97316" },
  Gas: { Icon: Fuel, color: "#ef4444" },
  Fun: { Icon: Ticket, color: "#ec4899" },
  Savings: { Icon: PiggyBank, color: "#16a34a" },
  Investing: { Icon: TrendingUp, color: "#2f80ed" },
  Subscriptions: { Icon: Repeat, color: "#8b5cf6" },
  Other: { Icon: Shapes, color: "#64748b" },
  Income: { Icon: Banknote, color: "#16a34a" },
};

export function categoryStyle(category: string): CategoryStyle {
  return styles[category] ?? styles.Other;
}

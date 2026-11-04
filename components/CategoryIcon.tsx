import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import { categoryStyle } from "@/lib/categories";

type CategoryIconProps = {
  category?: string;
  // Override the category look (used for subscriptions and savings rows)
  icon?: LucideIcon;
  color?: string;
  letter?: string;
  size?: "sm" | "md";
};

export default function CategoryIcon({
  category = "Other",
  icon,
  color,
  letter,
  size = "md",
}: CategoryIconProps) {
  const style = categoryStyle(category);
  const Icon = icon ?? style.Icon;

  return (
    <span
      className={`cat-icon cat-icon-${size}`}
      style={{ "--c": color ?? style.color } as CSSProperties}
      aria-hidden="true"
    >
      {letter ? letter : <Icon size={size === "sm" ? 15 : 18} strokeWidth={2.2} />}
    </span>
  );
}

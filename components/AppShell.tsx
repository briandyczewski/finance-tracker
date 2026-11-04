import type { ReactNode } from "react";
import {
  CalendarClock,
  ChartColumn,
  LayoutDashboard,
  LogOut,
  Moon,
  PiggyBank,
  Sun,
  Target,
  Wallet,
} from "lucide-react";

export type Tab = "dashboard" | "budgets" | "savings" | "subscriptions" | "history";

const navItems: { tab: Tab; label: string; Icon: typeof LayoutDashboard }[] = [
  { tab: "dashboard", label: "Home", Icon: LayoutDashboard },
  { tab: "budgets", label: "Budgets", Icon: Target },
  { tab: "savings", label: "Savings", Icon: PiggyBank },
  { tab: "subscriptions", label: "Recurring", Icon: CalendarClock },
  { tab: "history", label: "History", Icon: ChartColumn },
];

type AppShellProps = {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onSignOut: () => void;
  children: ReactNode;
};

function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">
        <Wallet size={18} strokeWidth={2.4} />
      </span>
      <span className="brand-name">Finance Tracker</span>
    </div>
  );
}

export default function AppShell({
  activeTab,
  setActiveTab,
  darkMode,
  onToggleDarkMode,
  onSignOut,
  children,
}: AppShellProps) {
  const ThemeIcon = darkMode ? Sun : Moon;
  const themeLabel = darkMode ? "Light mode" : "Dark mode";

  return (
    <div className="shell">
      {/* Desktop sidebar */}
      <aside className="sidebar">
        <Brand />

        <nav className="side-nav" aria-label="Main">
          {navItems.map(({ tab, label, Icon }) => (
            <button
              key={tab}
              type="button"
              className={activeTab === tab ? "side-link active" : "side-link"}
              aria-current={activeTab === tab ? "page" : undefined}
              onClick={() => setActiveTab(tab)}
            >
              <Icon size={19} strokeWidth={2.1} />
              {label}
            </button>
          ))}
        </nav>

        <div className="side-footer">
          <button type="button" className="side-link" onClick={onToggleDarkMode}>
            <ThemeIcon size={19} strokeWidth={2.1} />
            {themeLabel}
          </button>
          <button type="button" className="side-link" onClick={onSignOut}>
            <LogOut size={19} strokeWidth={2.1} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Phone top bar */}
      <header className="topbar">
        <Brand />
        <div className="topbar-actions">
          <button
            type="button"
            className="icon-button"
            onClick={onToggleDarkMode}
            aria-label={themeLabel}
            title={themeLabel}
          >
            <ThemeIcon size={19} />
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={onSignOut}
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={19} />
          </button>
        </div>
      </header>

      <main className="main">{children}</main>

      {/* Phone tab bar */}
      <nav className="bottom-nav" aria-label="Main">
        {navItems.map(({ tab, label, Icon }) => (
          <button
            key={tab}
            type="button"
            className={activeTab === tab ? "bottom-link active" : "bottom-link"}
            aria-current={activeTab === tab ? "page" : undefined}
            onClick={() => setActiveTab(tab)}
          >
            <Icon size={21} strokeWidth={activeTab === tab ? 2.4 : 2} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

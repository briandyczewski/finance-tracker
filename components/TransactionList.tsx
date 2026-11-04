import { Trash } from "lucide-react";
import CategoryIcon from "@/components/CategoryIcon";
import { Transaction, formatMoney, formatShortDate } from "@/lib/finance";
import { supabase } from "@/lib/supabase";

type TransactionListProps = {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  today: string;
};

function dayLabel(date: string, today: string) {
  const yesterday = new Date(today + "T00:00:00");
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayText = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

  if (date === today) return "Today";
  if (date === yesterdayText) return "Yesterday";

  const weekday = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
  });
  return `${weekday}, ${formatShortDate(date)}`;
}

export default function TransactionList({
  transactions,
  setTransactions,
  today,
}: TransactionListProps) {
  async function deleteTransaction(id: number) {
    const { error } = await supabase.from("transactions").delete().eq("id", id);

    if (error) {
      console.error("Error deleting transaction:", error);
      alert("Transaction could not be deleted.");
      return;
    }

    setTransactions((current) => current.filter((transaction) => transaction.id !== id));
  }

  // Newest day first, grouped by date.
  const sorted = [...transactions].sort(
    (a, b) => b.date.localeCompare(a.date) || b.id - a.id
  );
  const groups: { date: string; items: Transaction[] }[] = [];
  for (const transaction of sorted) {
    const last = groups[groups.length - 1];
    if (last && last.date === transaction.date) last.items.push(transaction);
    else groups.push({ date: transaction.date, items: [transaction] });
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2>Transactions</h2>
        <span>{transactions.length} this month</span>
      </div>

      {groups.length === 0 && <p className="empty-state">No transactions this month yet.</p>}

      {groups.map((group) => (
        <div className="tx-group" key={group.date}>
          <p className="group-label">{dayLabel(group.date, today)}</p>

          <div className="row-list">
            {group.items.map((transaction) => {
              const isIncome = transaction.type === "income";
              return (
                <div className="list-row" key={transaction.id}>
                  <CategoryIcon category={isIncome ? "Income" : transaction.category} />
                  <div className="row-text">
                    <strong>{transaction.name}</strong>
                    <span>{transaction.category}</span>
                  </div>
                  <strong className={isIncome ? "row-value positive" : "row-value"}>
                    {isIncome ? "+" : ""}
                    {formatMoney(transaction.amount)}
                  </strong>
                  <button
                    type="button"
                    className="row-delete"
                    onClick={() => deleteTransaction(transaction.id)}
                    aria-label={`Delete ${transaction.name}`}
                    title="Delete"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}

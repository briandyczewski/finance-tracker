import { Transaction } from "@/app/page";
import { supabase } from "@/lib/supabase";

type TransactionListProps = {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
};

export default function TransactionList({
  transactions,
  setTransactions,
}: TransactionListProps) {
  async function deleteTransaction(id: string) {
    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting transaction:", error);
      alert("Transaction could not be deleted.");
      return;
    }

    setTransactions((current) =>
      current.filter((transaction) => transaction.id !== id)
    );
  }

  return (
    <section className="card">
      <div className="section-heading">
        <h2>Transactions</h2>
        <span>{transactions.length} this month</span>
      </div>

      <div className="transaction-list">
        {transactions.map((transaction) => (
          <article className="transaction-card" key={transaction.id}>
            <div>
              <h3>{transaction.name}</h3>
              <p>
                {transaction.date} • {transaction.category}
              </p>
            </div>

            <div className="transaction-actions">
              <strong
                className={
                  transaction.type === "income" ? "positive" : "negative"
                }
              >
                {transaction.type === "income" ? "+" : "-"}$
                {transaction.amount.toFixed(2)}
              </strong>

              <button
                type="button"
                className="delete-button"
                onClick={() => deleteTransaction(transaction.id)}
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
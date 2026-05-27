import { FormEvent, useState } from "react";
import { categories, getToday, Transaction, TransactionType } from "@/app/page";

type TransactionFormProps = {
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
};

export default function TransactionForm({ setTransactions }: TransactionFormProps) {
  const today = getToday();

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<TransactionType>("expense");
  const [category, setCategory] = useState("Food");
  const [date, setDate] = useState(today);

  function addTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const numericAmount = Number(amount);
    if (!name.trim() || !date || !numericAmount || numericAmount <= 0) return;

    const newTransaction: Transaction = {
      id: Date.now(),
      type,
      name: name.trim(),
      amount: numericAmount,
      category: type === "income" ? "Income" : category,
      date,
    };

    setTransactions((current) => [newTransaction, ...current]);

    setName("");
    setAmount("");
    setType("expense");
    setCategory("Food");
    setDate(today);
  }

  return (
    <form className="card" onSubmit={addTransaction}>
      <div className="section-heading">
        <h2>Add Transaction</h2>
        <span>Quick entry</span>
      </div>

      <label>
        <span>Name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Rent, paycheck, Chipotle"
        />
      </label>

      <label>
        <span>Amount</span>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          type="number"
          min="0"
          step="0.01"
        />
      </label>

      <label>
        <span>Date</span>
        <input value={date} onChange={(e) => setDate(e.target.value)} type="date" />
      </label>

      <div className="input-grid">
        <label>
          <span>Type</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TransactionType)}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </label>

        <label>
          <span>Category</span>
          {type === "expense" ? (
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories
                .filter((cat) => cat !== "Subscriptions")
                .map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
            </select>
          ) : (
            <input value="Income" disabled />
          )}
        </label>
      </div>

      <button className="primary-button" type="submit">
        Add Transaction
      </button>
    </form>
  );
}
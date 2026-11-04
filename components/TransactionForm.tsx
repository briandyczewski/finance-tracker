import { FormEvent, useState } from "react";
import CategoryIcon from "@/components/CategoryIcon";
import { categories, getToday, Transaction, TransactionType } from "@/lib/finance";
import { supabase } from "@/lib/supabase";

type TransactionFormProps = {
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  onDone: () => void;
};

export default function TransactionForm({ setTransactions, onDone }: TransactionFormProps) {
  const today = getToday();

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<TransactionType>("expense");
  const [category, setCategory] = useState("Food");
  const [date, setDate] = useState(today);
  const [saving, setSaving] = useState(false);

  async function addTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const numericAmount = Number(amount);
    if (!name.trim() || !date || !numericAmount || numericAmount <= 0 || saving) return;

    setSaving(true);
    const { data, error } = await supabase
      .from("transactions")
      .insert({
        name: name.trim(),
        amount: numericAmount,
        type,
        category: type === "income" ? "Income" : category,
        date,
      })
      .select()
      .single();
    setSaving(false);

    if (error) {
      console.error("Error saving transaction:", error);
      alert("Transaction could not be saved.");
      return;
    }

    setTransactions((current) => [
      {
        id: Number(data.id),
        type: data.type,
        name: data.name,
        amount: Number(data.amount),
        category: data.category,
        date: data.date,
      },
      ...current,
    ]);

    onDone();
  }

  return (
    <form className="form" onSubmit={addTransaction}>
      <div className="segmented" role="radiogroup" aria-label="Type">
        {(["expense", "income"] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={type === option}
            className={type === option ? "active" : ""}
            onClick={() => setType(option)}
          >
            {option === "expense" ? "Expense" : "Income"}
          </button>
        ))}
      </div>

      <label className="field amount-field">
        <span>Amount</span>
        <div className="money-input big">
          <span>$</span>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.00"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            required
            autoFocus
          />
        </div>
      </label>

      <label className="field">
        <span>Name</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={type === "income" ? "Ex: Paycheck" : "Ex: Rent, Chipotle, gas"}
          required
        />
      </label>

      {type === "expense" && (
        <div className="field">
          <span>Category</span>
          <div className="chip-grid" role="radiogroup" aria-label="Category">
            {categories
              .filter((cat) => cat !== "Subscriptions")
              .map((cat) => (
                <button
                  key={cat}
                  type="button"
                  role="radio"
                  aria-checked={category === cat}
                  className={category === cat ? "chip active" : "chip"}
                  onClick={() => setCategory(cat)}
                >
                  <CategoryIcon category={cat} size="sm" />
                  {cat}
                </button>
              ))}
          </div>
        </div>
      )}

      <label className="field">
        <span>Date</span>
        <input value={date} onChange={(event) => setDate(event.target.value)} type="date" required />
      </label>

      <button className="primary-button" type="submit" disabled={saving}>
        {saving ? "Saving…" : type === "income" ? "Add income" : "Add expense"}
      </button>
    </form>
  );
}

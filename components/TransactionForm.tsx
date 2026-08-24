import { FormEvent, useState } from "react";

import {
  categories,
  getToday,
  Transaction,
  TransactionType,
} from "@/lib/finance";

import { supabase } from "@/lib/supabase";

type TransactionFormProps = {
  setTransactions: React.Dispatch<
    React.SetStateAction<Transaction[]>
  >;
};

export default function TransactionForm({
  setTransactions,
}: TransactionFormProps) {
  const today = getToday();

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] =
    useState<TransactionType>("expense");
  const [category, setCategory] = useState("Food");
  const [date, setDate] = useState(today);

  async function addTransaction(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const numericAmount = Number(amount);

    if (
      !name.trim() ||
      !date ||
      !numericAmount ||
      numericAmount <= 0
    ) {
      return;
    }

    const newTransaction = {
      name: name.trim(),
      amount: numericAmount,
      type,
      category: type === "income" ? "Income" : category,
      date,
    };

    const { data, error } = await supabase
      .from("transactions")
      .insert(newTransaction)
      .select()
      .single();

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
          onChange={(event) =>
            setName(event.target.value)
          }
          placeholder="Ex: Rent, paycheck, Chipotle"
        />
      </label>

      <label>
        <span>Amount</span>

        <input
          value={amount}
          onChange={(event) =>
            setAmount(event.target.value)
          }
          placeholder="0.00"
          type="number"
          min="0"
          step="0.01"
        />
      </label>

      <label>
        <span>Date</span>

        <input
          value={date}
          onChange={(event) =>
            setDate(event.target.value)
          }
          type="date"
        />
      </label>

      <div className="input-grid">
        <label>
          <span>Type</span>

          <select
            value={type}
            onChange={(event) =>
              setType(
                event.target.value as TransactionType
              )
            }
          >
            <option value="expense">
              Expense
            </option>

            <option value="income">
              Income
            </option>
          </select>
        </label>

        <label>
          <span>Category</span>

          {type === "expense" ? (
            <select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value)
              }
            >
              {categories
                .filter(
                  (cat) => cat !== "Subscriptions"
                )
                .map((cat) => (
                  <option
                    key={cat}
                    value={cat}
                  >
                    {cat}
                  </option>
                ))}
            </select>
          ) : (
            <input value="Income" disabled />
          )}
        </label>
      </div>

      <button
        className="primary-button"
        type="submit"
      >
        Add Transaction
      </button>
    </form>
  );
}
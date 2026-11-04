import { FormEvent, useState } from "react";
import { SavingsAccount, SavingsEntry, getToday } from "@/lib/finance";
import { supabase } from "@/lib/supabase";

type SavingsFormProps = {
  setEntries: React.Dispatch<React.SetStateAction<SavingsEntry[]>>;
  onDone: () => void;
};

export default function SavingsForm({ setEntries, onDone }: SavingsFormProps) {
  const [account, setAccount] = useState<SavingsAccount>("savings");
  const [direction, setDirection] = useState<"add" | "withdraw">("add");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(getToday());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function addEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0 || !date || saving) return;

    setSaving(true);
    const { data, error } = await supabase
      .from("savings_entries")
      .insert({
        account,
        amount: direction === "add" ? numericAmount : -numericAmount,
        date,
        note: note.trim() || null,
      })
      .select()
      .single();
    setSaving(false);

    if (error) {
      console.error("Error saving entry:", error);
      alert("Entry could not be saved.");
      return;
    }

    setEntries((current) => [
      {
        id: Number(data.id),
        account: data.account,
        amount: Number(data.amount),
        date: data.date,
        note: data.note ?? "",
      },
      ...current,
    ]);

    onDone();
  }

  return (
    <form className="form" onSubmit={addEntry}>
      <div className="segmented" role="radiogroup" aria-label="Account">
        {(["savings", "investment"] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={account === option}
            className={account === option ? "active" : ""}
            onClick={() => setAccount(option)}
          >
            {option === "savings" ? "Savings" : "Investments"}
          </button>
        ))}
      </div>

      <div className="segmented" role="radiogroup" aria-label="Type">
        {(["add", "withdraw"] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={direction === option}
            className={direction === option ? "active" : ""}
            onClick={() => setDirection(option)}
          >
            {option === "add" ? "Added" : "Withdrew"}
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
        <span>Date</span>
        <input value={date} onChange={(event) => setDate(event.target.value)} type="date" required />
      </label>

      <label className="field">
        <span>Note (optional)</span>
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Ex: Roth IRA, emergency fund, brokerage"
        />
      </label>

      <button className="primary-button" type="submit" disabled={saving}>
        {saving ? "Saving…" : "Add entry"}
      </button>
    </form>
  );
}

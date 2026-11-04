import { FormEvent, useState } from "react";
import { Frequency, Subscription, getToday } from "@/lib/finance";
import { supabase } from "@/lib/supabase";

type SubscriptionFormProps = {
  setSubscriptions: React.Dispatch<React.SetStateAction<Subscription[]>>;
  onDone: () => void;
};

export default function SubscriptionForm({ setSubscriptions, onDone }: SubscriptionFormProps) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [startDate, setStartDate] = useState(getToday());
  const [saving, setSaving] = useState(false);

  async function addSubscription(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const numericAmount = Number(amount);
    if (!name.trim() || !startDate || !numericAmount || numericAmount <= 0 || saving) return;

    setSaving(true);
    const { data, error } = await supabase
      .from("subscriptions")
      .insert({
        name: name.trim(),
        amount: numericAmount,
        frequency,
        start_date: startDate,
      })
      .select()
      .single();
    setSaving(false);

    if (error) {
      console.error("Error saving subscription:", error);
      alert("Subscription could not be saved.");
      return;
    }

    setSubscriptions((current) => [
      {
        id: Number(data.id),
        name: data.name,
        amount: Number(data.amount),
        frequency: data.frequency as Frequency,
        startDate: data.start_date,
      },
      ...current,
    ]);

    onDone();
  }

  return (
    <form className="form" onSubmit={addSubscription}>
      <label className="field">
        <span>Name</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ex: Netflix, gym, Spotify"
          required
          autoFocus
        />
      </label>

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
          />
        </div>
      </label>

      <div className="field">
        <span>How often</span>
        <div className="segmented" role="radiogroup" aria-label="How often">
          {(["weekly", "monthly", "yearly"] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={frequency === option}
              className={frequency === option ? "active" : ""}
              onClick={() => setFrequency(option)}
            >
              {option[0].toUpperCase() + option.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <label className="field">
        <span>Start date</span>
        <input
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
          type="date"
          required
        />
      </label>

      <button className="primary-button" type="submit" disabled={saving}>
        {saving ? "Saving…" : "Add recurring"}
      </button>
    </form>
  );
}

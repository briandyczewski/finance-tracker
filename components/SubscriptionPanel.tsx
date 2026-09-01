"use client";

import {
  FormEvent,
  useState,
} from "react";

import {
  Frequency,
  getToday,
  Subscription,
  countSubscriptionCharges,
} from "@/lib/finance";

import { supabase } from "@/lib/supabase";

type SubscriptionPanelProps = {
  subscriptions: Subscription[];

  setSubscriptions: React.Dispatch<
    React.SetStateAction<Subscription[]>
  >;

  selectedMonth: string;
  subscriptionExpenses: number;
};

export default function SubscriptionPanel({
  subscriptions,
  setSubscriptions,
  selectedMonth,
  subscriptionExpenses,
}: SubscriptionPanelProps) {
  const today = getToday();

  const [subName, setSubName] =
    useState("");

  const [subAmount, setSubAmount] =
    useState("");

  const [subFrequency, setSubFrequency] =
    useState<Frequency>("monthly");

  const [subStartDate, setSubStartDate] =
    useState(today);

  async function addSubscription(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const numericAmount =
      Number(subAmount);

    if (
      !subName.trim() ||
      !subStartDate ||
      !numericAmount ||
      numericAmount <= 0
    ) {
      return;
    }

    const newSubscription = {
      name: subName.trim(),
      amount: numericAmount,
      frequency: subFrequency,
      start_date: subStartDate,
    };

    const { data, error } = await supabase
      .from("subscriptions")
      .insert(newSubscription)
      .select()
      .single();

    if (error) {
      console.error(
        "Error saving subscription:",
        error
      );

      alert(
        "Subscription could not be saved."
      );

      return;
    }

    const savedSubscription: Subscription = {
      id: Number(data.id),
      name: data.name,
      amount: Number(data.amount),
      frequency: data.frequency as Frequency,
      startDate: data.start_date,
    };

    setSubscriptions((current) => [
      savedSubscription,
      ...current,
    ]);

    setSubName("");
    setSubAmount("");
    setSubFrequency("monthly");
    setSubStartDate(today);
  }

  async function deleteSubscription(
    id: number
  ) {
    const { error } = await supabase
      .from("subscriptions")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(
        "Error deleting subscription:",
        error
      );

      alert(
        "Subscription could not be deleted."
      );

      return;
    }

    setSubscriptions((current) =>
      current.filter(
        (sub) => sub.id !== id
      )
    );
  }

  return (
    <div className="screen-stack">
      <form
        className="card"
        onSubmit={addSubscription}
      >
        <div className="section-heading">
          <h2>Add Subscription</h2>

          <span>Auto expenses</span>
        </div>

        <label>
          <span>Name</span>

          <input
            value={subName}
            onChange={(e) =>
              setSubName(e.target.value)
            }
            placeholder="Ex: Netflix, gym, Spotify"
          />
        </label>

        <label>
          <span>Amount</span>

          <input
            value={subAmount}
            onChange={(e) =>
              setSubAmount(e.target.value)
            }
            placeholder="0.00"
            type="number"
            min="0"
            step="0.01"
          />
        </label>

        <div className="input-grid">
          <label>
            <span>Frequency</span>

            <select
              value={subFrequency}
              onChange={(e) =>
                setSubFrequency(
                  e.target.value as Frequency
                )
              }
            >
              <option value="weekly">
                Weekly
              </option>

              <option value="monthly">
                Monthly
              </option>

              <option value="yearly">
                Yearly
              </option>
            </select>
          </label>

          <label>
            <span>Start Date</span>

            <input
              value={subStartDate}
              onChange={(e) =>
                setSubStartDate(
                  e.target.value
                )
              }
              type="date"
            />
          </label>
        </div>

        <button
          className="primary-button"
          type="submit"
        >
          Add Subscription
        </button>
      </form>

      <section className="card">
        <div className="section-heading">
          <h2>Your Subscriptions</h2>

          <span>
            $
            {subscriptionExpenses.toFixed(
              2
            )}{" "}
            this month
          </span>
        </div>

        <div className="transaction-list">
          {subscriptions.map(
            (subscription) => {
              const charges =
                countSubscriptionCharges(
                  subscription,
                  selectedMonth
                );

              return (
                <article
                  className="transaction-card"
                  key={subscription.id}
                >
                  <div>
                    <h3>
                      {subscription.name}
                    </h3>

                    <p>
                      $
                      {subscription.amount.toFixed(
                        2
                      )}{" "}
                      •{" "}
                      {
                        subscription.frequency
                      }{" "}
                      • {charges} charge
                      {charges === 1
                        ? ""
                        : "s"}{" "}
                      this month
                    </p>
                  </div>

                  <button
                    type="button"
                    className="delete-button"
                    onClick={() =>
                      deleteSubscription(
                        subscription.id
                      )
                    }
                  >
                    Delete
                  </button>
                </article>
              );
            }
          )}
        </div>
      </section>
    </div>
  );
}
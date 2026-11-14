"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Wallet } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { USERNAME_RULES, createAccount, loginEmail } from "@/lib/accounts";

export default function SignUpPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  async function signUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const name = username.trim().toLowerCase();

    if (!/^[a-z0-9_]{3,20}$/.test(name)) {
      setError(`Usernames are ${USERNAME_RULES}`);
      return;
    }
    if (password.length < 8) {
      setError("Password needs to be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setCreating(true);

    const created = await createAccount(name, password);
    if (created.error) {
      setCreating(false);
      setError(created.error);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail(name),
      password,
    });

    if (error) {
      // The account exists; send them to sign in normally.
      window.location.replace("/login");
      return;
    }

    // Full page load so proxy.ts sees the new session.
    window.location.replace("/");
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark">
            <Wallet size={24} strokeWidth={2.3} />
          </span>
          <div>
            <h1>Create account</h1>
            <p>Your data stays private to your login</p>
          </div>
        </div>

        <form className="card form" onSubmit={signUp}>
          <label className="field">
            <span>Username</span>
            <input
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              minLength={3}
              maxLength={20}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>
          <p className="auth-hint">{USERNAME_RULES}</p>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Confirm password</span>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />
          </label>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button className="primary-button" type="submit" disabled={creating}>
            {creating ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </div>
    </main>
  );
}

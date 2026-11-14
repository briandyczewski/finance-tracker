"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Wallet } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { loginEmail } from "@/lib/accounts";

export default function LoginPage() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSigningIn(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail(login),
      password,
    });

    if (error) {
      setSigningIn(false);
      setError(
        error.code === "invalid_credentials"
          ? "That username and password don't match."
          : error.message
      );
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
            <h1>Finance Tracker</h1>
            <p>Sign in to see your money</p>
          </div>
        </div>

        <form className="card form" onSubmit={signIn}>
          <label className="field">
            <span>Username or email</span>
            <input
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              value={login}
              onChange={(event) => setLogin(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button className="primary-button" type="submit" disabled={signingIn}>
            {signingIn ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="auth-switch">
          New here? <Link href="/signup">Create an account</Link>
        </p>
      </div>
    </main>
  );
}

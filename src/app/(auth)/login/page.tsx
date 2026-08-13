"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/trips`,
      },
    });
  }

  // TODO(M0, temporary): remove once Google OAuth credentials exist
  // (ARCHITECTURE.md §1 names Google as the only provider). Email+password
  // fallback so sign-in can be tested without Google Cloud Console or
  // depending on Supabase's outbound email working.
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setCheckEmail(false);

    if (mode === "sign-up") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
        return;
      }
      // If "Confirm email" is on in Supabase Auth settings, signUp won't
      // return a session yet — an email confirmation is still required.
      if (!data.session) {
        setCheckEmail(true);
      }
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      return;
    }
    window.location.href = "/trips";
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1>Route & Stamps</h1>
      <Button variant="primary" onClick={signInWithGoogle}>
        Sign in with Google
      </Button>

      {checkEmail ? (
        <p>Account created — check your email to confirm it before signing in.</p>
      ) : (
        <form onSubmit={handleSubmit} className="field flex flex-col items-center gap-2">
          <label htmlFor="email">
            {mode === "sign-up" ? "Create account (dev only)" : "Sign in with email (dev only)"}
          </label>
          <input
            id="email"
            type="email"
            required
            placeholder="Email"
            className="input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <input
            id="password"
            type="password"
            required
            minLength={6}
            placeholder="Password"
            className="input"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Button type="submit" variant="secondary">
            {mode === "sign-up" ? "Create account" : "Sign in"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setMode(mode === "sign-up" ? "sign-in" : "sign-up");
              setError(null);
            }}
          >
            {mode === "sign-up" ? "Have an account? Sign in" : "No account? Create one"}
          </Button>
          {error && <p className="text-muted">{error}</p>}
        </form>
      )}
    </main>
  );
}

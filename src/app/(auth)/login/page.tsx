"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/trips`,
      },
    });
  }

  // TODO(M0, temporary): remove once Google OAuth credentials exist
  // (ARCHITECTURE.md §1 names Google as the only provider). Magic-link
  // fallback so sign-in can be tested before Google Cloud Console is set up.
  async function signInWithEmail(event: FormEvent) {
    event.preventDefault();
    await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/trips`,
      },
    });
    setSent(true);
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1>Route & Stamps</h1>
      <Button variant="primary" onClick={signInWithGoogle}>
        Sign in with Google
      </Button>

      {sent ? (
        <p>Check your email for a sign-in link.</p>
      ) : (
        <form onSubmit={signInWithEmail} className="field flex flex-col items-center gap-2">
          <label htmlFor="email">Or sign in with email (dev only)</label>
          <input
            id="email"
            type="email"
            required
            className="input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Button type="submit" variant="secondary">
            Send magic link
          </Button>
        </form>
      )}
    </main>
  );
}

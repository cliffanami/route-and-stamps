"use client";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/trips`,
      },
    });
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl">Route & Stamps</h1>
      {/* TODO: replace with ui/Button once Broadsheet's .btn is vendored (ARCHITECTURE.md §1b) */}
      <button onClick={signInWithGoogle} className="border px-4 py-2">
        Sign in with Google
      </button>
    </main>
  );
}

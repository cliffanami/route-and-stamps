"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

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
      <h1>Route & Stamps</h1>
      <Button variant="primary" onClick={signInWithGoogle}>
        Sign in with Google
      </Button>
    </main>
  );
}

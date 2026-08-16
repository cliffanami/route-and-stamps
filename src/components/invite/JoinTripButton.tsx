"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

interface JoinTripButtonProps {
  token: string;
  tripId: string;
  isAuthenticated: boolean;
}

export function JoinTripButton({ token, tripId, isAuthenticated }: JoinTripButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthenticated) {
    return (
      <a
        href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}
        className="btn btn-primary btn-block"
      >
        Sign in to join this trip
      </a>
    );
  }

  async function handleJoin() {
    setPending(true);
    setError(null);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("redeem_invite", { p_token: token });

    if (rpcError) {
      setError(rpcError.message);
      setPending(false);
      return;
    }

    router.push(`/trips/${tripId}/route`);
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="primary" block onClick={handleJoin} disabled={pending}>
        {pending ? "Joining…" : "Join this trip"}
      </Button>
      {error && <p className="text-muted">{error}</p>}
    </div>
  );
}

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// The signed-in user's id, resolved client-side — the same
// useState+useEffect+supabase.auth.getUser() shape that was duplicated
// across RouteSpine, NotificationBell, and (now) PlaceDetail. Extracted
// here rather than copy-pasted a fourth time.
export function useCurrentUserId(): string | null {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  return userId;
}

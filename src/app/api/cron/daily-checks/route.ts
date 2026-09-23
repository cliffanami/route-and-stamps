import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// A cron trigger has no user session for a direct Supabase call to run
// under — the one legitimate reason this needs a Route Handler at all
// (CONVENTIONS.md §1's "Route Handlers only for..." list predates this
// case; a server-to-server scheduled trigger is a new, justified category,
// not a client-reachable proxy). Vercel Cron hits this daily (vercel.json)
// and calls the Postgres functions built in Milestone D
// (check_scheduled_arrivals, check_packing_reminders) plus
// check_todo_reminders (live-usage feedback: luggage-forwarding action
// items need to actually remind on their due date, not just sit on a
// place's page). All are idempotent (each guards on a notification of its
// type not already existing for the row), so a duplicate or overlapping
// cron run is harmless.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { error: arrivalsError } = await supabase.rpc(
    "check_scheduled_arrivals",
  );
  const { error: packingError } = await supabase.rpc(
    "check_packing_reminders",
  );
  const { error: todoError } = await supabase.rpc("check_todo_reminders");

  if (arrivalsError || packingError || todoError) {
    return NextResponse.json(
      {
        error: "One or more checks failed",
        arrivalsError: arrivalsError?.message,
        packingError: packingError?.message,
        todoError: todoError?.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

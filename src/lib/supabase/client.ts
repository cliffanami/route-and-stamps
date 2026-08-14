import { createBrowserClient } from "@supabase/ssr";

// TODO(M0): once the Supabase project exists, run
// `supabase gen types typescript --project-id <id> > src/types/database.types.ts`
// and pass it as createBrowserClient<Database>(...) here.
//
// Memoized as a module-level singleton — every call used to create a brand
// new client, which meant a brand new Realtime socket each time too. That
// socket's auth sync depends on this client's own async session hydration;
// a fresh instance created and immediately subscribed to (as
// use-realtime-subscription.ts does) could open its channel before that
// hydration finished, so the subscription established with no JWT and RLS
// silently filtered out every event. Diagnosed by confirming inserts
// really were reaching the database while the other browser's realtime
// subscription never fired.
let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function createClient() {
  browserClient ??= createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return browserClient;
}

import { createBrowserClient } from "@supabase/ssr";

// TODO(M0): once the Supabase project exists, run
// `supabase gen types typescript --project-id <id> > src/types/database.types.ts`
// and pass it as createBrowserClient<Database>(...) here.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

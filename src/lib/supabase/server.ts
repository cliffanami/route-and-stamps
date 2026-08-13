import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// TODO(M0): once the Supabase project exists, run
// `supabase gen types typescript --project-id <id> > src/types/database.types.ts`
// and pass it as createServerClient<Database>(...) here.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[],
        ) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component — session refresh is handled
            // by src/middleware.ts instead. Safe to ignore here.
          }
        },
      },
    },
  );
}

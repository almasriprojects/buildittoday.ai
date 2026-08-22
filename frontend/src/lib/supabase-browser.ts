import { createBrowserClient } from "@supabase/ssr";

// Client-only Supabase factory.
//
// `@/lib/supabase` imports `next/headers` at module scope for its server
// helpers, which makes the whole module unusable from a client component.
// Client components import from here instead.
export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

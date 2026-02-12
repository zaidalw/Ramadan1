import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnvOrThrow } from "@/lib/env";

export function createSupabaseBrowserClient() {
  const { url, anonKey } = getSupabaseEnvOrThrow();
  return createBrowserClient(url, anonKey);
}

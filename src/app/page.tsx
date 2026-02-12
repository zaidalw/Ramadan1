import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/env";

export default async function IndexPage() {
  if (!hasSupabaseEnv) {
    redirect("/quick-play");
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("active_group_id")
    .eq("id", user.id)
    .single();

  if (error) {
    // If profile row isn't ready yet, send user to onboarding.
    redirect("/onboarding");
  }

  if (!profile?.active_group_id) redirect("/onboarding");
  redirect("/app");
}

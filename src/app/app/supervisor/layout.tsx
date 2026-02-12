import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/env";

export default async function SupervisorLayout({ children }: { children: React.ReactNode }) {
  if (!hasSupabaseEnv) redirect("/quick-play");

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_group_id")
    .eq("id", user.id)
    .single();
  if (!profile?.active_group_id) redirect("/onboarding");

  const { data: member } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", profile.active_group_id)
    .eq("user_id", user.id)
    .single();

  if (member?.role !== "supervisor") redirect("/app");

  return <>{children}</>;
}

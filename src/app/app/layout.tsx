import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GroupProvider } from "@/components/GroupProvider";
import { AppChrome } from "@/components/AppChrome";
import type { Group, GroupMember } from "@/lib/types";
import { hasSupabaseEnv } from "@/lib/env";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
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

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("*")
    .eq("id", profile.active_group_id)
    .single();

  if (groupError || !group) redirect("/onboarding");

  const { data: member, error: memberError } = await supabase
    .from("group_members")
    .select("*")
    .eq("group_id", group.id)
    .eq("user_id", user.id)
    .single();

  if (memberError || !member) redirect("/onboarding");

  return (
    <GroupProvider group={group as Group} member={member as GroupMember} userId={user.id}>
      <AppChrome>{children}</AppChrome>
    </GroupProvider>
  );
}

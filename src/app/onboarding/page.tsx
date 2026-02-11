import { redirect } from "next/navigation";
import { PublicShell } from "@/components/PublicShell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { OnboardingClient } from "@/app/onboarding/OnboardingClient";

export default async function OnboardingPage() {
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

  if (profile?.active_group_id) redirect("/app");

  return (
    <PublicShell
      title="ابدئي مع المجموعة"
      subtitle="أنشئي مجموعة جديدة كمشرفة، أو ادخلي برمز الدعوة."
    >
      <OnboardingClient />
    </PublicShell>
  );
}

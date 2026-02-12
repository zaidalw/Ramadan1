import { redirect } from "next/navigation";
import { PublicShell } from "@/components/PublicShell";
import { InviteJoinClient } from "@/app/invite/[code]/InviteJoinClient";
import { hasSupabaseEnv } from "@/lib/env";

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  if (!hasSupabaseEnv) redirect("/quick-play");

  const { code } = await params;
  return (
    <PublicShell title="انضمام برابط الدعوة" subtitle="اكتبي اسمك ثم انضمي للمجموعة.">
      <InviteJoinClient inviteCode={code} />
    </PublicShell>
  );
}

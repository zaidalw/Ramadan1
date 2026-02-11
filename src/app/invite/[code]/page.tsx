import { PublicShell } from "@/components/PublicShell";
import { InviteJoinClient } from "@/app/invite/[code]/InviteJoinClient";

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <PublicShell title="انضمام برابط الدعوة" subtitle="اكتبي اسمك ثم انضمي للمجموعة.">
      <InviteJoinClient inviteCode={code} />
    </PublicShell>
  );
}

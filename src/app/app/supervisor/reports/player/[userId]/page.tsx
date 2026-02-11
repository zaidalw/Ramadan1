import { PlayerReportClient } from "@/app/app/supervisor/reports/player/[userId]/PlayerReportClient";

export default async function PlayerReportPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  return <PlayerReportClient targetUserId={userId} />;
}

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PublicShell } from "@/components/PublicShell";
import { AuthClient } from "@/app/auth/AuthClient";
import { hasSupabaseEnv } from "@/lib/env";

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (!hasSupabaseEnv) redirect("/quick-play");

  const sp = await searchParams;
  return (
    <PublicShell title="تحدي رمضان اليومي" subtitle="سجلي دخولك أو أنشئي حسابا للمشاركة.">
      <Suspense>
        <AuthClient nextPath={sp.next} />
      </Suspense>
    </PublicShell>
  );
}

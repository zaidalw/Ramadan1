import { Suspense } from "react";
import { PublicShell } from "@/components/PublicShell";
import { AuthClient } from "@/app/auth/AuthClient";

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  return (
    <PublicShell title="تحدي رمضان اليومي" subtitle="سجلي دخولك أو أنشئي حسابا للمشاركة.">
      <Suspense>
        <AuthClient nextPath={sp.next} />
      </Suspense>
    </PublicShell>
  );
}

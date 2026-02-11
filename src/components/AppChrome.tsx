"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/cn";
import { useGroup } from "@/components/GroupProvider";

function NavItem({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex h-12 flex-1 items-center justify-center rounded-xl text-sm font-semibold transition",
        active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/10 hover:text-white",
      )}
    >
      {label}
    </Link>
  );
}

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { group, role } = useGroup();

  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.replace("/auth");
  }

  return (
    <div className="min-h-dvh bg-[color:var(--background)] text-[color:var(--foreground)]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(900px_600px_at_50%_-20%,rgba(247,211,122,0.14),transparent_60%),radial-gradient(700px_500px_at_10%_10%,rgba(255,255,255,0.05),transparent_55%),radial-gradient(800px_520px_at_95%_30%,rgba(255,255,255,0.04),transparent_55%)]"
      />

      <header className="no-print relative mx-auto w-full max-w-md px-5 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-white/60">تحدي رمضان اليومي</p>
            <h1 className="mt-1 text-xl font-bold leading-tight">{group.name}</h1>
            {role === "supervisor" ? (
              <p className="mt-1 text-xs font-semibold text-[color:var(--gold)]">مشرفة</p>
            ) : (
              <p className="mt-1 text-xs font-semibold text-white/60">مشاركة</p>
            )}
          </div>
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
          >
            {signingOut ? "خروج" : "تسجيل الخروج"}
          </button>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-md px-5 pb-24 pt-5">{children}</main>

      <nav className="no-print fixed inset-x-0 bottom-0 z-10 bg-[color:var(--background)]/80 backdrop-blur">
        <div className="mx-auto w-full max-w-md px-3 py-3">
          <div className="flex gap-2 rounded-2xl border border-white/10 bg-white/5 p-2">
            <NavItem href="/app" label="اليوم" active={pathname === "/app"} />
            <NavItem href="/app/history" label="السجل" active={pathname.startsWith("/app/history")} />
            <NavItem
              href="/app/leaderboards"
              label="الترتيب"
              active={pathname.startsWith("/app/leaderboards")}
            />
            {role === "supervisor" ? (
              <NavItem
                href="/app/supervisor"
                label="لوحة المشرفة"
                active={pathname.startsWith("/app/supervisor")}
              />
            ) : (
              <NavItem
                href="/app/settings"
                label="الإعدادات"
                active={pathname.startsWith("/app/settings")}
              />
            )}
          </div>
        </div>
      </nav>
    </div>
  );
}

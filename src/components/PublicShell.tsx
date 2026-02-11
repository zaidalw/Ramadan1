import type * as React from "react";
import { cn } from "@/lib/cn";

export function PublicShell({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="min-h-dvh bg-[color:var(--background)] text-[color:var(--foreground)]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(1200px_600px_at_50%_-20%,rgba(247,211,122,0.18),transparent_60%),radial-gradient(900px_500px_at_10%_30%,rgba(255,255,255,0.06),transparent_55%),radial-gradient(900px_500px_at_90%_35%,rgba(255,255,255,0.05),transparent_55%)]"
      />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-10">
        <header className="mb-6">
          <p className="text-sm font-semibold text-white/70">مجموعة خاصة</p>
          <h1 className="mt-2 text-3xl font-bold leading-tight">{title}</h1>
          {subtitle ? <p className="mt-2 text-base text-white/70">{subtitle}</p> : null}
        </header>
        <main className={cn("flex-1", className)}>{children}</main>
        <footer className="mt-8 text-center text-xs text-white/50">
          لا يوجد محتوى عام. كل البيانات داخل المجموعة الخاصة فقط.
        </footer>
      </div>
    </div>
  );
}


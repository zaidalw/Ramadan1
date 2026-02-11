"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { getErrorMessage } from "@/lib/errors";

function normalizeNextPath(nextPath: string | undefined) {
  if (!nextPath) return "/";
  if (!nextPath.startsWith("/")) return "/";
  if (nextPath.startsWith("//")) return "/";
  return nextPath;
}

export function AuthClient({ nextPath }: { nextPath?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const resolvedNext = normalizeNextPath(nextPath ?? searchParams.get("next") ?? undefined);

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace(resolvedNext);
        return;
      }

      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (data.session) {
        router.replace(resolvedNext);
        return;
      }
      setMessage("تم إنشاء الحساب. تحققي من بريدك لإكمال التفعيل إذا كان مطلوبا.");
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setMessage(msg ? `تعذر المتابعة. ${msg}` : "تعذر المتابعة.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-4 grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant={mode === "signin" ? "primary" : "secondary"}
          onClick={() => setMode("signin")}
        >
          تسجيل الدخول
        </Button>
        <Button
          type="button"
          variant={mode === "signup" ? "primary" : "secondary"}
          onClick={() => setMode("signup")}
        >
          إنشاء حساب
        </Button>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-semibold text-white/80">البريد الإلكتروني</label>
          <Input
            inputMode="email"
            autoComplete="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-white/80">كلمة المرور</label>
          <Input
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            placeholder="ثمانية أحرف أو أكثر"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>

        {message ? (
          <p className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/80">
            {message}
          </p>
        ) : null}

        <Button fullWidth disabled={busy}>
          {busy ? "جاري المتابعة" : mode === "signin" ? "دخول" : "إنشاء"}
        </Button>
      </form>
    </Card>
  );
}

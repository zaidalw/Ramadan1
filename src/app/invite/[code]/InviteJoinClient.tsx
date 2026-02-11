"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { getErrorMessage } from "@/lib/errors";

export function InviteJoinClient({ inviteCode }: { inviteCode: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onJoin(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setBusy(true);
    try {
      const code = (inviteCode || "").trim().toUpperCase();
      const { error } = await supabase.rpc("join_group", {
        _invite_code: code,
        _display_name: displayName.trim(),
      });
      if (error) throw error;
      router.replace("/app");
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setMessage(msg ? `تعذر الانضمام. ${msg}` : "تعذر الانضمام.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <form onSubmit={onJoin} className="space-y-4">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/85">
          <p className="font-semibold">رمز الدعوة</p>
          <p className="mt-1 text-lg tracking-wider">{inviteCode.toUpperCase()}</p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-white/80">اسمك داخل المجموعة</label>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
        </div>

        {message ? (
          <p className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/80">
            {message}
          </p>
        ) : null}

        <Button fullWidth disabled={busy || !displayName.trim()}>
          {busy ? "جاري الانضمام" : "انضمام"}
        </Button>
      </form>
    </Card>
  );
}

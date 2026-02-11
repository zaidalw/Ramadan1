"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useGroup } from "@/components/GroupProvider";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import { env } from "@/lib/env";
import { getErrorMessage } from "@/lib/errors";

function getSoundEnabled() {
  try {
    const v = localStorage.getItem("rdc_sound_enabled");
    if (v === null) return true;
    return v === "true";
  } catch {
    return true;
  }
}

function setSoundEnabled(v: boolean) {
  try {
    localStorage.setItem("rdc_sound_enabled", v ? "true" : "false");
  } catch {
    // ignore
  }
}

export function SettingsClient() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { group, member, role, userId } = useGroup();

  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [displayName, setDisplayName] = useState(member.display_name);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setSoundEnabledState(getSoundEnabled());
  }, []);

  async function saveDisplayName() {
    setMessage(null);
    setBusy(true);
    try {
      const name = displayName.trim();
      if (!name) {
        setMessage("اكتبي الاسم أولا.");
        return;
      }
      const { error } = await supabase
        .from("group_members")
        .update({ display_name: name })
        .eq("group_id", group.id)
        .eq("user_id", userId);
      if (error) throw error;
      setMessage("تم حفظ الاسم.");
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setMessage(msg ? `تعذر الحفظ. ${msg}` : "تعذر الحفظ.");
    } finally {
      setBusy(false);
    }
  }

  async function copyInviteLink() {
    const origin = env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const link = `${origin}/invite/${group.invite_code}`;
    await navigator.clipboard.writeText(link);
    setMessage("تم نسخ رابط الدعوة.");
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="text-2xl font-bold">الإعدادات</h2>
        <p className="mt-1 text-sm text-white/70">إعدادات بسيطة داخل المجموعة.</p>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-white/80">اسمك داخل المجموعة</label>
            <div className="flex gap-2">
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              <Button variant="secondary" onClick={saveDisplayName} disabled={busy}>
                حفظ
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
            <div>
              <p className="text-sm font-semibold">مؤثرات الصوت</p>
              <p className="mt-1 text-xs text-white/60">عند 10 من 10</p>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabledState(next);
                setSoundEnabled(next);
              }}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-semibold transition",
                soundEnabled ? "bg-[color:var(--gold)] text-[#102117]" : "bg-white/5 text-white/75 hover:bg-white/10",
              )}
            >
              {soundEnabled ? "مفعل" : "مغلق"}
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold text-white/60">معلومات المجموعة</p>
            <p className="mt-2 text-sm">
              <span className="text-white/60">الدور:</span> {role === "supervisor" ? "مشرفة" : "مشاركة"}
            </p>
            <p className="mt-1 text-sm">
              <span className="text-white/60">رمز الدعوة:</span>{" "}
              <span className="font-extrabold tracking-wider text-[color:var(--gold)]">{group.invite_code}</span>
            </p>
            <div className="mt-3">
              <Button variant="secondary" onClick={copyInviteLink}>
                نسخ رابط الدعوة
              </Button>
            </div>
          </div>

          {message ? (
            <p className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/80">
              {message}
            </p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

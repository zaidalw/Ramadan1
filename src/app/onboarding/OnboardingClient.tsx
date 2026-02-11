"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { env } from "@/lib/env";
import { getErrorMessage } from "@/lib/errors";

function getDefaultTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago";
  } catch {
    return "America/Chicago";
  }
}

function localYmd(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value ?? "2026";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
}

export function OnboardingClient() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [mode, setMode] = useState<"create" | "join">("create");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");

  const [groupName, setGroupName] = useState("مجموعة رمضان");
  const [timezone, setTimezone] = useState("America/Chicago");
  const [startDate, setStartDate] = useState(localYmd("America/Chicago"));
  const [cutoffTime, setCutoffTime] = useState("23:59");
  const [maxPlayers, setMaxPlayers] = useState(7);

  const [inviteCode, setInviteCode] = useState("");
  const [createdInviteCode, setCreatedInviteCode] = useState<string | null>(null);

  async function createGroup(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setCreatedInviteCode(null);
    setBusy(true);
    try {
      const tz = timezone.trim() || "America/Chicago";
      const sd = startDate || localYmd(tz);
      const ct = cutoffTime.length === 5 ? `${cutoffTime}:00` : cutoffTime;

      const { data, error } = await supabase.rpc("create_group", {
        _group_name: groupName.trim(),
        _display_name: displayName.trim(),
        _start_date: sd,
        _timezone: tz,
        _cutoff_time: ct,
        _max_players: Math.max(2, Math.min(20, maxPlayers)),
      });
      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;
      const code = row?.invite_code ?? row?.inviteCode ?? null;
      if (code) setCreatedInviteCode(code);

      router.replace("/app");
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setMessage(msg ? `تعذر إنشاء المجموعة. ${msg}` : "تعذر إنشاء المجموعة.");
    } finally {
      setBusy(false);
    }
  }

  async function joinGroup(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setBusy(true);
    try {
      const code = inviteCode.trim().toUpperCase();
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

  async function copyInviteLink() {
    if (!createdInviteCode) return;
    const origin = env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const link = `${origin}/invite/${createdInviteCode}`;
    await navigator.clipboard.writeText(link);
    setMessage("تم نسخ رابط الدعوة.");
  }

  return (
    <Card className="p-5">
      <div className="mb-4 grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant={mode === "create" ? "primary" : "secondary"}
          onClick={() => setMode("create")}
        >
          إنشاء مجموعة
        </Button>
        <Button
          type="button"
          variant={mode === "join" ? "primary" : "secondary"}
          onClick={() => setMode("join")}
        >
          الانضمام
        </Button>
      </div>

      <div className="mb-4">
        <label className="mb-2 block text-sm font-semibold text-white/80">اسمك داخل المجموعة</label>
        <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
      </div>

      {mode === "create" ? (
        <form onSubmit={createGroup} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-white/80">اسم المجموعة</label>
            <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-white/80">تاريخ البداية</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-white/80">وقت الإغلاق</label>
              <Input type="time" value={cutoffTime} onChange={(e) => setCutoffTime(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-white/80">المنطقة الزمنية</label>
              <Input
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                onFocus={() => {
                  if (timezone === "America/Chicago") return;
                }}
                placeholder={getDefaultTimezone()}
              />
              <p className="mt-2 text-xs text-white/55">الافتراضي: America/Chicago</p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-white/80">عدد المشاركات</label>
              <Input
                type="number"
                min={2}
                max={20}
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
              />
              <p className="mt-2 text-xs text-white/55">الافتراضي: 7</p>
            </div>
          </div>

          {createdInviteCode ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/85">
              <p className="font-semibold">رمز الدعوة: {createdInviteCode}</p>
              <div className="mt-3">
                <Button type="button" variant="secondary" onClick={copyInviteLink}>
                  نسخ رابط الدعوة
                </Button>
              </div>
            </div>
          ) : null}

          {message ? (
            <p className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/80">
              {message}
            </p>
          ) : null}

          <Button fullWidth disabled={busy || !displayName.trim() || !groupName.trim()}>
            {busy ? "جاري الإنشاء" : "إنشاء"}
          </Button>
        </form>
      ) : (
        <form onSubmit={joinGroup} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-white/80">رمز الدعوة</label>
            <Input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="مثال: K7P3Q9A"
              required
            />
          </div>

          {message ? (
            <p className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/80">
              {message}
            </p>
          ) : null}

          <Button fullWidth disabled={busy || !displayName.trim() || !inviteCode.trim()}>
            {busy ? "جاري الانضمام" : "انضمام"}
          </Button>
        </form>
      )}
    </Card>
  );
}

"use client";

import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useGroup } from "@/components/GroupProvider";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getErrorMessage } from "@/lib/errors";

export function SupervisorSettingsClient() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { group } = useGroup();

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [name, setName] = useState(group.name);
  const [startDate, setStartDate] = useState(group.start_date);
  const [timezone, setTimezone] = useState(group.timezone);
  const [cutoffTime, setCutoffTime] = useState(group.cutoff_time.slice(0, 5));
  const [maxPlayers, setMaxPlayers] = useState(group.max_players);

  async function save() {
    setMessage(null);
    setBusy(true);
    try {
      const ct = cutoffTime.length === 5 ? `${cutoffTime}:00` : cutoffTime;
      const { error } = await supabase
        .from("groups")
        .update({
          name: name.trim(),
          start_date: startDate,
          timezone: timezone.trim() || "America/Chicago",
          cutoff_time: ct,
          max_players: Math.max(2, Math.min(20, maxPlayers)),
          updated_at: new Date().toISOString(),
        })
        .eq("id", group.id);
      if (error) throw error;
      setMessage("تم حفظ الإعدادات. قد تحتاجين لإعادة تحميل الصفحة.");
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setMessage(msg ? `تعذر الحفظ. ${msg}` : "تعذر الحفظ.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <h2 className="text-2xl font-bold">إعدادات المجموعة</h2>
      <p className="mt-1 text-sm text-white/70">وقت الإغلاق الافتراضي: 11:59 مساء بتوقيت المجموعة.</p>

      <div className="mt-5 space-y-4">
        <div>
          <label className="mb-2 block text-sm font-semibold text-white/80">اسم المجموعة</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
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
            <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="America/Chicago" />
            <p className="mt-2 text-xs text-white/55">مثال: America/Chicago</p>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-white/80">الحد الأعلى للمشاركات</label>
            <Input
              type="number"
              min={2}
              max={20}
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-semibold text-white/60">رمز الدعوة</p>
          <p className="mt-2 text-xl font-extrabold tracking-wider text-[color:var(--gold)]">{group.invite_code}</p>
        </div>

        {message ? (
          <p className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/80">{message}</p>
        ) : null}

        <Button fullWidth onClick={save} disabled={busy}>
          {busy ? "جاري الحفظ" : "حفظ"}
        </Button>
      </div>
    </Card>
  );
}

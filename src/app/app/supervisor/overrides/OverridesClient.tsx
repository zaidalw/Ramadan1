"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useGroup } from "@/components/GroupProvider";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import { getErrorMessage } from "@/lib/errors";

type Member = { user_id: string; display_name: string };
type SubmissionRow = {
  id: string;
  user_id: string;
  day_number: number;
  quran_points: number;
  hadith_points: number;
  fiqh_points: number;
  impact_points: number;
  auto_total: number;
  override_total: number | null;
  total_points: number;
  updated_at: string;
};

type OverrideLog = {
  id: string;
  submission_id: string;
  supervisor_id: string;
  previous_total_points: number;
  new_total_points: number;
  previous_override_total: number | null;
  new_override_total: number | null;
  reason: string;
  created_at: string;
};

export function OverridesClient() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { group } = useGroup();

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [members, setMembers] = useState<Member[]>([]);
  const [dayNumber, setDayNumber] = useState(1);
  const [subs, setSubs] = useState<SubmissionRow[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  const selected = subs.find((s) => s.id === selectedSubmissionId) ?? null;
  const [overrideTotal, setOverrideTotal] = useState<string>("");
  const [reason, setReason] = useState("");

  const [logs, setLogs] = useState<OverrideLog[]>([]);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setMessage(null);
      try {
        const [mRes, lRes] = await Promise.all([
          supabase.from("group_members").select("user_id,display_name").eq("group_id", group.id),
          supabase.from("score_overrides").select("*").eq("group_id", group.id).order("created_at", { ascending: false }).limit(50),
        ]);
        if (mRes.error) throw mRes.error;
        if (lRes.error) throw lRes.error;
        if (!alive) return;
        setMembers((mRes.data ?? []) as Member[]);
        setLogs((lRes.data ?? []) as OverrideLog[]);
      } catch (err: unknown) {
        if (!alive) return;
        const msg = getErrorMessage(err);
        setMessage(msg ? `تعذر التحميل. ${msg}` : "تعذر التحميل.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [group.id, supabase]);

  useEffect(() => {
    let alive = true;
    async function loadDay() {
      setMessage(null);
      try {
        const { data, error } = await supabase
          .from("submissions")
          .select("id,user_id,day_number,quran_points,hadith_points,fiqh_points,impact_points,auto_total,override_total,total_points,updated_at")
          .eq("group_id", group.id)
          .eq("day_number", dayNumber);
        if (error) throw error;
        if (!alive) return;
        const rows = (data ?? []) as SubmissionRow[];
        rows.sort((a, b) => b.total_points - a.total_points);
        setSubs(rows);
        setSelectedSubmissionId(rows[0]?.id ?? null);
      } catch (err: unknown) {
        if (!alive) return;
        const msg = getErrorMessage(err);
        setMessage(msg ? `تعذر تحميل يوم ${dayNumber}. ${msg}` : `تعذر تحميل يوم ${dayNumber}.`);
      }
    }
    loadDay();
    return () => {
      alive = false;
    };
  }, [group.id, dayNumber, supabase]);

  useEffect(() => {
    if (!selected) return;
    setOverrideTotal(selected.override_total === null ? "" : String(selected.override_total));
    setReason("");
  }, [selectedSubmissionId]); // eslint-disable-line react-hooks/exhaustive-deps

  function nameFor(userId: string) {
    return members.find((m) => m.user_id === userId)?.display_name ?? userId.slice(0, 6);
  }

  async function applyOverride() {
    if (!selected) return;
    setMessage(null);
    setBusy(true);
    try {
      const trimmed = overrideTotal.trim();
      const newOverride = trimmed === "" ? null : Number(trimmed);
      if (newOverride !== null && (!Number.isFinite(newOverride) || newOverride < 0 || newOverride > 10)) {
        setMessage("المجموع يجب أن يكون بين 0 و 10 أو اتركيه فارغا لإزالة التعديل.");
        return;
      }
      if (!reason.trim()) {
        setMessage("اكتبي السبب.");
        return;
      }

      const { error } = await supabase.rpc("override_submission", {
        _submission_id: selected.id,
        _new_override_total: newOverride,
        _reason: reason.trim(),
      });
      if (error) throw error;

      // Refresh data
      const [dayRes, logsRes] = await Promise.all([
        supabase
          .from("submissions")
          .select("id,user_id,day_number,quran_points,hadith_points,fiqh_points,impact_points,auto_total,override_total,total_points,updated_at")
          .eq("group_id", group.id)
          .eq("day_number", dayNumber),
        supabase.from("score_overrides").select("*").eq("group_id", group.id).order("created_at", { ascending: false }).limit(50),
      ]);
      if (dayRes.error) throw dayRes.error;
      if (logsRes.error) throw logsRes.error;

      const rows = (dayRes.data ?? []) as SubmissionRow[];
      rows.sort((a, b) => b.total_points - a.total_points);
      setSubs(rows);
      setLogs((logsRes.data ?? []) as OverrideLog[]);
      setMessage("تم تسجيل التعديل.");
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setMessage(msg ? `تعذر التعديل. ${msg}` : "تعذر التعديل.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="text-2xl font-bold">تدقيق النقاط</h2>
        <p className="mt-1 text-sm text-white/70">تعديل المجموع مع سبب وتسجيل كامل.</p>

        {loading ? <p className="mt-5 text-sm text-white/70">جاري التحميل</p> : null}
        {message ? (
          <p className="mt-5 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/80">
            {message}
          </p>
        ) : null}

        <div className="mt-5 flex items-end gap-3">
          <div className="flex-1">
            <label className="mb-2 block text-sm font-semibold text-white/80">اليوم</label>
            <Input
              type="number"
              min={1}
              max={30}
              value={dayNumber}
              onChange={(e) => setDayNumber(Math.max(1, Math.min(30, Number(e.target.value))))}
            />
          </div>
          <div className="flex-[2]">
            <label className="mb-2 block text-sm font-semibold text-white/80">النتائج المسجلة</label>
            <div className="flex flex-wrap gap-2">
              {subs.length ? (
                subs.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSubmissionId(s.id)}
                    className={cn(
                      "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10",
                      selectedSubmissionId === s.id && "border-[color:var(--gold)]/60 bg-white/10 text-white",
                    )}
                  >
                    {nameFor(s.user_id)} ({s.total_points})
                  </button>
                ))
              ) : (
                <span className="text-sm text-white/60">لا يوجد تسجيل</span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {selected ? (
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-white/60">المشاركة</p>
              <p className="mt-1 text-xl font-bold">{nameFor(selected.user_id)}</p>
              <p className="mt-1 text-xs text-white/60">آخر تحديث: {new Date(selected.updated_at).toLocaleString("ar")}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center">
              <p className="text-[11px] font-semibold text-white/60">المجموع</p>
              <p className="mt-1 text-lg font-extrabold text-[color:var(--gold)]">{selected.total_points}/10</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-xs font-semibold text-white/60">تفاصيل</p>
              <p className="mt-2">ورد: {selected.quran_points}</p>
              <p className="mt-1">حديث: {selected.hadith_points}</p>
              <p className="mt-1">فقه: {selected.fiqh_points}</p>
              <p className="mt-1">أثر: {selected.impact_points}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-xs font-semibold text-white/60">حساب النظام</p>
              <p className="mt-2">المجموع التلقائي: {selected.auto_total}</p>
              <p className="mt-1">
                تعديل يدوي: {selected.override_total === null ? "لا" : String(selected.override_total)}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-2 block text-sm font-semibold text-white/80">مجموع بديل (0 إلى 10)</label>
                <Input value={overrideTotal} onChange={(e) => setOverrideTotal(e.target.value)} placeholder="فارغ لإزالة التعديل" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-white/80">السبب</label>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثال: خطأ في إدخال الفقه" />
              </div>
            </div>
            <Button fullWidth onClick={applyOverride} disabled={busy}>
              {busy ? "جاري التسجيل" : "تسجيل التعديل"}
            </Button>
          </div>
        </Card>
      ) : null}

      <Card className="p-5">
        <h3 className="text-xl font-bold">سجل التعديلات</h3>
        <p className="mt-1 text-sm text-white/70">آخر 50 عملية.</p>

        <div className="mt-4 space-y-2">
          {logs.length ? (
            logs.map((l) => (
              <div key={l.id} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {l.previous_total_points} → {l.new_total_points}
                    </p>
                    <p className="mt-1 text-xs text-white/60">{new Date(l.created_at).toLocaleString("ar")}</p>
                  </div>
                  <div className="text-left text-xs text-white/60">
                    {l.new_override_total === null ? "إزالة تعديل" : `تعديل: ${l.new_override_total}`}
                  </div>
                </div>
                <p className="mt-2 text-sm text-white/85">{l.reason}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-white/70">لا يوجد</p>
          )}
        </div>
      </Card>
    </div>
  );
}

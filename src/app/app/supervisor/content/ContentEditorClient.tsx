"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useGroup } from "@/components/GroupProvider";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { getErrorMessage } from "@/lib/errors";

type DayRow = {
  day_number: number;
  hadith_text: string;
  fiqh_statement_text: string;
  impact_task_text: string;
  correct_answer: boolean;
};

type ContentRow = {
  day_number: number;
  hadith_text: string;
  fiqh_statement_text: string;
  impact_task_text: string;
};

type AnswerRow = { day_number: number; correct_answer: boolean };

function Field({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-white/80">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-white/90 outline-none focus:border-[color:var(--gold)] focus:ring-2 focus:ring-[color:var(--gold)]/30"
      />
    </div>
  );
}

export function ContentEditorClient() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { group, userId } = useGroup();

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [days, setDays] = useState<DayRow[]>([]);
  const [selectedDay, setSelectedDay] = useState(1);

  const current = days.find((d) => d.day_number === selectedDay) ?? null;

  const [hadithText, setHadithText] = useState("");
  const [fiqhText, setFiqhText] = useState("");
  const [impactText, setImpactText] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState<boolean>(true);

  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setMessage(null);
      try {
        const [cRes, aRes] = await Promise.all([
          supabase
            .from("group_day_contents")
            .select("day_number,hadith_text,fiqh_statement_text,impact_task_text")
            .eq("group_id", group.id)
            .order("day_number", { ascending: true }),
          supabase
            .from("group_day_answer_keys")
            .select("day_number,correct_answer")
            .eq("group_id", group.id)
            .order("day_number", { ascending: true }),
        ]);
        if (cRes.error) throw cRes.error;
        if (aRes.error) throw aRes.error;

        const contentRows = (cRes.data ?? []) as ContentRow[];
        const answerRows = (aRes.data ?? []) as AnswerRow[];
        const byDay = new Map<number, ContentRow>(contentRows.map((r) => [r.day_number, r]));
        const byAns = new Map<number, AnswerRow>(answerRows.map((r) => [r.day_number, r]));

        const merged: DayRow[] = Array.from({ length: 30 }).map((_, i) => {
          const day = i + 1;
          const c = byDay.get(day);
          const a = byAns.get(day);
          return {
            day_number: day,
            hadith_text: c?.hadith_text ?? "",
            fiqh_statement_text: c?.fiqh_statement_text ?? "",
            impact_task_text: c?.impact_task_text ?? "",
            correct_answer: a?.correct_answer ?? true,
          };
        });

        if (!alive) return;
        setDays(merged);
      } catch (err: unknown) {
        if (!alive) return;
        const msg = getErrorMessage(err);
        setMessage(msg ? `تعذر تحميل المحتوى. ${msg}` : "تعذر تحميل المحتوى.");
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
    if (!current) return;
    setHadithText(current.hadith_text);
    setFiqhText(current.fiqh_statement_text);
    setImpactText(current.impact_task_text);
    setCorrectAnswer(current.correct_answer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDay, loading]);

  async function save() {
    if (!current) return;
    setBusy(true);
    setMessage(null);
    try {
      const updatesContent = {
        group_id: group.id,
        day_number: selectedDay,
        hadith_text: hadithText,
        fiqh_statement_text: fiqhText,
        impact_task_text: impactText,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      };

      const updatesAnswer = {
        group_id: group.id,
        day_number: selectedDay,
        correct_answer: correctAnswer,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      };

      const [cRes, aRes] = await Promise.all([
        supabase.from("group_day_contents").upsert(updatesContent, { onConflict: "group_id,day_number" }),
        supabase.from("group_day_answer_keys").upsert(updatesAnswer, { onConflict: "group_id,day_number" }),
      ]);
      if (cRes.error) throw cRes.error;
      if (aRes.error) throw aRes.error;

      setDays((prev) =>
        prev.map((d) =>
          d.day_number === selectedDay
            ? {
                ...d,
                hadith_text: hadithText,
                fiqh_statement_text: fiqhText,
                impact_task_text: impactText,
                correct_answer: correctAnswer,
              }
            : d,
        ),
      );

      setMessage("تم حفظ اليوم.");
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setMessage(msg ? `تعذر الحفظ. ${msg}` : "تعذر الحفظ.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="text-2xl font-bold">محرر الأيام</h2>
        <p className="mt-1 text-sm text-white/70">هذا المحتوى خاص بالمجموعة فقط.</p>

        {loading ? <p className="mt-5 text-sm text-white/70">جاري التحميل</p> : null}

        {message ? (
          <p className="mt-5 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/80">
            {message}
          </p>
        ) : null}

        <div className="mt-5 grid grid-cols-6 gap-2">
          {Array.from({ length: 30 }).map((_, i) => {
            const n = i + 1;
            const active = n === selectedDay;
            return (
              <button
                key={n}
                type="button"
                onClick={() => setSelectedDay(n)}
                className={cn(
                  "rounded-xl border border-white/10 bg-white/5 py-2 text-sm font-extrabold text-white/80 hover:bg-white/10",
                  active && "border-[color:var(--gold)]/60 bg-white/10 text-white",
                )}
              >
                {n}
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-bold">اليوم {selectedDay}</h3>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setCorrectAnswer(true)} disabled={busy}>
              الإجابة: صح
            </Button>
            <Button variant="secondary" onClick={() => setCorrectAnswer(false)} disabled={busy}>
              الإجابة: خطأ
            </Button>
          </div>
        </div>
        <p className="mt-2 text-sm text-white/70">
          مفتاح الإجابة لا يظهر للمشاركات. يظهر هنا فقط.
        </p>

        <div className="mt-5 space-y-4">
          <Field label="الحديث (مختصر)" value={hadithText} onChange={setHadithText} rows={5} />
          <Field label="فقه اليوم (عبارة صح أو خطأ)" value={fiqhText} onChange={setFiqhText} rows={4} />
          <Field label="مهمة الأثر" value={impactText} onChange={setImpactText} rows={3} />
        </div>

        <div className="mt-5">
          <Button fullWidth onClick={save} disabled={busy}>
            {busy ? "جاري الحفظ" : "حفظ"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

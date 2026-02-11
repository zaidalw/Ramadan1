"use client";

import confetti from "canvas-confetti";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useGroup } from "@/components/GroupProvider";
import type { DayContent, DayPost, Submission } from "@/lib/types";
import { addDaysYmd, formatLocalYmd, getTodayDayNumber, isEditableClient } from "@/lib/dates";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { getErrorMessage } from "@/lib/errors";

function SegButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 rounded-xl px-3 py-3 text-sm font-semibold transition",
        active ? "bg-[color:var(--gold)] text-[#102117]" : "bg-white/5 text-white/80 hover:bg-white/10",
      )}
    >
      {children}
    </button>
  );
}

function PointsSelector({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  options: Array<{ v: number; title: string; subtitle?: string }>;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-white/80">{label}</p>
      <div className="flex gap-2">
        {options.map((o) => (
          <SegButton key={o.v} active={value === o.v} onClick={() => onChange(o.v)}>
            <span className="block text-base">{o.title}</span>
            {o.subtitle ? <span className="mt-1 block text-[11px] opacity-80">{o.subtitle}</span> : null}
          </SegButton>
        ))}
      </div>
    </div>
  );
}

function TrueFalseSelector({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex gap-2">
      <SegButton active={value === true} onClick={() => onChange(true)}>
        صح
      </SegButton>
      <SegButton active={value === false} onClick={() => onChange(false)}>
        خطأ
      </SegButton>
    </div>
  );
}

function playPerfectSound() {
  type WebkitWindow = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };
  const AudioContextCtor = window.AudioContext || (window as WebkitWindow).webkitAudioContext;
  if (!AudioContextCtor) return;

  const ctx = new AudioContextCtor();
  const now = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(660, now);
  o.frequency.exponentialRampToValueAtTime(990, now + 0.08);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
  o.connect(g);
  g.connect(ctx.destination);
  o.start(now);
  o.stop(now + 0.26);
}

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

type DailyRow = { user_id: string; display_name: string; total_points: number };

export function HomeClient() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { group, userId, role } = useGroup();

  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<DayContent | null>(null);
  const [post, setPost] = useState<DayPost | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [dailyLeaderboard, setDailyLeaderboard] = useState<DailyRow[]>([]);

  const [quranPoints, setQuranPoints] = useState(0);
  const [hadithPoints, setHadithPoints] = useState(0);
  const [fiqhAnswer, setFiqhAnswer] = useState<boolean | null>(null);
  const [impactDone, setImpactDone] = useState(false);

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabledState] = useState(true);

  const todayDayNumber = getTodayDayNumber({ startDate: group.start_date, timeZone: group.timezone });
  const todayYmd = formatLocalYmd(group.timezone);

  const dayNumber = Math.max(1, Math.min(30, todayDayNumber));
  const dayYmd = addDaysYmd(group.start_date, dayNumber - 1);

  const playerEditable =
    role === "supervisor"
      ? true
      : isEditableClient({
          startDate: group.start_date,
          timeZone: group.timezone,
          cutoffTime: group.cutoff_time,
          dayNumber,
        });

  useEffect(() => {
    setSoundEnabledState(getSoundEnabled());
  }, []);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setMessage(null);
      try {
        const [contentRes, submissionRes, postRes, membersRes, daySubsRes] = await Promise.all([
          supabase
            .from("group_day_contents")
            .select("*")
            .eq("group_id", group.id)
            .eq("day_number", dayNumber)
            .maybeSingle(),
          supabase
            .from("submissions")
            .select("*")
            .eq("group_id", group.id)
            .eq("user_id", userId)
            .eq("day_number", dayNumber)
            .maybeSingle(),
          supabase
            .from("day_posts")
            .select("*")
            .eq("group_id", group.id)
            .eq("day_number", dayNumber)
            .maybeSingle(),
          supabase.from("group_members").select("user_id, display_name").eq("group_id", group.id),
          supabase.from("submissions").select("user_id, total_points").eq("group_id", group.id).eq("day_number", dayNumber),
        ]);

        if (!alive) return;

        const c = (contentRes.data as DayContent | null) ?? null;
        setContent(c);

        const s = (submissionRes.data as Submission | null) ?? null;
        setSubmission(s);

        if (s) {
          setQuranPoints(s.quran_points);
          setHadithPoints(s.hadith_points);
          setFiqhAnswer(s.fiqh_answer);
          setImpactDone(s.impact_done);
        } else {
          setQuranPoints(0);
          setHadithPoints(0);
          setFiqhAnswer(null);
          setImpactDone(false);
        }

        setPost((postRes.data as DayPost | null) ?? null);

        const members = (membersRes.data ?? []) as Array<{ user_id: string; display_name: string }>;
        const subs = (daySubsRes.data ?? []) as Array<{ user_id: string; total_points: number }>;
        const byUser = new Map(subs.map((r) => [r.user_id, r.total_points]));

        const rows: DailyRow[] = members.map((m) => ({
          user_id: m.user_id,
          display_name: m.display_name,
          total_points: byUser.get(m.user_id) ?? 0,
        }));

        rows.sort((a, b) => b.total_points - a.total_points || a.display_name.localeCompare(b.display_name, "ar"));
        setDailyLeaderboard(rows);
      } catch (err: unknown) {
        if (!alive) return;
        const msg = getErrorMessage(err);
        setMessage(msg ? `تعذر تحميل بيانات اليوم. ${msg}` : "تعذر تحميل بيانات اليوم.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group.id, dayNumber, userId]);

  function myRank() {
    const idx = dailyLeaderboard.findIndex((r) => r.user_id === userId);
    return idx >= 0 ? idx + 1 : null;
  }

  async function postToday() {
    setMessage(null);
    setBusy(true);
    try {
      const { error } = await supabase.from("day_posts").upsert(
        {
          group_id: group.id,
          day_number: dayNumber,
          posted_by: userId,
          posted_at: new Date().toISOString(),
        },
        { onConflict: "group_id,day_number" },
      );
      if (error) throw error;
      setPost({ group_id: group.id, day_number: dayNumber, posted_at: new Date().toISOString(), posted_by: userId });
      setMessage("تم نشر تحدي اليوم.");
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setMessage(msg ? `تعذر النشر. ${msg}` : "تعذر النشر.");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setMessage(null);
    if (fiqhAnswer === null) {
      setMessage("اختاري إجابة الفقه: صح أو خطأ.");
      return;
    }

    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("submissions")
        .upsert(
          {
            group_id: group.id,
            user_id: userId,
            day_number: dayNumber,
            quran_points: quranPoints,
            hadith_points: hadithPoints,
            fiqh_answer: fiqhAnswer,
            impact_done: impactDone,
          },
          { onConflict: "group_id,user_id,day_number" },
        )
        .select("*")
        .single();

      if (error) throw error;

      const row = data as Submission;
      setSubmission(row);

      // Refresh daily leaderboard for rank + share.
      const [membersRes, subsRes] = await Promise.all([
        supabase.from("group_members").select("user_id, display_name").eq("group_id", group.id),
        supabase.from("submissions").select("user_id, total_points").eq("group_id", group.id).eq("day_number", dayNumber),
      ]);
      const members = (membersRes.data ?? []) as Array<{ user_id: string; display_name: string }>;
      const subs = (subsRes.data ?? []) as Array<{ user_id: string; total_points: number }>;
      const byUser = new Map(subs.map((r) => [r.user_id, r.total_points]));
      const rows: DailyRow[] = members.map((m) => ({
        user_id: m.user_id,
        display_name: m.display_name,
        total_points: byUser.get(m.user_id) ?? 0,
      }));
      rows.sort((a, b) => b.total_points - a.total_points || a.display_name.localeCompare(b.display_name, "ar"));
      setDailyLeaderboard(rows);

      if (row.total_points === 10) {
        confetti({ particleCount: 120, spread: 60, origin: { y: 0.7 } });
        if (soundEnabled) playPerfectSound();
      }

      setMessage("تم حفظ نتيجة اليوم.");
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setMessage(msg ? `تعذر الحفظ. ${msg}` : "تعذر الحفظ.");
    } finally {
      setBusy(false);
    }
  }

  async function copyWhatsAppSummary() {
    const fiqhText = fiqhAnswer === null ? "غير محدد" : fiqhAnswer ? "صح" : "خطأ";
    const impactText = impactDone ? "2" : "0";
    const text = `(ورد: ${quranPoints} - حديث: ${hadithPoints} - فقه: ${fiqhText} - أثر: ${impactText})`;
    await navigator.clipboard.writeText(text);
    setMessage("تم نسخ ملخص واتساب.");
  }

  async function shareToday() {
    const total = submission?.total_points ?? 0;
    const rank = myRank();
    const text = `نتيجة اليوم: ${total}/10 - الترتيب: ${rank ?? "?"}`;

    try {
      // Prefer native share when available.
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        setMessage("تم نسخ النص للمشاركة.");
      }
    } catch {
      // user cancelled share
    }
  }

  if (todayDayNumber < 1 || todayDayNumber > 30) {
    return (
      <Card className="p-5">
        <p className="text-base font-semibold">لا يوجد تحدي لليوم.</p>
        <p className="mt-2 text-sm text-white/70">
          تحققي من تاريخ بداية المجموعة. اليوم المحلي: {todayYmd}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {role === "supervisor" ? (
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">صباح الخير</p>
              <p className="mt-1 text-xs text-white/70">انشري بطاقة اليوم لتظهر للجميع.</p>
            </div>
            <Button variant="secondary" onClick={postToday} disabled={busy}>
              {post ? "تم النشر" : "نشر اليوم"}
            </Button>
          </div>
        </Card>
      ) : post ? (
        <Card className="p-4">
          <p className="text-sm font-semibold">تم نشر تحدي اليوم.</p>
          <p className="mt-1 text-xs text-white/70">بالتوفيق</p>
        </Card>
      ) : (
        <Card className="p-4">
          <p className="text-sm font-semibold">لم يتم النشر بعد.</p>
          <p className="mt-1 text-xs text-white/70">قد تنشر المشرفة بطاقة اليوم قريبا.</p>
        </Card>
      )}

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-white/60">{dayYmd}</p>
            <h2 className="mt-1 text-2xl font-bold">اليوم {dayNumber}</h2>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center">
            <p className="text-[11px] font-semibold text-white/60">المجموع</p>
            <p className="mt-1 text-lg font-extrabold text-[color:var(--gold)]">
              {submission?.total_points ?? 0}/10
            </p>
          </div>
        </div>

        {loading ? (
          <p className="mt-5 text-sm text-white/70">جاري التحميل</p>
        ) : !content ? (
          <p className="mt-5 text-sm text-white/70">لا يوجد محتوى لهذا اليوم.</p>
        ) : (
          <>
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold text-white/60">الحديث (مختصر)</p>
                <p className="mt-2 text-base leading-7 text-white/90">{content.hadith_text}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold text-white/60">فقه اليوم (صح أو خطأ)</p>
                <p className="mt-2 text-base leading-7 text-white/90">{content.fiqh_statement_text}</p>
                <div className="mt-3">
                  <TrueFalseSelector value={fiqhAnswer} onChange={setFiqhAnswer} />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold text-white/60">مهمة الأثر</p>
                <p className="mt-2 text-base leading-7 text-white/90">{content.impact_task_text}</p>
                <label className="mt-3 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={impactDone}
                    onChange={(e) => setImpactDone(e.target.checked)}
                    className="h-5 w-5 accent-[color:var(--gold)]"
                  />
                  <span className="text-sm font-semibold">تم تنفيذ المهمة (2 نقاط)</span>
                </label>
              </div>

              <PointsSelector
                label="الورد (0 إلى 3)"
                value={quranPoints}
                onChange={setQuranPoints}
                options={[
                  { v: 0, title: "0" },
                  { v: 1, title: "1", subtitle: "نصف حزب" },
                  { v: 2, title: "2", subtitle: "حزب" },
                  { v: 3, title: "3", subtitle: "3 حزب ونصف أو أكثر" },
                ]}
              />

              <PointsSelector
                label="الحديث والتطبيق (0 إلى 3)"
                value={hadithPoints}
                onChange={setHadithPoints}
                options={[
                  { v: 0, title: "0" },
                  { v: 1, title: "1", subtitle: "حفظ جزئي" },
                  { v: 2, title: "2", subtitle: "حفظ كامل" },
                  { v: 3, title: "3", subtitle: "حفظ + تطبيق عملي" },
                ]}
              />
            </div>

            <div className="mt-5 space-y-3">
              {role !== "supervisor" && !playerEditable ? (
                <p className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/70">
                  تم إغلاق هذا اليوم بعد وقت الإغلاق. لا يمكن التعديل الآن.
                </p>
              ) : null}

              {message ? (
                <p className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/80">
                  {message}
                </p>
              ) : null}

              <Button fullWidth disabled={busy || (role !== "supervisor" && !playerEditable)} onClick={submit}>
                {busy ? "جاري الحفظ" : "حفظ"}
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" onClick={copyWhatsAppSummary} disabled={busy}>
                  نسخ ملخص واتساب
                </Button>
                <Button variant="secondary" onClick={shareToday} disabled={busy || !submission}>
                  مشاركة النتيجة
                </Button>
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
            </div>
          </>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">ترتيب اليوم</p>
            <p className="mt-1 text-xs text-white/60">يعتمد على نتيجة اليوم فقط.</p>
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold text-white/60">ترتيبك</p>
            <p className="mt-1 text-lg font-extrabold text-[color:var(--gold)]">{myRank() ?? "-"}</p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {dailyLeaderboard.slice(0, 7).map((r, i) => (
            <div
              key={r.user_id}
              className={cn(
                "flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm",
                r.user_id === userId && "border-[color:var(--gold)]/60 bg-white/10",
              )}
            >
              <div className="flex items-center gap-3">
                <span className="w-7 text-center text-xs font-extrabold text-white/70">{i + 1}</span>
                <span className="font-semibold">{r.display_name}</span>
              </div>
              <span className="font-extrabold text-[color:var(--gold)]">{r.total_points}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

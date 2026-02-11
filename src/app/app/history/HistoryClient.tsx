"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useGroup } from "@/components/GroupProvider";
import { addDaysYmd, formatLocalYmd, formatLocalHms } from "@/lib/dates";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { getErrorMessage } from "@/lib/errors";

type DayStatus = "submitted" | "not_submitted" | "locked" | "future";

export function HistoryClient() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { group, userId, role } = useGroup();

  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<Map<number, number>>(new Map());
  const [message, setMessage] = useState<string | null>(null);

  const todayYmd = formatLocalYmd(group.timezone);
  const localNowHms = formatLocalHms(group.timezone);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setMessage(null);
      try {
        const { data, error } = await supabase
          .from("submissions")
          .select("day_number,total_points")
          .eq("group_id", group.id)
          .eq("user_id", userId);
        if (error) throw error;
        const map = new Map<number, number>();
        const rows = (data ?? []) as Array<{ day_number: number; total_points: number }>;
        rows.forEach((r) => map.set(r.day_number, r.total_points));
        if (!alive) return;
        setScores(map);
      } catch (err: unknown) {
        if (!alive) return;
        const msg = getErrorMessage(err);
        setMessage(msg ? `تعذر تحميل السجل. ${msg}` : "تعذر تحميل السجل.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [group.id, userId, supabase]);

  function statusForDay(dayNumber: number): DayStatus {
    const dayYmd = addDaysYmd(group.start_date, dayNumber - 1);

    if (dayYmd > todayYmd) return "future";
    if (scores.has(dayNumber)) return "submitted";

    if (dayYmd < todayYmd) return "locked";

    // today and not submitted
    if (role === "supervisor") return "not_submitted";
    return localNowHms < group.cutoff_time ? "not_submitted" : "locked";
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">السجل</h2>
          <p className="mt-1 text-sm text-white/70">أيام 1 إلى 30</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center">
          <p className="text-[11px] font-semibold text-white/60">مجموعك</p>
          <p className="mt-1 text-lg font-extrabold text-[color:var(--gold)]">
            {Array.from(scores.values()).reduce((a, b) => a + b, 0)}
          </p>
        </div>
      </div>

      {loading ? <p className="mt-5 text-sm text-white/70">جاري التحميل</p> : null}
      {message ? (
        <p className="mt-5 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/80">
          {message}
        </p>
      ) : null}

      <div className="mt-5 grid grid-cols-5 gap-2">
        {Array.from({ length: 30 }).map((_, i) => {
          const dayNumber = i + 1;
          const status = statusForDay(dayNumber);
          const total = scores.get(dayNumber) ?? 0;
          const dayYmd = addDaysYmd(group.start_date, dayNumber - 1);

          return (
            <div
              key={dayNumber}
              className={cn(
                "rounded-2xl border border-white/10 bg-white/5 p-3 text-center",
                status === "submitted" && "border-[color:var(--gold)]/60 bg-white/10",
                status === "locked" && "opacity-70",
                status === "future" && "opacity-50",
              )}
            >
              <p className="text-xs font-semibold text-white/60">{dayYmd.slice(5)}</p>
              <p className="mt-1 text-lg font-extrabold">{dayNumber}</p>
              <p className="mt-1 text-xs font-semibold text-[color:var(--gold)]">{total}/10</p>
              <p className="mt-1 text-[11px] text-white/60">
                {status === "submitted"
                  ? "تم"
                  : status === "not_submitted"
                    ? "لم يتم"
                    : status === "locked"
                      ? "مقفل"
                      : "قادم"}
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useGroup } from "@/components/GroupProvider";
import { addDaysYmd } from "@/lib/dates";
import { Button } from "@/components/ui/Button";
import { getErrorMessage } from "@/lib/errors";

type Member = { user_id: string; display_name: string };
type SubRow = { user_id: string; day_number: number; total_points: number };

export function PrintScoreboardClient() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { group } = useGroup();

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [subs, setSubs] = useState<SubRow[]>([]);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setMessage(null);
      try {
        const [mRes, sRes] = await Promise.all([
          supabase
            .from("group_members")
            .select("user_id,display_name")
            .eq("group_id", group.id)
            .order("joined_at", { ascending: true }),
          supabase.from("submissions").select("user_id,day_number,total_points").eq("group_id", group.id),
        ]);
        if (mRes.error) throw mRes.error;
        if (sRes.error) throw sRes.error;
        if (!alive) return;
        setMembers(((mRes.data ?? []) as Member[]).slice(0, 7));
        setSubs((sRes.data ?? []) as SubRow[]);
      } catch (err: unknown) {
        if (!alive) return;
        const msg = getErrorMessage(err);
        setMessage(msg ? `تعذر تحميل بيانات الطباعة. ${msg}` : "تعذر تحميل بيانات الطباعة.");
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

  const byUserDay = useMemo(() => {
    const map = new Map<string, Map<number, number>>();
    subs.forEach((s) => {
      const m = map.get(s.user_id) ?? new Map<number, number>();
      m.set(s.day_number, s.total_points);
      map.set(s.user_id, m);
    });
    return map;
  }, [subs]);

  const totalsByUser = useMemo(() => {
    const map = new Map<string, number>();
    members.forEach((m) => {
      const days = byUserDay.get(m.user_id) ?? new Map<number, number>();
      let total = 0;
      for (let d = 1; d <= 30; d++) total += days.get(d) ?? 0;
      map.set(m.user_id, total);
    });
    return map;
  }, [members, byUserDay]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/70">
        جاري التحميل
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 print:border-black print:bg-white print:p-0">
      <div className="no-print mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">لوحة الطباعة</h2>
          <p className="mt-1 text-sm text-white/70">7 مشاركات - 30 يوما</p>
        </div>
        <Button variant="secondary" onClick={() => window.print()}>
          طباعة
        </Button>
      </div>

      {message ? (
        <p className="no-print mb-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/80">
          {message}
        </p>
      ) : null}

      <div className="overflow-auto print:overflow-visible">
        <table className="w-full border-collapse text-sm print:text-[11px]">
          <thead>
            <tr className="bg-white/5 print:bg-white">
              <th className="border border-white/10 p-2 text-right font-extrabold print:border-black">اليوم</th>
              {members.map((m) => (
                <th key={m.user_id} className="border border-white/10 p-2 text-right font-extrabold print:border-black">
                  {m.display_name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 30 }).map((_, i) => {
              const day = i + 1;
              const dayYmd = addDaysYmd(group.start_date, day - 1);
              return (
                <tr key={day}>
                  <td className="border border-white/10 p-2 align-top font-semibold print:border-black">
                    <div className="flex items-center justify-between gap-2">
                      <span>{day}</span>
                      <span className="text-xs text-white/50 print:text-black/60">{dayYmd.slice(5)}</span>
                    </div>
                  </td>
                  {members.map((m) => {
                    const v = byUserDay.get(m.user_id)?.get(day) ?? "";
                    return (
                      <td key={m.user_id} className="border border-white/10 p-2 text-center font-semibold print:border-black">
                        {v}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            <tr className="bg-white/5 print:bg-white">
              <td className="border border-white/10 p-2 font-extrabold print:border-black">المجموع</td>
              {members.map((m) => (
                <td
                  key={m.user_id}
                  className="border border-white/10 p-2 text-center font-extrabold text-[color:var(--gold)] print:border-black print:text-black"
                >
                  {totalsByUser.get(m.user_id) ?? 0}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <style>{`
        @media print {
          table { direction: rtl; }
          th, td { color: #111 !important; }
        }
      `}</style>
    </div>
  );
}

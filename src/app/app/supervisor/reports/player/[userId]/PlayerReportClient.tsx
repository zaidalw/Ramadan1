"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useGroup } from "@/components/GroupProvider";
import { addDaysYmd } from "@/lib/dates";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getErrorMessage } from "@/lib/errors";

type SubRow = {
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

export function PlayerReportClient({ targetUserId }: { targetUserId: string }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { group } = useGroup();

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("...");
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
            .select("display_name")
            .eq("group_id", group.id)
            .eq("user_id", targetUserId)
            .single(),
          supabase
            .from("submissions")
            .select("day_number,quran_points,hadith_points,fiqh_points,impact_points,auto_total,override_total,total_points,updated_at")
            .eq("group_id", group.id)
            .eq("user_id", targetUserId)
            .order("day_number", { ascending: true }),
        ]);
        if (mRes.error) throw mRes.error;
        if (sRes.error) throw sRes.error;
        if (!alive) return;
        const name = (mRes.data as { display_name?: string } | null)?.display_name;
        setDisplayName(name ?? targetUserId.slice(0, 6));
        setSubs((sRes.data ?? []) as SubRow[]);
      } catch (err: unknown) {
        if (!alive) return;
        const msg = getErrorMessage(err);
        setMessage(msg ? `تعذر تحميل التقرير. ${msg}` : "تعذر تحميل التقرير.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [group.id, targetUserId, supabase]);

  const total = subs.reduce((a, b) => a + b.total_points, 0);
  const daysSubmitted = subs.length;
  const avg = daysSubmitted ? Math.round((total / daysSubmitted) * 10) / 10 : 0;

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="no-print mb-3">
          <Link href="/app/supervisor/reports" className="text-sm font-semibold text-white/75 hover:text-white">
            رجوع للتقارير
          </Link>
        </div>

        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">تقرير مشاركة</h2>
            <p className="mt-1 text-sm text-white/70">{displayName}</p>
          </div>
          <div className="no-print">
            <Button variant="secondary" onClick={() => window.print()}>
              طباعة
            </Button>
          </div>
        </div>

        {loading ? <p className="mt-5 text-sm text-white/70">جاري التحميل</p> : null}
        {message ? (
          <p className="mt-5 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/80">{message}</p>
        ) : null}

        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
            <p className="text-xs font-semibold text-white/60">الإجمالي</p>
            <p className="mt-2 text-2xl font-extrabold text-[color:var(--gold)]">{total}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
            <p className="text-xs font-semibold text-white/60">أيام مسجلة</p>
            <p className="mt-2 text-2xl font-extrabold text-[color:var(--gold)]">{daysSubmitted}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
            <p className="text-xs font-semibold text-white/60">متوسط</p>
            <p className="mt-2 text-2xl font-extrabold text-[color:var(--gold)]">{avg}</p>
          </div>
        </div>
      </Card>

      <Card className="p-5 print:bg-white print:text-black print:border-black">
        <h3 className="text-xl font-bold">تفاصيل الأيام</h3>
        <p className="mt-1 text-sm text-white/70">المجموع يعكس التعديل اليدوي إن وجد.</p>

        <div className="mt-4 overflow-auto print:overflow-visible">
          <table className="w-full border-collapse text-sm print:text-[11px]">
            <thead>
              <tr className="bg-white/5 print:bg-white">
                <th className="border border-white/10 p-2 text-right font-extrabold print:border-black">اليوم</th>
                <th className="border border-white/10 p-2 text-right font-extrabold print:border-black">ورد</th>
                <th className="border border-white/10 p-2 text-right font-extrabold print:border-black">حديث</th>
                <th className="border border-white/10 p-2 text-right font-extrabold print:border-black">فقه</th>
                <th className="border border-white/10 p-2 text-right font-extrabold print:border-black">أثر</th>
                <th className="border border-white/10 p-2 text-right font-extrabold print:border-black">المجموع</th>
                <th className="border border-white/10 p-2 text-right font-extrabold print:border-black">آخر تحديث</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 30 }).map((_, i) => {
                const day = i + 1;
                const row = subs.find((s) => s.day_number === day) ?? null;
                const dayYmd = addDaysYmd(group.start_date, day - 1);
                return (
                  <tr key={day}>
                    <td className="border border-white/10 p-2 font-semibold print:border-black">
                      <div className="flex items-center justify-between gap-2">
                        <span>{day}</span>
                        <span className="text-xs text-white/50 print:text-black/60">{dayYmd.slice(5)}</span>
                      </div>
                    </td>
                    <td className="border border-white/10 p-2 text-center font-semibold print:border-black">
                      {row ? row.quran_points : ""}
                    </td>
                    <td className="border border-white/10 p-2 text-center font-semibold print:border-black">
                      {row ? row.hadith_points : ""}
                    </td>
                    <td className="border border-white/10 p-2 text-center font-semibold print:border-black">
                      {row ? row.fiqh_points : ""}
                    </td>
                    <td className="border border-white/10 p-2 text-center font-semibold print:border-black">
                      {row ? row.impact_points : ""}
                    </td>
                    <td className="border border-white/10 p-2 text-center font-extrabold text-[color:var(--gold)] print:border-black print:text-black">
                      {row ? `${row.total_points}/10` : ""}
                    </td>
                    <td className="border border-white/10 p-2 text-xs text-white/60 print:border-black print:text-black/70">
                      {row ? new Date(row.updated_at).toLocaleString("ar") : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <style>{`
        @media print {
          th, td { color: #111 !important; }
        }
      `}</style>
    </div>
  );
}

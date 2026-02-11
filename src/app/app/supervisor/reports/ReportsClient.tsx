"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useGroup } from "@/components/GroupProvider";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { Submission } from "@/lib/types";
import { getErrorMessage } from "@/lib/errors";

type Member = { user_id: string; display_name: string };
type SubmissionRow = Submission;

function csvEscape(v: unknown) {
  const s = v === null || v === undefined ? "" : String(v);
  if (s.includes('"') || s.includes(",") || s.includes("\n")) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

export function ReportsClient() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { group } = useGroup();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setMessage(null);
      try {
        const { data, error } = await supabase
          .from("group_members")
          .select("user_id,display_name")
          .eq("group_id", group.id)
          .order("joined_at", { ascending: true });
        if (error) throw error;
        if (!alive) return;
        setMembers((data ?? []) as Member[]);
      } catch (err: unknown) {
        if (!alive) return;
        const msg = getErrorMessage(err);
        setMessage(msg ? `تعذر تحميل الأعضاء. ${msg}` : "تعذر تحميل الأعضاء.");
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

  async function exportCsv() {
    setBusy(true);
    setMessage(null);
    try {
      const { data, error } = await supabase
        .from("submissions")
        .select("*")
        .eq("group_id", group.id)
        .order("day_number", { ascending: true })
        .order("updated_at", { ascending: true });
      if (error) throw error;

      const nameById = new Map(members.map((m) => [m.user_id, m.display_name]));
      const rows = (data ?? []) as SubmissionRow[];

      const header = [
        "group_id",
        "group_name",
        "day_number",
        "user_id",
        "display_name",
        "quran_points",
        "hadith_points",
        "fiqh_answer",
        "fiqh_points",
        "impact_done",
        "impact_points",
        "auto_total",
        "override_total",
        "total_points",
        "created_at",
        "updated_at",
      ];

      const lines = [header.join(",")];
      for (const r of rows) {
        const line = [
          group.id,
          group.name,
          r.day_number,
          r.user_id,
          nameById.get(r.user_id) ?? "",
          r.quran_points,
          r.hadith_points,
          r.fiqh_answer,
          r.fiqh_points,
          r.impact_done,
          r.impact_points,
          r.auto_total,
          r.override_total,
          r.total_points,
          r.created_at,
          r.updated_at,
        ]
          .map(csvEscape)
          .join(",");
        lines.push(line);
      }

      const csv = lines.join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ramadan-daily-challenge-${group.invite_code}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setMessage("تم تنزيل ملف CSV.");
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setMessage(msg ? `تعذر التصدير. ${msg}` : "تعذر التصدير.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="text-2xl font-bold">التقارير والطباعة</h2>
        <p className="mt-1 text-sm text-white/70">تصدير CSV وصفحات طباعة واضحة.</p>

        {message ? (
          <p className="mt-5 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/80">
            {message}
          </p>
        ) : null}

        <div className="mt-5 grid gap-2">
          <Button fullWidth variant="secondary" onClick={exportCsv} disabled={busy}>
            {busy ? "جاري التصدير" : "تحميل CSV لكل التسجيلات"}
          </Button>
          <Link
            href="/app/supervisor/reports/print"
            className="flex h-12 w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sm font-semibold text-white/80 hover:bg-white/10"
          >
            فتح صفحة الطباعة (لوحة 7 مشاركات)
          </Link>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-xl font-bold">تقارير فردية</h3>
        <p className="mt-1 text-sm text-white/70">ملخص ونقاط يومية لكل مشاركة.</p>

        {loading ? <p className="mt-5 text-sm text-white/70">جاري التحميل</p> : null}

        <div className="mt-4 space-y-2">
          {members.map((m) => (
            <Link
              key={m.user_id}
              href={`/app/supervisor/reports/player/${m.user_id}`}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm hover:bg-white/10"
            >
              <span className="font-semibold">{m.display_name}</span>
              <span className="text-xs font-semibold text-white/60">فتح</span>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}

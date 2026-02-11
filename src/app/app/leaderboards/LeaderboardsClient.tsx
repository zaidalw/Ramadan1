"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useGroup } from "@/components/GroupProvider";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { getTodayDayNumber } from "@/lib/dates";
import { getErrorMessage } from "@/lib/errors";

type Member = { user_id: string; display_name: string };
type SubRow = { user_id: string; day_number: number; total_points: number };

type Tab = "daily" | "overall" | "streaks";

export function LeaderboardsClient() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { group, userId } = useGroup();

  const [tab, setTab] = useState<Tab>("daily");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const [members, setMembers] = useState<Member[]>([]);
  const [subs, setSubs] = useState<SubRow[]>([]);

  const todayDayNumber = Math.max(1, Math.min(30, getTodayDayNumber({ startDate: group.start_date, timeZone: group.timezone })));

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setMessage(null);
      try {
        const [mRes, sRes] = await Promise.all([
          supabase.from("group_members").select("user_id,display_name").eq("group_id", group.id),
          supabase.from("submissions").select("user_id,day_number,total_points").eq("group_id", group.id),
        ]);
        if (mRes.error) throw mRes.error;
        if (sRes.error) throw sRes.error;
        if (!alive) return;
        setMembers((mRes.data ?? []) as Member[]);
        setSubs((sRes.data ?? []) as SubRow[]);
      } catch (err: unknown) {
        if (!alive) return;
        const msg = getErrorMessage(err);
        setMessage(msg ? `تعذر تحميل الترتيب. ${msg}` : "تعذر تحميل الترتيب.");
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

  const byUser = useMemo(() => {
    const map = new Map<string, { byDay: Map<number, number>; total: number }>();
    members.forEach((m) => map.set(m.user_id, { byDay: new Map(), total: 0 }));
    subs.forEach((s) => {
      const entry = map.get(s.user_id);
      if (!entry) return;
      entry.byDay.set(s.day_number, s.total_points);
      entry.total += s.total_points;
    });
    return map;
  }, [members, subs]);

  const dailyRows = useMemo(() => {
    const rows = members.map((m) => ({
      user_id: m.user_id,
      display_name: m.display_name,
      total_points: byUser.get(m.user_id)?.byDay.get(todayDayNumber) ?? 0,
    }));
    rows.sort((a, b) => b.total_points - a.total_points || a.display_name.localeCompare(b.display_name, "ar"));
    return rows;
  }, [members, byUser, todayDayNumber]);

  const overallRows = useMemo(() => {
    const rows = members.map((m) => ({
      user_id: m.user_id,
      display_name: m.display_name,
      total_points: byUser.get(m.user_id)?.total ?? 0,
    }));
    rows.sort((a, b) => b.total_points - a.total_points || a.display_name.localeCompare(b.display_name, "ar"));
    return rows;
  }, [members, byUser]);

  const streakRows = useMemo(() => {
    const rows = members.map((m) => {
      const days = byUser.get(m.user_id)?.byDay ?? new Map<number, number>();
      let streak = 0;
      for (let d = todayDayNumber; d >= 1; d--) {
        if (days.has(d)) streak += 1;
        else break;
      }
      return { user_id: m.user_id, display_name: m.display_name, streak };
    });
    rows.sort((a, b) => b.streak - a.streak || a.display_name.localeCompare(b.display_name, "ar"));
    return rows;
  }, [members, byUser, todayDayNumber]);

  function Row({
    index,
    name,
    value,
    highlight,
  }: {
    index: number;
    name: string;
    value: string;
    highlight: boolean;
  }) {
    return (
      <div
        className={cn(
          "flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm",
          highlight && "border-[color:var(--gold)]/60 bg-white/10",
        )}
      >
        <div className="flex items-center gap-3">
          <span className="w-7 text-center text-xs font-extrabold text-white/70">{index}</span>
          <span className="font-semibold">{name}</span>
        </div>
        <span className="font-extrabold text-[color:var(--gold)]">{value}</span>
      </div>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">لوحة الترتيب</h2>
          <p className="mt-1 text-sm text-white/70">التنافس داخل المجموعة فقط.</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center">
          <p className="text-[11px] font-semibold text-white/60">اليوم</p>
          <p className="mt-1 text-lg font-extrabold text-[color:var(--gold)]">{todayDayNumber}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Button type="button" variant={tab === "daily" ? "primary" : "secondary"} onClick={() => setTab("daily")}>
          اليوم
        </Button>
        <Button
          type="button"
          variant={tab === "overall" ? "primary" : "secondary"}
          onClick={() => setTab("overall")}
        >
          الإجمالي
        </Button>
        <Button
          type="button"
          variant={tab === "streaks" ? "primary" : "secondary"}
          onClick={() => setTab("streaks")}
        >
          السلاسل
        </Button>
      </div>

      {loading ? <p className="mt-5 text-sm text-white/70">جاري التحميل</p> : null}
      {message ? (
        <p className="mt-5 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/80">
          {message}
        </p>
      ) : null}

      <div className="mt-5 space-y-2">
        {tab === "daily"
          ? dailyRows.map((r, i) => (
              <Row
                key={r.user_id}
                index={i + 1}
                name={r.display_name}
                value={`${r.total_points}/10`}
                highlight={r.user_id === userId}
              />
            ))
          : null}
        {tab === "overall"
          ? overallRows.map((r, i) => (
              <Row
                key={r.user_id}
                index={i + 1}
                name={r.display_name}
                value={`${r.total_points}`}
                highlight={r.user_id === userId}
              />
            ))
          : null}
        {tab === "streaks"
          ? streakRows.map((r, i) => (
              <Row
                key={r.user_id}
                index={i + 1}
                name={r.display_name}
                value={`${r.streak}`}
                highlight={r.user_id === userId}
              />
            ))
          : null}
      </div>
    </Card>
  );
}

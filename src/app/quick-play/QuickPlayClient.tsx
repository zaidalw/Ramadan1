"use client";

import { useEffect, useMemo, useState } from "react";
import confetti from "canvas-confetti";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

type Entry = {
  quranPoints: number;
  hadithPoints: number;
  fiqhAnswer: boolean;
  impactDone: boolean;
  total: number;
};

type QuickState = {
  groupName: string;
  players: string[];
  correctAnswers: Record<number, boolean>;
  entries: Record<string, Record<number, Entry>>;
};

const STORAGE_KEY = "rdc_quick_game_v1";

function defaultState(): QuickState {
  const correctAnswers: Record<number, boolean> = {};
  for (let d = 1; d <= 30; d++) correctAnswers[d] = true;
  return {
    groupName: "تحدي رمضان السريع",
    players: ["المشاركة 1", "المشاركة 2", "المشاركة 3", "المشاركة 4", "المشاركة 5", "المشاركة 6", "المشاركة 7"],
    correctAnswers,
    entries: {},
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function calcTotal({
  quranPoints,
  hadithPoints,
  fiqhAnswer,
  correctAnswer,
  impactDone,
}: {
  quranPoints: number;
  hadithPoints: number;
  fiqhAnswer: boolean;
  correctAnswer: boolean;
  impactDone: boolean;
}) {
  const fiqhPoints = fiqhAnswer === correctAnswer ? 2 : 0;
  const impactPoints = impactDone ? 2 : 0;
  return clamp(quranPoints + hadithPoints + fiqhPoints + impactPoints, 0, 10);
}

function PointsSelector({
  label,
  value,
  onChange,
  max,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  max: number;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-white/80">{label}</p>
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: max + 1 }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i)}
            className={cn(
              "rounded-xl border border-white/10 py-3 text-sm font-bold",
              value === i ? "bg-[color:var(--gold)] text-[#102117]" : "bg-white/5 text-white/85 hover:bg-white/10",
            )}
          >
            {i}
          </button>
        ))}
      </div>
    </div>
  );
}

export function QuickPlayClient() {
  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState<QuickState>(defaultState());
  const [message, setMessage] = useState<string | null>(null);

  const [dayNumber, setDayNumber] = useState(1);
  const [playerName, setPlayerName] = useState("المشاركة 1");
  const [quranPoints, setQuranPoints] = useState(0);
  const [hadithPoints, setHadithPoints] = useState(0);
  const [fiqhAnswer, setFiqhAnswer] = useState<boolean>(true);
  const [impactDone, setImpactDone] = useState(false);

  const [playersText, setPlayersText] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as QuickState;
        setState(parsed);
        setPlayerName(parsed.players[0] ?? "المشاركة 1");
        setPlayersText(parsed.players.join("\n"));
      } else {
        const initial = defaultState();
        setState(initial);
        setPlayerName(initial.players[0] ?? "المشاركة 1");
        setPlayersText(initial.players.join("\n"));
      }
    } catch {
      const initial = defaultState();
      setState(initial);
      setPlayerName(initial.players[0] ?? "المشاركة 1");
      setPlayersText(initial.players.join("\n"));
    } finally {
      setHydrated(true);
    }
  }, []);

  function persist(next: QuickState) {
    setState(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  const todayEntry = state.entries[playerName]?.[dayNumber] ?? null;
  const correctAnswer = state.correctAnswers[dayNumber] ?? true;
  const projected = calcTotal({
    quranPoints,
    hadithPoints,
    fiqhAnswer,
    correctAnswer,
    impactDone,
  });

  function savePlayers() {
    const nextPlayers = playersText
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 20);

    if (nextPlayers.length < 2) {
      setMessage("أدخلي على الأقل مشاركتين.");
      return;
    }

    const next: QuickState = {
      ...state,
      players: nextPlayers,
    };
    persist(next);
    if (!nextPlayers.includes(playerName)) setPlayerName(nextPlayers[0]);
    setMessage("تم حفظ الأسماء.");
  }

  function saveAnswerKey(value: boolean) {
    const next: QuickState = {
      ...state,
      correctAnswers: { ...state.correctAnswers, [dayNumber]: value },
    };
    persist(next);
    setMessage(`تم حفظ مفتاح اليوم ${dayNumber}.`);
  }

  function saveEntry() {
    if (!state.players.includes(playerName)) {
      setMessage("اختاري مشاركة صحيحة.");
      return;
    }

    const total = calcTotal({
      quranPoints,
      hadithPoints,
      fiqhAnswer,
      correctAnswer,
      impactDone,
    });

    const entry: Entry = {
      quranPoints,
      hadithPoints,
      fiqhAnswer,
      impactDone,
      total,
    };

    const next: QuickState = {
      ...state,
      entries: {
        ...state.entries,
        [playerName]: {
          ...(state.entries[playerName] ?? {}),
          [dayNumber]: entry,
        },
      },
    };
    persist(next);

    if (total === 10) {
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.68 } });
    }

    setMessage("تم حفظ النتيجة.");
  }

  const dailyRows = useMemo(() => {
    const rows = state.players.map((name) => ({
      name,
      total: state.entries[name]?.[dayNumber]?.total ?? 0,
    }));
    rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "ar"));
    return rows;
  }, [state.players, state.entries, dayNumber]);

  const overallRows = useMemo(() => {
    const rows = state.players.map((name) => {
      const days = state.entries[name] ?? {};
      const total = Object.values(days).reduce((sum, r) => sum + r.total, 0);
      return { name, total };
    });
    rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "ar"));
    return rows;
  }, [state.players, state.entries]);

  async function copyShareText() {
    const rank = dailyRows.findIndex((r) => r.name === playerName) + 1;
    const total = state.entries[playerName]?.[dayNumber]?.total ?? projected;
    const text = `نتيجة اليوم: ${total}/10 - الترتيب: ${rank || "?"}`;
    await navigator.clipboard.writeText(text);
    setMessage("تم نسخ نص المشاركة.");
  }

  async function copyInvite() {
    await navigator.clipboard.writeText(window.location.href);
    setMessage("تم نسخ رابط اللعبة.");
  }

  function resetLocal() {
    const next = defaultState();
    persist(next);
    setPlayersText(next.players.join("\n"));
    setPlayerName(next.players[0]);
    setDayNumber(1);
    setQuranPoints(0);
    setHadithPoints(0);
    setFiqhAnswer(true);
    setImpactDone(false);
    setMessage("تم تصفير اللعبة المحلية.");
  }

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-md px-5 py-8">
        <Card className="p-5">
          <p className="text-sm text-white/70">جاري تحميل اللعبة</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[color:var(--background)] text-[color:var(--foreground)]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(900px_500px_at_50%_-20%,rgba(247,211,122,0.14),transparent_60%),radial-gradient(700px_460px_at_6%_12%,rgba(255,255,255,0.05),transparent_55%),radial-gradient(700px_460px_at_94%_18%,rgba(255,255,255,0.05),transparent_55%)]"
      />
      <main className="relative mx-auto max-w-md space-y-4 px-5 py-6">
        <Card className="p-5">
          <h1 className="text-2xl font-bold">تحدي رمضان - وضع سريع</h1>
          <p className="mt-1 text-sm text-white/70">
            يعمل مباشرة بدون إعدادات. مناسب للمشاركة السريعة بالرابط.
          </p>
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" onClick={copyInvite}>
              نسخ رابط اللعبة
            </Button>
            <Button variant="secondary" onClick={resetLocal}>
              تصفير
            </Button>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-xl font-bold">إعداد المجموعة</h2>

          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-white/80">اسم المجموعة</label>
              <Input
                value={state.groupName}
                onChange={(e) => persist({ ...state, groupName: e.target.value })}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white/80">أسماء المشاركات (كل اسم في سطر)</label>
              <textarea
                value={playersText}
                onChange={(e) => setPlayersText(e.target.value)}
                rows={6}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 outline-none focus:border-[color:var(--gold)] focus:ring-2 focus:ring-[color:var(--gold)]/30"
              />
              <div className="mt-3">
                <Button variant="secondary" onClick={savePlayers}>
                  حفظ الأسماء
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-xl font-bold">تسجيل اليوم</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-white/80">اليوم</label>
              <Input
                type="number"
                min={1}
                max={30}
                value={dayNumber}
                onChange={(e) => setDayNumber(clamp(Number(e.target.value) || 1, 1, 30))}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-white/80">المشاركة</label>
              <select
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm outline-none focus:border-[color:var(--gold)] focus:ring-2 focus:ring-[color:var(--gold)]/30"
              >
                {state.players.map((p) => (
                  <option key={p} value={p} className="text-black">
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-semibold">مفتاح الفقه (للمشرفة في هذا الوضع)</p>
            <p className="mt-1 text-xs text-white/60">اليوم {dayNumber}</p>
            <div className="mt-3 flex gap-2">
              <Button
                variant={correctAnswer ? "primary" : "secondary"}
                size="sm"
                onClick={() => saveAnswerKey(true)}
              >
                الإجابة: صح
              </Button>
              <Button
                variant={!correctAnswer ? "primary" : "secondary"}
                size="sm"
                onClick={() => saveAnswerKey(false)}
              >
                الإجابة: خطأ
              </Button>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <PointsSelector label="الورد (0 - 3)" value={quranPoints} onChange={setQuranPoints} max={3} />
            <PointsSelector label="الحديث (0 - 3)" value={hadithPoints} onChange={setHadithPoints} max={3} />

            <div>
              <p className="mb-2 text-sm font-semibold text-white/80">فقه اليوم (صح أو خطأ)</p>
              <div className="flex gap-2">
                <Button
                  variant={fiqhAnswer ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setFiqhAnswer(true)}
                >
                  صح
                </Button>
                <Button
                  variant={!fiqhAnswer ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setFiqhAnswer(false)}
                >
                  خطأ
                </Button>
              </div>
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm font-semibold">
              <input
                type="checkbox"
                checked={impactDone}
                onChange={(e) => setImpactDone(e.target.checked)}
                className="h-5 w-5 accent-[color:var(--gold)]"
              />
              تم تنفيذ مهمة الأثر (2 نقاط)
            </label>
          </div>

          {todayEntry ? (
            <p className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/80">
              نتيجة محفوظة لليوم {dayNumber}: {todayEntry.total}/10
            </p>
          ) : null}

          {message ? (
            <p className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/80">
              {message}
            </p>
          ) : null}

          <div className="mt-4 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">
              المجموع المتوقع: <span className="text-[color:var(--gold)]">{projected}/10</span>
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={copyShareText}>
                نسخ نتيجة
              </Button>
              <Button onClick={saveEntry}>حفظ</Button>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-xl font-bold">ترتيب اليوم {dayNumber}</h2>
          <div className="mt-4 space-y-2">
            {dailyRows.map((r, i) => (
              <div
                key={`${r.name}-${dayNumber}`}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 text-center text-xs font-bold text-white/70">{i + 1}</span>
                  <span className="font-semibold">{r.name}</span>
                </div>
                <span className="font-extrabold text-[color:var(--gold)]">{r.total}/10</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-xl font-bold">الترتيب الإجمالي</h2>
          <div className="mt-4 space-y-2">
            {overallRows.map((r, i) => (
              <div
                key={`overall-${r.name}`}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 text-center text-xs font-bold text-white/70">{i + 1}</span>
                  <span className="font-semibold">{r.name}</span>
                </div>
                <span className="font-extrabold text-[color:var(--gold)]">{r.total}</span>
              </div>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
}


"use client";

import { useEffect, useMemo, useState } from "react";
import confetti from "canvas-confetti";
import seedDayTemplates from "../../../supabase/seed/day-templates.json";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

type DayTemplate = {
  dayNumber: number;
  hadithText: string;
  fiqhStatementText: string;
  impactTaskText: string;
  correctAnswer: boolean;
};

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
  dayTemplates: DayTemplate[];
  entries: Record<string, Record<number, Entry>>;
};

type LegacyQuickState = Partial<QuickState> & {
  correctAnswers?: Record<number, boolean>;
};

const STORAGE_KEY = "rdc_quick_game_v2";
const DEFAULT_PLAYERS = [
  "المشاركة 1",
  "المشاركة 2",
  "المشاركة 3",
  "المشاركة 4",
  "المشاركة 5",
  "المشاركة 6",
  "المشاركة 7",
];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function buildDayTemplates(raw: unknown): DayTemplate[] {
  const map = new Map<number, DayTemplate>();

  for (let day = 1; day <= 30; day += 1) {
    map.set(day, {
      dayNumber: day,
      hadithText: `حديث اليوم ${day}`,
      fiqhStatementText: `سؤال الفقه لليوم ${day}`,
      impactTaskText: `مهمة الأثر لليوم ${day}`,
      correctAnswer: true,
    });
  }

  if (Array.isArray(raw)) {
    raw.forEach((row) => {
      if (!row || typeof row !== "object") return;
      const source = row as Partial<DayTemplate>;
      const dayNumber = clamp(Number(source.dayNumber) || 0, 1, 30);
      const base = map.get(dayNumber);
      if (!base) return;

      map.set(dayNumber, {
        dayNumber,
        hadithText: typeof source.hadithText === "string" && source.hadithText.length > 0 ? source.hadithText : base.hadithText,
        fiqhStatementText:
          typeof source.fiqhStatementText === "string" && source.fiqhStatementText.length > 0
            ? source.fiqhStatementText
            : base.fiqhStatementText,
        impactTaskText:
          typeof source.impactTaskText === "string" && source.impactTaskText.length > 0
            ? source.impactTaskText
            : base.impactTaskText,
        correctAnswer: typeof source.correctAnswer === "boolean" ? source.correctAnswer : base.correctAnswer,
      });
    });
  }

  return Array.from({ length: 30 }, (_, index) => map.get(index + 1) as DayTemplate);
}

const DEFAULT_DAY_TEMPLATES = buildDayTemplates(seedDayTemplates);

function mergeDayTemplates(rawTemplates: unknown, legacyCorrectAnswers?: unknown) {
  const templates = buildDayTemplates(Array.isArray(rawTemplates) && rawTemplates.length > 0 ? rawTemplates : DEFAULT_DAY_TEMPLATES);

  if (legacyCorrectAnswers && typeof legacyCorrectAnswers === "object") {
    const answers = legacyCorrectAnswers as Record<string, boolean>;
    return templates.map((template) => {
      const override = answers[String(template.dayNumber)];
      return typeof override === "boolean" ? { ...template, correctAnswer: override } : template;
    });
  }

  return templates;
}

function normalizePlayers(raw: unknown): string[] {
  if (!Array.isArray(raw)) return DEFAULT_PLAYERS;
  const next = raw
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 20);

  return next.length >= 2 ? next : DEFAULT_PLAYERS;
}

function normalizeEntries(raw: unknown): Record<string, Record<number, Entry>> {
  if (!raw || typeof raw !== "object") return {};

  const result: Record<string, Record<number, Entry>> = {};

  Object.entries(raw as Record<string, unknown>).forEach(([player, days]) => {
    if (!days || typeof days !== "object") return;

    const dayEntries: Record<number, Entry> = {};
    Object.entries(days as Record<string, unknown>).forEach(([dayKey, value]) => {
      if (!value || typeof value !== "object") return;
      const source = value as Partial<Entry>;
      const dayNumber = clamp(Number(dayKey) || 0, 1, 30);

      dayEntries[dayNumber] = {
        quranPoints: clamp(Number(source.quranPoints) || 0, 0, 3),
        hadithPoints: clamp(Number(source.hadithPoints) || 0, 0, 3),
        fiqhAnswer: Boolean(source.fiqhAnswer),
        impactDone: Boolean(source.impactDone),
        total: clamp(Number(source.total) || 0, 0, 10),
      };
    });

    if (Object.keys(dayEntries).length > 0) {
      result[player] = dayEntries;
    }
  });

  return result;
}

function defaultState(): QuickState {
  return {
    groupName: "تحدي رمضان اليومي",
    players: DEFAULT_PLAYERS,
    dayTemplates: DEFAULT_DAY_TEMPLATES.map((template) => ({ ...template })),
    entries: {},
  };
}

function getTemplate(templates: DayTemplate[], dayNumber: number): DayTemplate {
  return templates.find((template) => template.dayNumber === dayNumber) ?? DEFAULT_DAY_TEMPLATES[dayNumber - 1];
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
  const [playerName, setPlayerName] = useState(DEFAULT_PLAYERS[0]);
  const [quranPoints, setQuranPoints] = useState(0);
  const [hadithPoints, setHadithPoints] = useState(0);
  const [fiqhAnswer, setFiqhAnswer] = useState<boolean>(true);
  const [impactDone, setImpactDone] = useState(false);

  const [playersText, setPlayersText] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as LegacyQuickState;
        const initial = defaultState();

        const next: QuickState = {
          groupName: typeof parsed.groupName === "string" && parsed.groupName.length > 0 ? parsed.groupName : initial.groupName,
          players: normalizePlayers(parsed.players),
          dayTemplates: mergeDayTemplates(parsed.dayTemplates, parsed.correctAnswers),
          entries: normalizeEntries(parsed.entries),
        };

        setState(next);
        setPlayerName(next.players[0] ?? DEFAULT_PLAYERS[0]);
        setPlayersText(next.players.join("\n"));
      } else {
        const initial = defaultState();
        setState(initial);
        setPlayerName(initial.players[0] ?? DEFAULT_PLAYERS[0]);
        setPlayersText(initial.players.join("\n"));
      }
    } catch {
      const initial = defaultState();
      setState(initial);
      setPlayerName(initial.players[0] ?? DEFAULT_PLAYERS[0]);
      setPlayersText(initial.players.join("\n"));
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const currentEntry = state.entries[playerName]?.[dayNumber] ?? null;
    if (currentEntry) {
      setQuranPoints(currentEntry.quranPoints);
      setHadithPoints(currentEntry.hadithPoints);
      setFiqhAnswer(currentEntry.fiqhAnswer);
      setImpactDone(currentEntry.impactDone);
      return;
    }

    setQuranPoints(0);
    setHadithPoints(0);
    setFiqhAnswer(true);
    setImpactDone(false);
  }, [hydrated, state.entries, playerName, dayNumber]);

  function persist(next: QuickState) {
    setState(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  const activeTemplate = useMemo(() => getTemplate(state.dayTemplates, dayNumber), [state.dayTemplates, dayNumber]);
  const todayEntry = state.entries[playerName]?.[dayNumber] ?? null;
  const projected = calcTotal({
    quranPoints,
    hadithPoints,
    fiqhAnswer,
    correctAnswer: activeTemplate.correctAnswer,
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
    const nextTemplates = state.dayTemplates.map((template) => {
      if (template.dayNumber !== dayNumber) return template;
      return { ...template, correctAnswer: value };
    });

    persist({
      ...state,
      dayTemplates: nextTemplates,
    });

    setMessage(`تم حفظ مفتاح الفقه لليوم ${dayNumber}.`);
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
      correctAnswer: activeTemplate.correctAnswer,
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
      const total = Object.values(days).reduce((sum, row) => sum + row.total, 0);
      return { name, total };
    });
    rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "ar"));
    return rows;
  }, [state.players, state.entries]);

  async function copyShareText() {
    const rank = dailyRows.findIndex((row) => row.name === playerName) + 1;
    const total = state.entries[playerName]?.[dayNumber]?.total ?? projected;
    const text = `نتيجة اليوم: ${total}/10 - الترتيب: ${rank || "?"}`;
    await navigator.clipboard.writeText(text);
    setMessage("تم نسخ نص المشاركة.");
  }

  async function copyWhatsAppSummary() {
    const text = `(ورد - حديث - فقه - أثر): (${quranPoints} - ${hadithPoints} - ${fiqhAnswer ? "صح" : "خطأ"} - ${impactDone ? "تم" : "لم يتم"})`;
    await navigator.clipboard.writeText(text);
    setMessage("تم نسخ صيغة واتساب.");
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
          <p className="mt-1 text-sm text-white/70">يعمل مباشرة بدون إعدادات. مناسب للمشاركة السريعة بالرابط.</p>
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
              <Input value={state.groupName} onChange={(e) => persist({ ...state, groupName: e.target.value })} />
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
          <h2 className="text-xl font-bold">بطاقة اليوم</h2>

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
                {state.players.map((name) => (
                  <option key={name} value={name} className="text-black">
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
            <p>
              <span className="font-bold">الحديث:</span> {activeTemplate.hadithText}
            </p>
            <p>
              <span className="font-bold">سؤال الفقه:</span> {activeTemplate.fiqhStatementText}
            </p>
            <p>
              <span className="font-bold">مهمة الأثر:</span> {activeTemplate.impactTaskText}
            </p>
          </div>

          <details className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <summary className="cursor-pointer text-sm font-semibold">وضع المشرفة - مفتاح الفقه</summary>
            <div className="mt-3 flex gap-2">
              <Button
                variant={activeTemplate.correctAnswer ? "primary" : "secondary"}
                size="sm"
                onClick={() => saveAnswerKey(true)}
              >
                الإجابة: صح
              </Button>
              <Button
                variant={!activeTemplate.correctAnswer ? "primary" : "secondary"}
                size="sm"
                onClick={() => saveAnswerKey(false)}
              >
                الإجابة: خطأ
              </Button>
            </div>
          </details>

          <div className="mt-4 space-y-4">
            <div>
              <PointsSelector label="الورد (0 - 3)" value={quranPoints} onChange={setQuranPoints} max={3} />
              <p className="mt-2 text-xs text-white/65">1 = نصف حزب - 2 = حزب - 3 = 3 حزب ونصف أو أكثر</p>
            </div>

            <div>
              <PointsSelector label="الحديث والتطبيق (0 - 3)" value={hadithPoints} onChange={setHadithPoints} max={3} />
              <p className="mt-2 text-xs text-white/65">1 = حفظ جزئي - 2 = حفظ كامل - 3 = حفظ + تطبيق عملي</p>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-white/80">فقه اليوم (صح أو خطأ)</p>
              <div className="flex gap-2">
                <Button variant={fiqhAnswer ? "primary" : "secondary"} size="sm" onClick={() => setFiqhAnswer(true)}>
                  صح
                </Button>
                <Button variant={!fiqhAnswer ? "primary" : "secondary"} size="sm" onClick={() => setFiqhAnswer(false)}>
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
            <p className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/80">{message}</p>
          ) : null}

          <div className="mt-4 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">
              المجموع المتوقع: <span className="text-[color:var(--gold)]">{projected}/10</span>
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={copyWhatsAppSummary}>
                نسخ واتساب
              </Button>
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
            {dailyRows.map((row, index) => (
              <div
                key={`${row.name}-${dayNumber}`}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 text-center text-xs font-bold text-white/70">{index + 1}</span>
                  <span className="font-semibold">{row.name}</span>
                </div>
                <span className="font-extrabold text-[color:var(--gold)]">{row.total}/10</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-xl font-bold">الترتيب الإجمالي</h2>
          <div className="mt-4 space-y-2">
            {overallRows.map((row, index) => (
              <div
                key={`overall-${row.name}`}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 text-center text-xs font-bold text-white/70">{index + 1}</span>
                  <span className="font-semibold">{row.name}</span>
                </div>
                <span className="font-extrabold text-[color:var(--gold)]">{row.total}</span>
              </div>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
}

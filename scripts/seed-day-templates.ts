import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const DaySchema = z.object({
  dayNumber: z.number().int().min(1).max(30),
  hadithText: z.string().min(1),
  fiqhStatementText: z.string().min(1),
  impactTaskText: z.string().min(1),
  correctAnswer: z.boolean(),
});

const SeedSchema = z.array(DaySchema).length(30);

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

async function main() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const seedPath = path.join(process.cwd(), "supabase", "seed", "day-templates.json");
  const raw = readFileSync(seedPath, "utf8");
  const parsed = SeedSchema.parse(JSON.parse(raw));

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const rows = parsed.map((d) => ({
    day_number: d.dayNumber,
    hadith_text: d.hadithText,
    fiqh_statement_text: d.fiqhStatementText,
    impact_task_text: d.impactTaskText,
    correct_answer: d.correctAnswer,
  }));

  const { error } = await supabase.from("day_templates").upsert(rows, {
    onConflict: "day_number",
  });
  if (error) throw error;

  console.log("Seeded day_templates (30 days).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

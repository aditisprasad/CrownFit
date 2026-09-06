import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, Output } from "ai";
import { getGateway } from "./ai-gateway.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PlanSchema = z.object({
  summary: z.string(),
  focusAreas: z.array(z.string()).min(1).max(6),
  weeks: z
    .array(
      z.object({
        week: z.number(),
        theme: z.string(),
        fitness: z.string(),
        nutrition: z.string(),
        grooming: z.string(),
        communication: z.string(),
        mindset: z.string(),
        tasks: z.array(z.string()).min(1).max(6),
      }),
    )
    .min(1)
    .max(12),
});

export const getPreparation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const uid = context.userId;
    const [{ data: plan }, { data: tasks }, { data: profile }] = await Promise.all([
      context.supabase
        .from("preparation_plans")
        .select("id, target_pageant, target_date, horizon_weeks, focus_areas, summary, weeks, created_at")
        .eq("user_id", uid)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      context.supabase
        .from("preparation_tasks")
        .select("id, stage, title, details, due_date, completed_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: true }),
      context.supabase
        .from("contestant_profiles")
        .select("target_pageant, target_date, target_year, improvement_areas, preparation_level, primary_goal")
        .eq("user_id", uid)
        .maybeSingle(),
    ]);

    return { plan: plan ?? null, tasks: tasks ?? [], profile: profile ?? null };
  });

export const generatePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ horizonWeeks: z.number().min(2).max(12).default(8) }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const uid = context.userId;
    const { data: profile } = await context.supabase
      .from("contestant_profiles")
      .select(
        "full_name, target_pageant, target_date, target_year, improvement_areas, preparation_level, experience_level, primary_goal, activity_level, dietary_preference, food_allergies, skin_type, skin_concerns, hair_type, hair_concerns, fitness_preferences, training_minutes_per_day, daily_schedule, pageant_category",
      )
      .eq("user_id", uid)
      .maybeSingle();

    const { data: jury } = await context.supabase
      .from("interview_sessions")
      .select("final_score, weaknesses")
      .eq("user_id", uid)
      .eq("status", "completed")
      .order("started_at", { ascending: false })
      .limit(3);

    const known = Object.entries(profile ?? {})
      .filter(([, v]) => v !== null && v !== "" && !(Array.isArray(v) && v.length === 0))
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
      .join("\n");

    const juryNote = (jury ?? []).length
      ? `Recent mock-jury scores: ${(jury ?? []).map((j) => j.final_score ?? "n/a").join(", ")}. Noted weaknesses: ${(jury ?? [])
          .flatMap((j) => j.weaknesses ?? [])
          .slice(0, 6)
          .join("; ")}`
      : "No mock-jury sessions yet.";

    const { output } = await generateText({
      model: getGateway()("google/gemini-3.7-flash"),
      output: Output.object({ schema: PlanSchema }),
      prompt: `You are a senior pageant preparation coach. Build a ${data.horizonWeeks}-week adaptive preparation plan for this contestant.

Known contestant data (only this is known — never invent facts, ages, measurements or pageant rules):
${known || "No profile details provided yet."}

${juryNote}

Rules:
- Adapt intensity and focus to the data above. If something is unknown, give safe general guidance instead of assuming.
- Nutrition guidance must be non-medical and respect any stated dietary preference or allergy.
- Each week: a theme plus concrete fitness, nutrition, grooming, communication and mindset actions, and 3-5 checkable tasks.
- Do not state rules, dates or requirements about any specific real pageant.`,
    });

    if (!output) throw new Error("Could not generate a plan right now.");

    await context.supabase.from("preparation_plans").update({ is_active: false }).eq("user_id", uid).eq("is_active", true);

    const { data: inserted, error } = await context.supabase
      .from("preparation_plans")
      .insert({
        user_id: uid,
        target_pageant: profile?.target_pageant ?? null,
        target_date: profile?.target_date ?? null,
        horizon_weeks: data.horizonWeeks,
        focus_areas: output.focusAreas,
        summary: output.summary,
        weeks: output.weeks,
        is_active: true,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const taskRows = output.weeks.flatMap((w) =>
      w.tasks.map((t) => ({ user_id: uid, stage: `Week ${w.week} — ${w.theme}`, title: t })),
    );
    if (taskRows.length) await context.supabase.from("preparation_tasks").insert(taskRows);

    return { planId: inserted.id };
  });

export const toggleTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), done: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("preparation_tasks")
      .update({ completed_at: data.done ? new Date().toISOString() : null })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

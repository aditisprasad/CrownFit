import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { METRIC_KEYS, METRIC_LABELS, type Measurements } from "./posture-metrics";

type DB = SupabaseClient<Database>;

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

/**
 * Retrieves ONLY the slices of the signed-in user's data that are useful for
 * coaching context. Never send the whole database to the model.
 */
export async function buildCoachContext(supabase: DB, userId: string) {
  const from = daysAgo(13);
  const [profile, tasks, sessions, posture, mood, water, steps, sleep, exercise, events, plan] =
    await Promise.all([
      supabase.from("contestant_profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase
        .from("preparation_tasks")
        .select("title, stage, due_date, completed_at")
        .eq("user_id", userId)
        .order("due_date", { ascending: true })
        .limit(12),
      supabase
        .from("interview_sessions")
        .select("mode, final_score, summary, strengths, weaknesses, started_at")
        .eq("user_id", userId)
        .order("started_at", { ascending: false })
        .limit(3),
      supabase
        .from("posture_analyses")
        .select("view, source, measurements, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(2),
      supabase
        .from("mood_records")
        .select("estimated_state, positivity, stress, energy, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("water_logs")
        .select("amount_ml, logged_on")
        .eq("user_id", userId)
        .gte("logged_on", from),
      supabase
        .from("step_logs")
        .select("steps, logged_on")
        .eq("user_id", userId)
        .gte("logged_on", from),
      supabase
        .from("sleep_logs")
        .select("duration_hours, logged_on")
        .eq("user_id", userId)
        .gte("logged_on", from),
      supabase
        .from("fitness_logs")
        .select("activity, duration_minutes, intensity, logged_on")
        .eq("user_id", userId)
        .gte("logged_on", from)
        .limit(20),
      supabase
        .from("calendar_events")
        .select("title, kind, starts_at, location")
        .eq("user_id", userId)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(6),
      supabase
        .from("preparation_plans")
        .select("summary, focus_areas, target_pageant, target_date")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const p = profile.data;
  const lines: string[] = [];
  if (!p) {
    lines.push(
      "The contestant has not created a profile yet — do not assume any personal details.",
    );
  } else {
    const known = (label: string, value: unknown) => {
      if (
        value === null ||
        value === undefined ||
        value === "" ||
        (Array.isArray(value) && !value.length)
      )
        return;
      lines.push(`- ${label}: ${Array.isArray(value) ? value.join(", ") : value}`);
    };
    lines.push("KNOWN PROFILE (only these facts are known; anything absent is unknown):");
    known("Name", p.full_name);
    known("Date of birth", p.date_of_birth);
    known("City", p.city);
    known("State", p.state);
    known("Height (cm)", p.height_cm);
    known("Weight (kg)", p.weight_kg);
    known("Target pageant", p.target_pageant);
    known("Target date", p.target_date);
    known("Pageant category", p.pageant_category);
    known("Experience level", p.experience_level);
    known("Activity level", p.activity_level);
    known("Primary goal", p.primary_goal);
    known("Dietary preference", p.dietary_preference);
    known("Food allergies", p.food_allergies);
    known("Food preferences", p.food_preferences);
    known("Skin type", p.skin_type);
    known("Skin concerns", p.skin_concerns);
    known("Hair type", p.hair_type);
    known("Hair concerns", p.hair_concerns);
    known("Fitness preferences", p.fitness_preferences);
    known("Training minutes available per day", p.training_minutes_per_day);
    known("Daily schedule", p.daily_schedule);
    known("Sleep target (h)", p.sleep_target_hours);
    known("Water target (ml)", p.water_target_ml);
    known("Step target", p.step_target);
    known("Preparation level", p.preparation_level);
    known("Areas to improve", p.improvement_areas);
    known("Languages", p.languages);
    known("Skills", p.skills);
    known("Experience", p.experience);
  }

  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const waterDays = new Set((water.data ?? []).map((w) => w.logged_on)).size;
  const stepAvg = steps.data?.length
    ? Math.round(sum(steps.data.map((s) => s.steps)) / steps.data.length)
    : null;
  const sleepAvg = sleep.data?.length
    ? (sum(sleep.data.map((s) => Number(s.duration_hours ?? 0))) / sleep.data.length).toFixed(1)
    : null;

  lines.push("\nRECENT REAL ACTIVITY (last 14 days):");
  lines.push(`- Days with water logged: ${waterDays}`);
  lines.push(`- Water logged total: ${sum((water.data ?? []).map((w) => w.amount_ml))} ml`);
  lines.push(`- Exercise sessions logged: ${exercise.data?.length ?? 0}`);
  lines.push(`- Average steps on logged days: ${stepAvg ?? "no data"}`);
  lines.push(`- Average sleep on logged days: ${sleepAvg ?? "no data"}`);
  lines.push(`- Mock jury sessions on record: ${sessions.data?.length ?? 0}`);
  if (sessions.data?.length) {
    for (const s of sessions.data) {
      lines.push(
        `  · ${s.mode} on ${s.started_at?.slice(0, 10)} — score ${s.final_score ?? "n/a"}; weaknesses: ${(s.weaknesses ?? []).join("; ") || "none recorded"}`,
      );
    }
  }
  if (posture.data?.length) {
    lines.push("- Posture & Stage Presence (real MediaPipe landmark measurements, no overall score exists):");
    for (const r of posture.data) {
      const m = (r.measurements ?? {}) as unknown as Measurements;
      const parts = METRIC_KEYS.map((k) => {
        const x = m[k];
        if (!x || x.value == null) return `${METRIC_LABELS[k]}: not enough visual information`;
        return `${METRIC_LABELS[k]}: ${x.value}${x.unit === "ratio" ? "" : x.unit} (${x.status === "within" ? "within pageant range" : "needs adjustment"})`;
      });
      lines.push(`  · ${r.created_at.slice(0, 10)} (${r.view} view, ${r.source}): ${parts.join("; ")}`);
    }
  } else {
    lines.push("- Posture & Stage Presence: not enough posture data yet (no saved analyses)");
  }
  // Skin & Presentation: only qualitative visual findings (no images) + self-reported check-ins.
  const [skin, checkins] = await Promise.all([
    supabase
      .from("skin_analyses")
      .select("findings, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(2),
    supabase
      .from("presentation_checkins")
      .select("confidence, preparedness, camera_comfort, improvement_goal, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);
  const fmtSkin = (f: unknown) =>
    Array.isArray(f)
      ? f.map((x: { key?: string; level?: string }) => `${x.key}: ${x.level}`).join(", ")
      : "n/a";
  if (skin.data?.length) {
    lines.push(
      `- Latest visual skin assessment (non-medical, appearance only) on ${skin.data[0]!.created_at.slice(0, 10)}: ${fmtSkin(skin.data[0]!.findings)}`,
    );
    if (skin.data[1])
      lines.push(
        `  · Previous assessment on ${skin.data[1].created_at.slice(0, 10)}: ${fmtSkin(skin.data[1].findings)}`,
      );
  } else {
    lines.push("- Visual skin assessment: none saved yet");
  }
  if (checkins.data?.length) {
    for (const c of checkins.data)
      lines.push(
        `  · Self-reported check-in ${c.created_at.slice(0, 10)}: confidence ${c.confidence}/10, prepared ${c.preparedness}/10, camera comfort ${c.camera_comfort}/10${c.improvement_goal ? `; wants to improve: ${c.improvement_goal}` : ""}`,
      );
  }
  lines.push(
    "- Never make medical claims from skin assessments; never infer mood, stress or hormones from appearance.",
  );
  if (tasks.data?.length) {
    const done = tasks.data.filter((t) => t.completed_at).length;
    lines.push(`- Preparation tasks: ${done}/${tasks.data.length} complete`);
    lines.push(
      `- Open tasks: ${
        tasks.data
          .filter((t) => !t.completed_at)
          .map((t) => `${t.title}${t.due_date ? ` (due ${t.due_date})` : ""}`)
          .join("; ") || "none"
      }`,
    );
  } else {
    lines.push("- Preparation tasks: none created yet");
  }
  if (events.data?.length) {
    lines.push(
      `- Upcoming calendar: ${events.data.map((e) => `${e.title} on ${e.starts_at.slice(0, 16).replace("T", " ")}`).join("; ")}`,
    );
  }
  if (plan.data) {
    lines.push(
      `- Active preparation plan focus: ${(plan.data.focus_areas ?? []).join(", ") || "unspecified"}`,
    );
  }

  return { text: lines.join("\n"), profile: p };
}

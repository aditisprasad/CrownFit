import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const dayKeys = (n: number) =>
  Array.from({ length: n }, (_, i) =>
    new Date(Date.now() - (n - 1 - i) * 86400000).toISOString().slice(0, 10),
  );

type Component = { label: string; value: number | null; detail: string };

/**
 * Real analytics + digital twin readiness, computed only from rows the
 * authenticated user actually logged. Missing data stays null — never faked.
 */
export const getInsights = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const uid = context.userId;
    const from = daysAgo(29);

    const [
      profile,
      water,
      steps,
      sleep,
      exercise,
      diet,
      jury,
      posture,
      mood,
      tasks,
      portfolio,
      events,
      plan,
    ] = await Promise.all([
      context.supabase.from("contestant_profiles").select("*").eq("user_id", uid).maybeSingle(),
      context.supabase
        .from("water_logs")
        .select("logged_on, amount_ml")
        .eq("user_id", uid)
        .gte("logged_on", from),
      context.supabase
        .from("step_logs")
        .select("logged_on, steps")
        .eq("user_id", uid)
        .gte("logged_on", from),
      context.supabase
        .from("sleep_logs")
        .select("logged_on, duration_hours, quality")
        .eq("user_id", uid)
        .gte("logged_on", from),
      context.supabase
        .from("fitness_logs")
        .select("logged_on, duration_minutes")
        .eq("user_id", uid)
        .gte("logged_on", from),
      context.supabase
        .from("diet_logs")
        .select("logged_on")
        .eq("user_id", uid)
        .gte("logged_on", from),
      context.supabase
        .from("interview_sessions")
        .select("id, final_score, status, started_at, completed_at")
        .eq("user_id", uid)
        .order("started_at", { ascending: false })
        .limit(20),
      context.supabase
        .from("posture_analyses")
        .select("created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(20),
      context.supabase
        .from("mood_records")
        .select("estimated_state, positivity, stress, energy, confidence, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(20),
      context.supabase
        .from("preparation_tasks")
        .select("id, completed_at, created_at")
        .eq("user_id", uid),
      context.supabase.from("portfolio_items").select("id, created_at").eq("user_id", uid),
      context.supabase
        .from("calendar_events")
        .select("id, title, kind, starts_at, location")
        .eq("user_id", uid)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(5),
      context.supabase
        .from("preparation_plans")
        .select("id, target_pageant, target_date, summary, weeks, focus_areas, updated_at")
        .eq("user_id", uid)
        .eq("is_active", true)
        .maybeSingle(),
    ]);

    const p = profile.data;
    const last14 = dayKeys(14);

    const sumBy = <T extends { logged_on: string }>(
      rows: T[],
      day: string,
      pick: (r: T) => number,
    ) => rows.filter((r) => r.logged_on === day).reduce((s, r) => s + (pick(r) || 0), 0);

    const waterRows = water.data ?? [];
    const stepRows = steps.data ?? [];
    const sleepRows = sleep.data ?? [];
    const exRows = exercise.data ?? [];
    const dietRows = diet.data ?? [];

    const waterTarget = p?.water_target_ml ?? 2500;
    const stepTarget = p?.step_target ?? 8000;
    const sleepTarget = p?.sleep_target_hours ? Number(p.sleep_target_hours) : 8;

    const series = last14.map((day) => ({
      day,
      water_ml: sumBy(waterRows, day, (r) => r.amount_ml ?? 0),
      steps: sumBy(stepRows, day, (r) => r.steps ?? 0),
      training_minutes: sumBy(exRows, day, (r) => r.duration_minutes ?? 0),
      sleep_hours: Number(sleepRows.find((r) => r.logged_on === day)?.duration_hours ?? 0),
      meals: dietRows.filter((r) => r.logged_on === day).length,
    }));

    const hitRate = (pick: (d: (typeof series)[number]) => number, target: number) => {
      const active = series.filter((d) => pick(d) > 0);
      if (active.length === 0) return null;
      return Math.round((active.filter((d) => pick(d) >= target).length / series.length) * 100);
    };

    const juryScored = (jury.data ?? []).filter((s) => s.final_score != null);
    const juryAvg = juryScored.length
      ? Number(
          (juryScored.reduce((s, r) => s + Number(r.final_score), 0) / juryScored.length).toFixed(
            1,
          ),
        )
      : null;
    const juryTrend =
      juryScored.length >= 2
        ? Number(
            (
              Number(juryScored[0]?.final_score ?? 0) -
              Number(juryScored[juryScored.length - 1]?.final_score ?? 0)
            ).toFixed(1),
          )
        : null;

    // Posture: measurement-based analyses only (no combined score; shown separately on the page).
    const postureRows = posture.data ?? [];

    const moodRows = mood.data ?? [];
    const moodAvg = moodRows.length
      ? Math.round(moodRows.reduce((s, r) => s + Number(r.positivity ?? 0), 0) / moodRows.length)
      : null;

    const taskRows = tasks.data ?? [];
    const tasksDone = taskRows.filter((t) => t.completed_at).length;

    // preparation streak: consecutive days (ending today) with any logged activity
    const activityDays = new Set<string>([
      ...waterRows.map((r) => r.logged_on),
      ...stepRows.map((r) => r.logged_on),
      ...exRows.map((r) => r.logged_on),
      ...dietRows.map((r) => r.logged_on),
      ...sleepRows.map((r) => r.logged_on),
      ...postureRows.map((r) => r.created_at.slice(0, 10)),
      ...moodRows.map((r) => r.created_at.slice(0, 10)),
      ...(jury.data ?? []).map((r) => r.started_at.slice(0, 10)),
    ]);
    let streak = 0;
    for (let i = 0; i < 60; i++) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      if (activityDays.has(d)) streak++;
      else if (i > 0) break;
    }

    const profileFields = p
      ? [
          p.full_name,
          p.date_of_birth,
          p.city,
          p.height_cm,
          p.target_pageant,
          p.target_date ?? p.target_year,
          p.pageant_category,
          p.experience_level,
          p.activity_level,
          p.primary_goal,
          p.dietary_preference,
          p.skin_type,
          p.hair_type,
          p.training_minutes_per_day,
          p.sleep_target_hours,
          p.water_target_ml,
        ]
      : [];
    const profileCompletion = p
      ? Math.round(
          (profileFields.filter((v) => v !== null && v !== undefined && v !== "").length /
            profileFields.length) *
            100,
        )
      : 0;

    const wellnessConsistency = hitRate((d) => d.water_ml, waterTarget);
    const trainingConsistency = hitRate(
      (d) => d.training_minutes,
      Math.max(15, p?.training_minutes_per_day ?? 30),
    );
    const stepConsistency = hitRate((d) => d.steps, stepTarget);
    const sleepConsistency = hitRate((d) => d.sleep_hours, sleepTarget);

    const components: Component[] = [
      {
        label: "Profile depth",
        value: profileCompletion,
        detail: "How much of your contestant profile is filled in",
      },
      {
        label: "Interview performance",
        value: juryAvg != null ? Math.round(juryAvg * 10) : null,
        detail:
          juryAvg != null
            ? `Average mock jury score ${juryAvg}/10 across ${juryScored.length} session(s)`
            : "No scored mock jury sessions yet",
      },
      {
        label: "Wellness consistency",
        value: wellnessConsistency,
        detail:
          wellnessConsistency != null
            ? "Days hitting your water target (last 14)"
            : "No water logs yet",
      },
      {
        label: "Training consistency",
        value: trainingConsistency,
        detail:
          trainingConsistency != null
            ? "Days hitting your training target (last 14)"
            : "No training logs yet",
      },
      {
        label: "Mindset",
        value: moodAvg,
        detail: moodAvg != null ? `${moodRows.length} mood reading(s)` : "No mood readings yet",
      },
    ];

    const known = components.filter((c) => c.value != null);
    const dataPoints =
      waterRows.length +
      stepRows.length +
      sleepRows.length +
      exRows.length +
      dietRows.length +
      postureRows.length +
      moodRows.length +
      juryScored.length +
      taskRows.length;

    const readiness =
      known.length >= 3 && dataPoints >= 8
        ? Math.round(known.reduce((s, c) => s + (c.value as number), 0) / known.length)
        : null;

    const target = p?.target_date ?? null;
    const daysToTarget = target
      ? Math.ceil((new Date(target).getTime() - Date.now()) / 86400000)
      : null;

    const insights: string[] = [];
    if (streak >= 2) insights.push(`You have logged preparation ${streak} day(s) in a row.`);
    if (juryTrend != null && juryTrend !== 0)
      insights.push(
        juryTrend > 0
          ? `Your mock jury score improved by ${juryTrend.toFixed(1)} points since your first session.`
          : `Your mock jury score is down ${Math.abs(juryTrend).toFixed(1)} points since your first session.`,
      );
    if (stepConsistency != null)
      insights.push(`You hit your step target on ${stepConsistency}% of the last 14 days.`);
    if (sleepConsistency != null)
      insights.push(`You hit your sleep target on ${sleepConsistency}% of the last 14 days.`);

    return {
      profile: p
        ? {
            full_name: p.full_name,
            target_pageant: p.target_pageant,
            target_date: p.target_date,
            pageant_category: p.pageant_category,
            improvement_areas: p.improvement_areas ?? [],
          }
        : null,
      profileCompletion,
      readiness,
      dataPoints,
      streak,
      components,
      series,
      targets: { water_ml: waterTarget, steps: stepTarget, sleep_hours: sleepTarget },
      consistency: {
        water: wellnessConsistency,
        training: trainingConsistency,
        steps: stepConsistency,
        sleep: sleepConsistency,
      },
      jury: {
        average: juryAvg,
        trend: juryTrend,
        sessions: (jury.data ?? []).length,
        recent: juryScored.slice(0, 5),
      },
      posture: { sessions: postureRows.length },
      mood: { average: moodAvg, recent: moodRows.slice(0, 5) },
      tasks: { total: taskRows.length, completed: tasksDone },
      portfolioCount: (portfolio.data ?? []).length,
      upcoming: events.data ?? [],
      plan: plan.data ?? null,
      daysToTarget,
      insights,
    };
  });

/** Persist a Digital Twin snapshot so progress over time is real, not recomputed fiction. */
export const saveTwinSnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("digital_twin_snapshots")
      .select("id, readiness, created_at, data_points")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

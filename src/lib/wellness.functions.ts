import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

export const getWellness = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const uid = context.userId;
    const from = daysAgo(13);
    const [water, diet, exercise, steps, sleep, profile] = await Promise.all([
      context.supabase.from("water_logs").select("*").eq("user_id", uid).gte("logged_on", from).order("logged_on", { ascending: false }),
      context.supabase.from("diet_logs").select("*").eq("user_id", uid).gte("logged_on", from).order("created_at", { ascending: false }),
      context.supabase.from("fitness_logs").select("*").eq("user_id", uid).gte("logged_on", from).order("logged_on", { ascending: false }),
      context.supabase.from("step_logs").select("*").eq("user_id", uid).gte("logged_on", from).order("logged_on", { ascending: false }),
      context.supabase.from("sleep_logs").select("*").eq("user_id", uid).gte("logged_on", from).order("logged_on", { ascending: false }),
      context.supabase
        .from("contestant_profiles")
        .select("water_target_ml, step_target, sleep_target_hours")
        .eq("user_id", uid)
        .maybeSingle(),
    ]);
    return {
      today: today(),
      water: water.data ?? [],
      diet: diet.data ?? [],
      exercise: exercise.data ?? [],
      steps: steps.data ?? [],
      sleep: sleep.data ?? [],
      targets: {
        water_ml: profile.data?.water_target_ml ?? 2500,
        steps: profile.data?.step_target ?? 8000,
        sleep_hours: profile.data?.sleep_target_hours ? Number(profile.data.sleep_target_hours) : 8,
      },
    };
  });

export const logWater = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ amount_ml: z.number().int().min(10).max(3000) }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("water_logs")
      .insert({ user_id: context.userId, amount_ml: data.amount_ml, logged_on: today() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const logDiet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        meal: z.enum(["breakfast", "lunch", "dinner", "snack"]),
        description: z.string().min(1).max(500),
        calories: z.number().int().min(0).max(10000).optional(),
        notes: z.string().max(500).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("diet_logs").insert({
      user_id: context.userId,
      meal: data.meal,
      description: data.description,
      calories: data.calories ?? null,
      notes: data.notes ?? null,
      logged_on: today(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const logExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        activity: z.string().min(1).max(160),
        duration_minutes: z.number().int().min(1).max(600).optional(),
        intensity: z.enum(["light", "moderate", "intense"]).optional(),
        notes: z.string().max(500).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("fitness_logs").insert({
      user_id: context.userId,
      activity: data.activity,
      duration_minutes: data.duration_minutes ?? null,
      intensity: data.intensity ?? null,
      notes: data.notes ?? null,
      logged_on: today(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const logSteps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ steps: z.number().int().min(0).max(200000) }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("step_logs")
      .upsert({ user_id: context.userId, steps: data.steps, logged_on: today() }, { onConflict: "user_id,logged_on" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const logSleep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        bedtime: z.string().optional(),
        wake_time: z.string().optional(),
        duration_hours: z.number().min(0).max(24).optional(),
        quality: z.number().int().min(1).max(5).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("sleep_logs").insert({
      user_id: context.userId,
      logged_on: today(),
      bedtime: data.bedtime ?? null,
      wake_time: data.wake_time ?? null,
      duration_hours: data.duration_hours ?? null,
      quality: data.quality ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteWellnessEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        table: z.enum(["water_logs", "diet_logs", "fitness_logs", "step_logs", "sleep_logs"]),
        id: z.string().uuid(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from(data.table)
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

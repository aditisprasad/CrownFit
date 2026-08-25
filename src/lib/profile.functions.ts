import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("contestant_profiles")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

const ProfileInput = z.object({
  full_name: z.string().min(1).optional(),
  date_of_birth: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  nationality: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  height_cm: z.number().optional().nullable(),
  weight_kg: z.number().optional().nullable(),
  bust_cm: z.number().optional().nullable(),
  waist_cm: z.number().optional().nullable(),
  hips_cm: z.number().optional().nullable(),
  dress_size: z.string().optional().nullable(),
  shoe_size: z.string().optional().nullable(),
  hair_color: z.string().optional().nullable(),
  eye_color: z.string().optional().nullable(),
  languages: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  education: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  experience: z.string().optional().nullable(),
  target_pageant: z.string().optional().nullable(),
  target_year: z.number().optional().nullable(),
  budget_band: z.string().optional().nullable(),
  onboarding_completed: z.boolean().optional(),
});

export const saveMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ProfileInput.parse(input))
  .handler(async ({ data, context }) => {
    const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
    const { data: row, error } = await context.supabase
      .from("contestant_profiles")
      .upsert({ ...clean, user_id: context.userId }, { onConflict: "user_id" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const getDashboardData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const uid = context.userId;
    const [profile, tasks, readiness, sessions, saved] = await Promise.all([
      context.supabase.from("contestant_profiles").select("*").eq("user_id", uid).maybeSingle(),
      context.supabase
        .from("preparation_tasks")
        .select("*")
        .eq("user_id", uid)
        .order("due_date", { ascending: true })
        .limit(8),
      context.supabase
        .from("readiness_records")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      context.supabase
        .from("interview_sessions")
        .select("id, final_score, status, started_at")
        .eq("user_id", uid)
        .order("started_at", { ascending: false })
        .limit(5),
      context.supabase.from("saved_items").select("id", { count: "exact", head: true }).eq("user_id", uid),
    ]);
    return {
      profile: profile.data,
      tasks: tasks.data ?? [],
      readiness: readiness.data,
      sessions: sessions.data ?? [],
      savedCount: saved.count ?? 0,
    };
  });

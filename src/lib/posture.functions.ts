import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  METRIC_KEYS,
  buildCoaching,
  measurableCount,
  type CoachingTip,
  type Measurements,
} from "./posture-metrics";

const MetricSchema = z.object({
  value: z.number().finite().min(-1000).max(1000).nullable(),
  unit: z.enum(["°", "%", "ratio"]),
  status: z.enum(["within", "adjust", "insufficient"]),
  reason: z.string().max(200).optional(),
});
const MeasurementsSchema = z.object(
  Object.fromEntries(METRIC_KEYS.map((k) => [k, MetricSchema])) as Record<
    (typeof METRIC_KEYS)[number],
    typeof MetricSchema
  >,
);

const SaveInput = z.object({
  source: z.enum(["photo", "camera_live"]),
  view: z.enum(["front", "side"]),
  frames: z.number().int().min(1).max(600),
  measurements: MeasurementsSchema,
  notes: z.string().max(500).optional(),
});

export type PostureRow = {
  id: string;
  source: string;
  view: string;
  frames_analyzed: number;
  measurements: Measurements;
  coaching: CoachingTip[];
  notes: string | null;
  created_at: string;
};

export const savePostureAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => SaveInput.parse(i))
  .handler(async ({ data, context }) => {
    const m = data.measurements as Measurements;
    if (measurableCount(m) === 0)
      throw new Error("Nothing measurable to save — not enough visual information.");
    const { data: row, error } = await context.supabase
      .from("posture_analyses")
      .insert({
        user_id: context.userId,
        source: data.source,
        view: data.view,
        frames_analyzed: data.frames,
        measurements: m as never,
        coaching: buildCoaching(m) as never,
        notes: data.notes ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const listPostureAnalyses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("posture_analyses")
      .select("id, source, view, frames_analyzed, measurements, coaching, notes, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as PostureRow[];
  });

export const deletePostureAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("posture_analyses")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

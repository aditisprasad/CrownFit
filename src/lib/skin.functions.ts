import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const SKIN_MODEL = "openai/gpt-6-astra";

export const LEVELS = ["Low", "Mild", "Moderate", "Prominent", "Not enough visual information"] as const;
export const FINDING_KEYS = [
  "blemishes",
  "redness",
  "tone_uniformity",
  "texture",
  "shine",
  "dryness",
  "under_eye",
] as const;
export const FINDING_LABELS: Record<(typeof FINDING_KEYS)[number], string> = {
  blemishes: "Visible blemishes",
  redness: "Visible redness",
  tone_uniformity: "Tone unevenness",
  texture: "Texture appearance",
  shine: "Shine / oiliness",
  dryness: "Dryness appearance",
  under_eye: "Under-eye appearance",
};
const QUALITY = ["good", "low_quality", "face_not_visible", "no_face"] as const;

const FindingSchema = z.object({
  key: z.enum(FINDING_KEYS),
  level: z.enum(LEVELS),
  explanation: z.string().max(400),
  relevance: z.string().max(400),
});
const ResultSchema = z.object({
  image_quality: z.enum(QUALITY),
  quality_note: z.string().max(400),
  summary: z.string().max(600),
  findings: z.array(FindingSchema).max(7),
  recommendations: z.array(z.string().max(300)).max(8),
});
export type SkinResult = z.infer<typeof ResultSchema>;

const jsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["image_quality", "quality_note", "summary", "findings", "recommendations"],
  properties: {
    image_quality: { type: "string", enum: [...QUALITY] },
    quality_note: { type: "string" },
    summary: { type: "string" },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "level", "explanation", "relevance"],
        properties: {
          key: { type: "string", enum: [...FINDING_KEYS] },
          level: { type: "string", enum: [...LEVELS] },
          explanation: { type: "string" },
          relevance: { type: "string" },
        },
      },
    },
    recommendations: { type: "array", items: { type: "string" } },
  },
};

const INSTRUCTIONS = `You are a pageant presentation assistant performing a NON-MEDICAL visual skin appearance assessment of a single photo.
Rules:
- Describe only what is visibly apparent in the photo. Never diagnose, never name medical conditions, never infer hormones, cortisol, stress, mood, deficiencies, diseases, infections or mental state.
- First judge image_quality: "no_face" if no human face is present, "face_not_visible" if the face is too small/obscured/turned away, "low_quality" if blur, darkness, heavy filters or harsh lighting prevent a reliable read, else "good". Explain briefly in quality_note.
- If image_quality is not "good", return an empty findings array and empty recommendations.
- Otherwise return exactly one finding for each key: blemishes, redness, tone_uniformity, texture, shine, dryness, under_eye. Use only the qualitative levels given. If lighting, makeup, resolution or angle prevents judging a characteristic, use "Not enough visual information" — never guess.
- explanation: one short sentence about what is visible. relevance: one short sentence on why it matters for stage/camera presentation.
- recommendations: 2-6 general, gentle, non-medical pageant-prep suggestions tied ONLY to observed findings (e.g. blotting, lighting, makeup prep, consistent skincare, sun protection, sleep/hydration routine). No medications, no aggressive treatments, no claims of curing anything.
- summary: 1-2 neutral sentences. Never comment on attractiveness, identity, age, ethnicity or body.`;

async function callResponses(imageDataUrl: string): Promise<SkinResult> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("ANALYSIS_UNAVAILABLE");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: SKIN_MODEL,
      stream: true,
      store: false,
      reasoning: { effort: "low", summary: "auto" },
      include: ["reasoning.encrypted_content"],
      instructions: INSTRUCTIONS,
      text: { format: { type: "json_schema", name: "skin_assessment", strict: true, schema: jsonSchema } },
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: "Assess the visible skin appearance in this photo following the rules." },
            { type: "input_image", image_url: imageDataUrl },
          ],
        },
      ],
    }),
  });
  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => "");
    console.error("skin analysis gateway error", res.status, body.slice(0, 500));
    if (res.status === 402) throw new Error("AI credits are exhausted for this workspace. Please try again later.");
    if (res.status === 429) throw new Error("The analyzer is busy right now. Please wait a moment and try again.");
    if (res.status === 403) throw new Error("Analysis is not available for this account right now.");
    throw new Error("Analysis is temporarily unavailable. Please try again later.");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let text = "";
  let refused = false;
  let failed = false;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const frame = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      for (const line of frame.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload);
          if (ev.type === "response.output_text.delta") text += ev.delta ?? "";
          else if (ev.type === "response.refusal.delta") refused = true;
          else if (ev.type === "response.failed" || ev.type === "error") failed = true;
        } catch {
          /* partial or non-JSON frame */
        }
      }
    }
  }
  if (refused) throw new Error("The analyzer declined to assess this image. Try a different, clear face photo.");
  if (failed || !text) throw new Error("Analysis could not be completed. Please try again.");
  const parsed = ResultSchema.safeParse(JSON.parse(text));
  if (!parsed.success) throw new Error("Analysis returned an unexpected result. Please try again.");
  const r = parsed.data;
  if (r.image_quality !== "good") return { ...r, findings: [], recommendations: [] };
  return r;
}

export const analyzeSkin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        image: z
          .string()
          .max(7_000_000)
          .regex(/^data:image\/(jpeg|png|webp);base64,/, "Invalid image"),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    // Image is processed in-memory only; nothing is stored here.
    return callResponses(data.image);
  });

export const saveSkinAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ result: ResultSchema, imagePath: z.string().max(300).nullable() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.imagePath && !data.imagePath.startsWith(`${context.userId}/`)) throw new Error("Invalid image path");
    if (data.result.image_quality !== "good") throw new Error("Only completed analyses can be saved.");
    const { data: row, error } = await context.supabase
      .from("skin_analyses")
      .insert({
        user_id: context.userId,
        image_quality: data.result.image_quality,
        findings: data.result.findings,
        recommendations: data.result.recommendations,
        summary: data.result.summary,
        image_path: data.imagePath,
        model: SKIN_MODEL,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const listSkinData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [a, c] = await Promise.all([
      context.supabase
        .from("skin_analyses")
        .select("id, findings, recommendations, summary, image_path, created_at")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(20),
      context.supabase
        .from("presentation_checkins")
        .select("id, confidence, preparedness, camera_comfort, improvement_goal, created_at")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    if (a.error) throw new Error(a.error.message);
    if (c.error) throw new Error(c.error.message);
    const analyses = await Promise.all(
      (a.data ?? []).map(async (r) => {
        let thumb: string | null = null;
        if (r.image_path) {
          const { data } = await context.supabase.storage.from("skin-photos").createSignedUrl(r.image_path, 600);
          thumb = data?.signedUrl ?? null;
        }
        return { ...r, findings: r.findings as SkinResult["findings"], recommendations: r.recommendations as string[], thumb };
      }),
    );
    return { analyses, checkins: c.data ?? [] };
  });

export const deleteSkinAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("skin_analyses")
      .select("image_path")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (row?.image_path) await context.supabase.storage.from("skin-photos").remove([row.image_path]);
    const { error } = await context.supabase.from("skin_analyses").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveCheckin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        confidence: z.number().int().min(1).max(10),
        preparedness: z.number().int().min(1).max(10),
        camera_comfort: z.number().int().min(1).max(10),
        improvement_goal: z.string().trim().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("presentation_checkins").insert({
      user_id: context.userId,
      ...data,
      improvement_goal: data.improvement_goal || null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

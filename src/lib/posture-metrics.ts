/**
 * Pure, browser/server-safe posture measurement + coaching logic.
 * All values are derived from real MediaPipe pose landmarks — never estimated.
 */

export type Landmark = { x: number; y: number; z?: number; visibility?: number };
export type View = "front" | "side";

export const METRIC_KEYS = [
  "head_tilt",
  "head_centering",
  "forward_head",
  "shoulder_tilt",
  "hip_tilt",
  "torso_lean",
  "symmetry",
  "stability",
] as const;
export type MetricKey = (typeof METRIC_KEYS)[number];

export type Metric = {
  value: number | null;
  unit: "°" | "%" | "ratio";
  status: "within" | "adjust" | "insufficient";
  /** Why the metric could not be read, when insufficient. */
  reason?: string;
};
export type Measurements = Record<MetricKey, Metric>;

export const METRIC_LABELS: Record<MetricKey, string> = {
  head_tilt: "Head tilt (ear line)",
  head_centering: "Head centred over shoulders",
  forward_head: "Forward head position",
  shoulder_tilt: "Shoulder level",
  hip_tilt: "Hip level",
  torso_lean: "Torso lean from vertical",
  symmetry: "Left/right torso symmetry",
  stability: "Stillness / stability",
};

/** Pageant-range thresholds (|value| at or below = within range; symmetry: at or above). */
export const THRESHOLDS: Record<MetricKey, number> = {
  head_tilt: 4,
  head_centering: 8,
  forward_head: 15,
  shoulder_tilt: 3,
  hip_tilt: 3,
  torso_lean: 4,
  symmetry: 93,
  stability: 2,
};

const NOT_ENOUGH = "Not enough visual information";
const MIN_VIS = 0.5;
const I = { nose: 0, lEar: 7, rEar: 8, lSh: 11, rSh: 12, lHip: 23, rHip: 24 };

const insufficient = (unit: Metric["unit"], reason = NOT_ENOUGH): Metric => ({
  value: null,
  unit,
  status: "insufficient",
  reason,
});
const judge = (key: MetricKey, value: number, unit: Metric["unit"]): Metric => {
  const v = Math.round(value * 10) / 10;
  const ok = key === "symmetry" ? v >= THRESHOLDS[key] : Math.abs(v) <= THRESHOLDS[key];
  return { value: v, unit, status: ok ? "within" : "adjust" };
};

/** Degrees of a line from horizontal, folded into [-90, 90]. */
const tiltDeg = (a: Landmark, b: Landmark, w: number, h: number) => {
  let d = (Math.atan2((b.y - a.y) * h, (b.x - a.x) * w) * 180) / Math.PI;
  if (d > 90) d -= 180;
  if (d < -90) d += 180;
  return d;
};

/** Compute single-frame measurements. `w`/`h` = image pixel size (landmarks are normalised). */
export function measureFrame(lm: Landmark[] | undefined, w: number, h: number, view: View) {
  const out = {} as Measurements;
  const ok = (i: number) => !!lm?.[i] && (lm[i]!.visibility ?? 1) >= MIN_VIS;
  const P = (i: number) => lm![i]!;
  const has = (...ids: number[]) => ids.every(ok);
  const px = (a: Landmark, b: Landmark) => Math.hypot((a.x - b.x) * w, (a.y - b.y) * h);

  const sideMsg = "Not measurable from a side view — use a front-facing photo";
  const frontMsg = "Not measurable from a front view — use a side-profile photo";

  // Head tilt (ear line)
  out.head_tilt =
    view === "front" && has(I.lEar, I.rEar)
      ? judge("head_tilt", tiltDeg(P(I.rEar), P(I.lEar), w, h), "°")
      : insufficient("°", view === "side" ? sideMsg : undefined);

  // Shoulders / hips
  out.shoulder_tilt =
    view === "front" && has(I.lSh, I.rSh)
      ? judge("shoulder_tilt", tiltDeg(P(I.rSh), P(I.lSh), w, h), "°")
      : insufficient("°", view === "side" ? sideMsg : undefined);
  out.hip_tilt =
    view === "front" && has(I.lHip, I.rHip)
      ? judge("hip_tilt", tiltDeg(P(I.rHip), P(I.lHip), w, h), "°")
      : insufficient("°", view === "side" ? sideMsg : undefined);

  // Head centring: nose horizontal offset from shoulder midpoint, % of shoulder width
  if (view === "front" && has(I.nose, I.lSh, I.rSh)) {
    const sw = px(P(I.lSh), P(I.rSh));
    const mid = (P(I.lSh).x + P(I.rSh).x) / 2;
    out.head_centering =
      sw > 10 ? judge("head_centering", (((P(I.nose).x - mid) * w) / sw) * 100, "%") : insufficient("%");
  } else out.head_centering = insufficient("%", view === "side" ? sideMsg : undefined);

  // Torso lean: shoulder-mid vs hip-mid from vertical (works in both views using visible side)
  const shoulder =
    has(I.lSh, I.rSh)
      ? { x: (P(I.lSh).x + P(I.rSh).x) / 2, y: (P(I.lSh).y + P(I.rSh).y) / 2 }
      : ok(I.lSh) ? P(I.lSh) : ok(I.rSh) ? P(I.rSh) : null;
  const hip =
    has(I.lHip, I.rHip)
      ? { x: (P(I.lHip).x + P(I.rHip).x) / 2, y: (P(I.lHip).y + P(I.rHip).y) / 2 }
      : ok(I.lHip) ? P(I.lHip) : ok(I.rHip) ? P(I.rHip) : null;
  if (shoulder && hip && hip.y > shoulder.y) {
    const lean = (Math.atan2((shoulder.x - hip.x) * w, (hip.y - shoulder.y) * h) * 180) / Math.PI;
    out.torso_lean = judge("torso_lean", lean, "°");
  } else out.torso_lean = insufficient("°");

  // Forward head (side view): ear ahead of shoulder, % of torso length
  if (view === "side") {
    const ear = ok(I.lEar) ? P(I.lEar) : ok(I.rEar) ? P(I.rEar) : null;
    const sh = ok(I.lSh) ? P(I.lSh) : ok(I.rSh) ? P(I.rSh) : null;
    if (ear && sh && hip) {
      const torso = px(sh, hip as Landmark);
      // direction the body faces = sign of nose relative to shoulder
      const facing = ok(I.nose) ? Math.sign(P(I.nose).x - sh.x) || 1 : 1;
      out.forward_head =
        torso > 10
          ? judge("forward_head", ((((ear.x - sh.x) * w) * facing) / torso) * 100, "%")
          : insufficient("%");
    } else out.forward_head = insufficient("%");
  } else out.forward_head = insufficient("%", frontMsg);

  // Symmetry: left vs right shoulder-to-hip vertical length
  if (view === "front" && has(I.lSh, I.rSh, I.lHip, I.rHip)) {
    const L = px(P(I.lSh), P(I.lHip));
    const R = px(P(I.rSh), P(I.rHip));
    out.symmetry = Math.max(L, R) > 10 ? judge("symmetry", (1 - Math.abs(L - R) / Math.max(L, R)) * 100, "%") : insufficient("%");
  } else out.symmetry = insufficient("%", view === "side" ? sideMsg : undefined);

  out.stability = insufficient("%", "Only measurable with live camera analysis");
  return out;
}

/** Average multiple frames and compute stability (shoulder-midpoint sway, % of shoulder width). */
export function aggregateFrames(
  frames: { m: Measurements; sway?: { x: number; y: number; sw: number } | undefined }[],
): Measurements {
  const out = {} as Measurements;
  for (const k of METRIC_KEYS) {
    if (k === "stability") continue;
    const vals = frames.map((f) => f.m[k]).filter((m) => m.value != null);
    if (vals.length < Math.max(1, Math.ceil(frames.length / 2))) {
      out[k] = frames[0]?.m[k]?.reason ? { ...frames[0]!.m[k], value: null, status: "insufficient" } : insufficient(frames[0]?.m[k]?.unit ?? "°");
    } else {
      const avg = vals.reduce((s, m) => s + (m.value as number), 0) / vals.length;
      out[k] = judge(k, avg, vals[0]!.unit);
    }
  }
  const sw = frames.map((f) => f.sway).filter(Boolean) as { x: number; y: number; sw: number }[];
  if (sw.length >= 10) {
    const mx = sw.reduce((s, p) => s + p.x, 0) / sw.length;
    const my = sw.reduce((s, p) => s + p.y, 0) / sw.length;
    const sd = Math.sqrt(sw.reduce((s, p) => s + (p.x - mx) ** 2 + (p.y - my) ** 2, 0) / sw.length);
    const avgW = sw.reduce((s, p) => s + p.sw, 0) / sw.length;
    out.stability = avgW > 10 ? judge("stability", (sd / avgW) * 100, "%") : insufficient("%");
  } else {
    out.stability = insufficient("%", frames.length > 1 ? NOT_ENOUGH : "Only measurable with live camera analysis");
  }
  return out;
}

export const measurableCount = (m: Measurements) =>
  METRIC_KEYS.filter((k) => m[k]?.value != null).length;
export const withinCount = (m: Measurements) =>
  METRIC_KEYS.filter((k) => m[k]?.status === "within").length;

export type CoachingTip = { key: MetricKey | "stage"; title: string; tip: string };

/** Deterministic pageant coaching derived from the actual measurements. */
export function buildCoaching(m: Measurements): CoachingTip[] {
  const tips: CoachingTip[] = [];
  const v = (k: MetricKey) => m[k]?.value as number;
  const adj = (k: MetricKey) => m[k]?.status === "adjust";

  if (adj("head_tilt"))
    tips.push({
      key: "head_tilt",
      title: `Head tilts ${Math.abs(v("head_tilt"))}° ${v("head_tilt") > 0 ? "toward your left" : "toward your right"}`,
      tip: "Level your chin as if balancing a crown. In front of a mirror, line both earlobes up with an imaginary horizontal line, hold 30 seconds, repeat 5×.",
    });
  if (adj("head_centering"))
    tips.push({
      key: "head_centering",
      title: "Head is off-centre over your shoulders",
      tip: "Imagine a string pulling the crown of your head straight up from your sternum. Practise your opening introduction with your nose aligned over your collarbone notch.",
    });
  if (adj("forward_head"))
    tips.push({
      key: "forward_head",
      title: `Head sits ${v("forward_head")}% ahead of your shoulders`,
      tip: "Do chin tucks (3×10 daily) and wall stands: heels, glutes, shoulder blades and back of head on the wall for 60 seconds. This lengthens the neckline judges see in evening gown.",
    });
  if (adj("shoulder_tilt"))
    tips.push({
      key: "shoulder_tilt",
      title: `Shoulders uneven by ${Math.abs(v("shoulder_tilt"))}°`,
      tip: "Roll both shoulders up, back and down, then let them settle evenly. Check when carrying a bag on one side — switch sides during training weeks.",
    });
  if (adj("hip_tilt"))
    tips.push({
      key: "hip_tilt",
      title: `Hips uneven by ${Math.abs(v("hip_tilt"))}°`,
      tip: "For your stage pose, distribute weight deliberately: a pageant T-stance with weight on the back foot is fine, but in a neutral stance keep weight even across both feet.",
    });
  if (adj("torso_lean"))
    tips.push({
      key: "torso_lean",
      title: `Torso leans ${Math.abs(v("torso_lean"))}° from vertical`,
      tip: "Engage your core lightly and stack ribs over hips. Practise a runway walk holding a book on your head for 2 minutes a day.",
    });
  if (adj("symmetry"))
    tips.push({
      key: "symmetry",
      title: `Torso symmetry ${v("symmetry")}%`,
      tip: "One side of your torso is shortened — often from leaning into one hip. Add side planks (3×20s each side) and check your mirror pose from the front.",
    });
  if (adj("stability"))
    tips.push({
      key: "stability",
      title: `Noticeable sway (${v("stability")}% of shoulder width)`,
      tip: "Plant your feet, soften the knees and breathe low into your belly. Practise holding your final stage pose for a slow count of 5 before turning.",
    });

  if (measurableCount(m) > 0 && tips.length === 0)
    tips.push({
      key: "stage",
      title: "All measured alignment is within pageant range",
      tip: "Maintain it under pressure: rehearse your walk and turns in your competition heels and record yourself from the front and side weekly.",
    });

  tips.push({
    key: "stage",
    title: "Stage presence practice",
    tip: "Hold eye level with the back row, pause 2 seconds at each mark, and keep shoulders down and back during your turn. Smile with your eyes before you speak.",
  });
  return tips;
}

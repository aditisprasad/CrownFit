import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Camera, Upload, Loader2, Trash2, ShieldCheck, AlertCircle, X } from "lucide-react";
import { toast } from "sonner";
import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import {
  savePostureAnalysis,
  listPostureAnalyses,
  deletePostureAnalysis,
} from "@/lib/posture.functions";
import {
  METRIC_KEYS,
  METRIC_LABELS,
  THRESHOLDS,
  aggregateFrames,
  buildCoaching,
  measureFrame,
  measurableCount,
  withinCount,
  type Landmark,
  type Measurements,
  type View,
} from "@/lib/posture-metrics";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/posture-analysis")({
  head: () => ({
    meta: [
      { title: "Posture & Stage Presence Analyzer — CrownFit" },
      {
        name: "description",
        content:
          "Measure head, shoulder, hip and torso alignment from real body landmarks for pageant stage presence.",
      },
      { property: "og:title", content: "Posture & Stage Presence Analyzer — CrownFit" },
      {
        property: "og:description",
        content: "Private, landmark-based posture measurements with pageant-specific coaching.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PosturePage,
});

const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const LIVE_MS = 4000;

let landmarkerPromise: Promise<PoseLandmarker> | null = null;
function getLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
      const fs = await FilesetResolver.forVisionTasks(WASM);
      return PoseLandmarker.createFromOptions(fs, {
        baseOptions: { modelAssetPath: MODEL },
        runningMode: "IMAGE",
        numPoses: 2,
      });
    })().catch((e) => {
      landmarkerPromise = null;
      throw e;
    });
  }
  return landmarkerPromise;
}

const EDGES: [number, number][] = [
  [11, 12],
  [11, 23],
  [12, 24],
  [23, 24],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
  [7, 0],
  [8, 0],
];

function drawPose(c: HTMLCanvasElement, lm: Landmark[] | undefined) {
  const ctx = c.getContext("2d");
  if (!ctx || !lm) return;
  const s = getComputedStyle(document.documentElement);
  const gold = `hsl(${s.getPropertyValue("--gold").trim() || "40 60% 50%"})`;
  ctx.strokeStyle = gold;
  ctx.fillStyle = gold;
  ctx.lineWidth = Math.max(2, c.width / 300);
  for (const [a, b] of EDGES) {
    const p = lm[a],
      q = lm[b];
    if (!p || !q || (p.visibility ?? 1) < 0.5 || (q.visibility ?? 1) < 0.5) continue;
    ctx.beginPath();
    ctx.moveTo(p.x * c.width, p.y * c.height);
    ctx.lineTo(q.x * c.width, q.y * c.height);
    ctx.stroke();
  }
  for (const i of [0, 7, 8, 11, 12, 23, 24]) {
    const p = lm[i];
    if (!p || (p.visibility ?? 1) < 0.5) continue;
    ctx.beginPath();
    ctx.arc(p.x * c.width, p.y * c.height, ctx.lineWidth * 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

type Result = { m: Measurements; source: "photo" | "camera_live"; frames: number; people: number };

function PosturePage() {
  const qc = useQueryClient();
  const save = useServerFn(savePostureAnalysis);
  const list = useServerFn(listPostureAnalyses);
  const del = useServerFn(deletePostureAnalysis);
  const { data: history, isLoading: histLoading } = useQuery({
    queryKey: ["posture-analyses"],
    queryFn: () => list(),
  });

  const [view, setView] = useState<View>("front");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [camOn, setCamOn] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [hasImage, setHasImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const stopCam = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamOn(false);
  };
  useEffect(() => stopCam, []);

  const clear = () => {
    setResult(null);
    setError(null);
    setHasImage(false);
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    stopCam();
    clear();
    if (!f.type.startsWith("image/")) return setError("Please choose an image file.");
    setBusy("Detecting body landmarks…");
    try {
      const bmp = await createImageBitmap(f).catch(() => {
        throw new Error("This file isn't a valid image.");
      });
      if (Math.min(bmp.width, bmp.height) < 256)
        throw new Error("Image is too small — use a photo at least 256px on each side.");
      const scale = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
      const c = canvasRef.current!;
      c.width = Math.round(bmp.width * scale);
      c.height = Math.round(bmp.height * scale);
      c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
      setHasImage(true);
      const lmk = await getLandmarker();
      await lmk.setOptions({ runningMode: "IMAGE" });
      const r = lmk.detect(c);
      const pose = r.landmarks[0] as Landmark[] | undefined;
      if (!pose) {
        setResult({
          m: measureFrame(undefined, c.width, c.height, view),
          source: "photo",
          frames: 1,
          people: 0,
        });
        return;
      }
      drawPose(c, pose);
      setResult({
        m: measureFrame(pose, c.width, c.height, view),
        source: "photo",
        frames: 1,
        people: r.landmarks.length,
      });
    } catch (e) {
      setError(
        (e as Error).message ||
          "Body landmark detection failed to load. Check your connection and try again.",
      );
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const startCam = async () => {
    clear();
    if (!navigator.mediaDevices?.getUserMedia)
      return setError("Camera isn't available in this browser. You can upload a photo instead.");
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 1280 },
      });
      streamRef.current = s;
      setCamOn(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          void videoRef.current.play();
        }
      });
      void getLandmarker().catch(() => undefined);
    } catch {
      setError("Camera permission was denied or unavailable. You can upload a photo instead.");
    }
  };

  const runLive = async () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    setError(null);
    setBusy("Hold your pose — analysing for 4 seconds…");
    try {
      const lmk = await getLandmarker();
      await lmk.setOptions({ runningMode: "VIDEO" });
      const frames: Parameters<typeof aggregateFrames>[0] = [];
      let people = 0;
      let last: Landmark[] | undefined;
      const start = performance.now();
      await new Promise<void>((done) => {
        const tick = () => {
          const now = performance.now();
          const r = lmk.detectForVideo(v, now);
          const pose = r.landmarks[0] as Landmark[] | undefined;
          people = Math.max(people, r.landmarks.length);
          if (pose) {
            last = pose;
            const ls = pose[11],
              rs = pose[12];
            const sway =
              ls && rs && (ls.visibility ?? 1) >= 0.5 && (rs.visibility ?? 1) >= 0.5
                ? {
                    x: ((ls.x + rs.x) / 2) * v.videoWidth,
                    y: ((ls.y + rs.y) / 2) * v.videoHeight,
                    sw: Math.hypot((ls.x - rs.x) * v.videoWidth, (ls.y - rs.y) * v.videoHeight),
                  }
                : undefined;
            frames.push({ m: measureFrame(pose, v.videoWidth, v.videoHeight, view), sway });
          }
          if (now - start < LIVE_MS) requestAnimationFrame(tick);
          else done();
        };
        requestAnimationFrame(tick);
      });
      const c = canvasRef.current!;
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      c.getContext("2d")!.drawImage(v, 0, 0);
      drawPose(c, last);
      setHasImage(true);
      stopCam();
      setResult({
        m: frames.length
          ? aggregateFrames(frames)
          : measureFrame(undefined, c.width, c.height, view),
        source: "camera_live",
        frames: frames.length,
        people,
      });
    } catch (e) {
      setError((e as Error).message || "Live analysis failed. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const onSave = async () => {
    if (!result) return;
    setSaving(true);
    try {
      await save({
        data: {
          source: result.source,
          view,
          frames: Math.max(1, result.frames),
          measurements: result.m,
        },
      });
      toast.success("Posture analysis saved");
      await qc.invalidateQueries({ queryKey: ["posture-analyses"] });
      await qc.invalidateQueries({ queryKey: ["insights"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    try {
      await del({ data: { id } });
      toast.success("Analysis deleted");
      await qc.invalidateQueries({ queryKey: ["posture-analyses"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const measurable = result ? measurableCount(result.m) : 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="eyebrow">Coaching</p>
        <h1 className="font-display text-4xl">Posture & Stage Presence</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Real body landmarks are detected on your device. We measure head, shoulder, hip and torso
          alignment — no invented scores. Photos and video never leave your browser; only the
          measurements are saved, and only when you choose to.
        </p>
      </header>

      <div className="rounded-lg border border-border bg-card p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Camera angle:</span>
          {(["front", "side"] as const).map((v) => (
            <button
              key={v}
              onClick={() => {
                setView(v);
                setResult(null);
              }}
              className={cn(
                "rounded-full border px-3 py-1 text-sm",
                view === v
                  ? "border-gold bg-secondary text-gold"
                  : "border-border text-muted-foreground",
              )}
            >
              {v === "front" ? "Front-facing" : "Side profile"}
            </button>
          ))}
        </div>
        <ul className="mb-4 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
          <li>• Stand 2–3 m from the camera; head to hips (ideally full body) in frame.</li>
          <li>• Good, even lighting; fitted clothing so shoulders and hips are visible.</li>
          <li>• Only one person in the frame.</li>
          <li>
            •{" "}
            {view === "front"
              ? "Face the camera squarely, arms relaxed."
              : "Turn 90° so your side faces the camera."}
          </li>
        </ul>
        <div className="flex flex-wrap gap-2">
          {!camOn ? (
            <button
              onClick={startCam}
              disabled={!!busy}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
            >
              <Camera className="h-4 w-4" /> Use camera
            </button>
          ) : (
            <>
              <button
                onClick={runLive}
                disabled={!!busy}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
              >
                <Camera className="h-4 w-4" /> Analyse live (4s)
              </button>
              <button
                onClick={stopCam}
                disabled={!!busy}
                className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm"
              >
                <X className="h-4 w-4" /> Stop camera
              </button>
            </>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={!!busy}
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm disabled:opacity-50"
          >
            <Upload className="h-4 w-4" /> Upload photo
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          {(hasImage || result) && !busy && (
            <button
              onClick={clear}
              className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm"
            >
              <Trash2 className="h-4 w-4" /> Clear
            </button>
          )}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="relative overflow-hidden rounded-md bg-secondary/40">
            <video
              ref={videoRef}
              playsInline
              muted
              className={cn("w-full -scale-x-100", !camOn && "hidden")}
            />
            <canvas ref={canvasRef} className={cn("w-full", (camOn || !hasImage) && "hidden")} />
            {!camOn && !hasImage && (
              <div className="flex aspect-[3/4] items-center justify-center p-6 text-center text-sm text-muted-foreground">
                Start the camera or upload a photo to begin.
              </div>
            )}
            {busy && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/70 text-sm">
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-gold" /> {busy}
              </div>
            )}
          </div>

          <div className="space-y-3">
            {error && (
              <p className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
              </p>
            )}
            {result && result.people === 0 && (
              <p className="rounded-md border border-border p-3 text-sm">
                <strong>Not enough visual information.</strong> No person was detected. Make sure
                your head, shoulders and hips are clearly visible and well lit, then try again.
              </p>
            )}
            {result && result.people > 1 && (
              <p className="rounded-md border border-border p-3 text-sm text-muted-foreground">
                More than one person was detected — measurements use the most prominent person. For
                accurate results, only you should be in frame.
              </p>
            )}
            {result && result.people > 0 && measurable === 0 && (
              <p className="rounded-md border border-border p-3 text-sm">
                <strong>Not enough visual information.</strong> Key body points (shoulders, hips,
                head) weren't clear enough to measure. Step back so more of your body is in frame.
              </p>
            )}
            {result && measurable > 0 && (
              <>
                <p className="text-sm text-muted-foreground">
                  {withinCount(result.m)} of {measurable} measurable checks within pageant range ·{" "}
                  {result.source === "camera_live"
                    ? `${result.frames} frames analysed`
                    : "single photo"}
                </p>
                <MetricTable m={result.m} />
                <button
                  onClick={onSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save measurements
                </button>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3 w-3" /> Only numbers are saved — never the image.
                  Visible only to you.
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {result && measurable > 0 && (
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="mb-3 font-display text-2xl">Pageant coaching</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {buildCoaching(result.m).map((t, i) => (
              <div key={i} className="rounded-md border border-border p-4">
                <p className="font-medium">{t.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t.tip}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Coaching guidance only — not medical or physiotherapy advice. Consult a professional for
            pain or injury.
          </p>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-3 font-display text-2xl">History</h2>
        {histLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-gold" />
        ) : !history?.length ? (
          <p className="text-sm text-muted-foreground">No saved posture analyses yet.</p>
        ) : (
          <ul className="space-y-3">
            {history.map((h) => (
              <li key={h.id} className="rounded-md border border-border p-4">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>
                    {new Date(h.created_at).toLocaleString()} ·{" "}
                    {h.view === "front" ? "Front" : "Side"} ·{" "}
                    {h.source === "camera_live" ? `Live (${h.frames_analyzed} frames)` : "Photo"} ·{" "}
                    {withinCount(h.measurements)}/{measurableCount(h.measurements)} within range
                  </span>
                  <button
                    onClick={() => onDelete(h.id)}
                    aria-label="Delete analysis"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <MetricTable m={h.measurements} compact />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function MetricTable({ m, compact }: { m: Measurements; compact?: boolean }) {
  return (
    <table className="w-full text-sm">
      <tbody>
        {METRIC_KEYS.filter((k) => !compact || m[k]?.value != null).map((k) => {
          const x = m[k];
          return (
            <tr key={k} className="border-b border-border/60 last:border-0">
              <td className="py-1.5 pr-2">{METRIC_LABELS[k]}</td>
              <td className="py-1.5 text-right">
                {x?.value != null ? (
                  <span className={x.status === "within" ? "text-foreground" : "text-gold"}>
                    {x.value}
                    {x.unit === "ratio" ? "" : x.unit}{" "}
                    <span className="text-xs text-muted-foreground">
                      ({x.status === "within" ? "within" : "adjust"}; target{" "}
                      {k === "symmetry" ? "≥" : "≤"}
                      {THRESHOLDS[k]}
                      {x.unit})
                    </span>
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {x?.reason ?? "Not enough visual information"}
                  </span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

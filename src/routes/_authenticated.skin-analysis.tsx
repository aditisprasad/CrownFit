import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Camera, Upload, Loader2, Trash2, RefreshCw, ShieldCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  analyzeSkin,
  saveSkinAnalysis,
  listSkinData,
  deleteSkinAnalysis,
  saveCheckin,
  FINDING_LABELS,
  type SkinResult,
} from "@/lib/skin.functions";

export const Route = createFileRoute("/_authenticated/skin-analysis")({
  head: () => ({
    meta: [
      { title: "Skin & Presentation Analyzer — CrownFit" },
      { name: "description", content: "Non-medical visual skin and presentation assessment for pageant preparation." },
      { property: "og:title", content: "Skin & Presentation Analyzer — CrownFit" },
      { property: "og:description", content: "Track visible skin appearance and stage-readiness with private, non-medical assessments." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SkinPage,
});

const QUALITY_MSG: Record<string, string> = {
  no_face: "No face was detected in this photo. Please use a clear, front-facing photo.",
  face_not_visible: "Your face isn't sufficiently visible. Face the camera directly and fill more of the frame.",
  low_quality: "The image quality is too low for a reliable read (lighting, blur or filters). Please retake.",
};

/** Downscale + re-encode in the browser (also strips EXIF/location metadata). */
async function toJpeg(src: Blob | HTMLVideoElement): Promise<{ dataUrl: string; blob: Blob }> {
  let w: number, h: number, draw: CanvasImageSource;
  if (src instanceof HTMLVideoElement) {
    w = src.videoWidth;
    h = src.videoHeight;
    draw = src;
  } else {
    const bmp = await createImageBitmap(src).catch(() => {
      throw new Error("This file isn't a valid image.");
    });
    w = bmp.width;
    h = bmp.height;
    draw = bmp;
  }
  if (Math.min(w, h) < 256) throw new Error("Image is too small — please use a photo at least 256px on each side.");
  const scale = Math.min(1, 1024 / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.round(w * scale);
  c.height = Math.round(h * scale);
  c.getContext("2d")!.drawImage(draw, 0, 0, c.width, c.height);
  const dataUrl = c.toDataURL("image/jpeg", 0.85);
  const blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), "image/jpeg", 0.85));
  return { dataUrl, blob };
}

function SkinPage() {
  const qc = useQueryClient();
  const analyze = useServerFn(analyzeSkin);
  const save = useServerFn(saveSkinAnalysis);
  const fetchData = useServerFn(listSkinData);
  const del = useServerFn(deleteSkinAnalysis);
  const { data } = useQuery({ queryKey: ["skin-data"], queryFn: () => fetchData() });

  const [image, setImage] = useState<{ dataUrl: string; blob: Blob } | null>(null);
  const [camOn, setCamOn] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SkinResult | null>(null);
  const [keepPhoto, setKeepPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const stopCam = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamOn(false);
  };
  useEffect(() => stopCam, []);

  const startCam = async () => {
    setCamError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamError("Camera isn't available in this browser. You can upload a photo instead.");
      return;
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = s;
      setCamOn(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          void videoRef.current.play();
        }
      });
    } catch {
      setCamError("Camera permission was denied or unavailable. You can upload a photo instead.");
    }
  };

  const reset = () => {
    setImage(null);
    setResult(null);
    setError(null);
  };

  const capture = async () => {
    if (!videoRef.current) return;
    try {
      const img = await toJpeg(videoRef.current);
      reset();
      setImage(img);
      stopCam();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    reset();
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) {
      setError("Please choose a JPG, PNG or WebP image.");
      return;
    }
    try {
      setImage(await toJpeg(f));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const run = async () => {
    if (!image) {
      setError("Please take or upload a photo first.");
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await analyze({ data: { image: image.dataUrl } }));
    } catch (e) {
      setError((e as Error).message || "Analysis is unavailable right now.");
    } finally {
      setBusy(false);
    }
  };

  const doSave = async () => {
    if (!result) return;
    setSaving(true);
    try {
      let imagePath: string | null = null;
      if (keepPhoto && image) {
        const { data: u } = await supabase.auth.getUser();
        imagePath = `${u.user!.id}/${crypto.randomUUID()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("skin-photos")
          .upload(imagePath, image.blob, { contentType: "image/jpeg" });
        if (upErr) throw upErr;
      }
      await save({ data: { result, imagePath } });
      toast.success("Analysis saved privately to your profile");
      await qc.invalidateQueries({ queryKey: ["skin-data"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const prev = data?.analyses[0];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <p className="eyebrow">Coaching</p>
        <h1 className="font-display text-4xl">Skin & Presentation Analyzer</h1>
        <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-gold" /> Visual skin assessment — not a medical diagnosis.
        </p>
      </header>

      <section className="grid gap-6 rounded-lg border border-border bg-card p-6 md:grid-cols-2">
        <div className="space-y-3">
          <div className="flex aspect-[4/5] items-center justify-center overflow-hidden rounded-md bg-secondary">
            {camOn ? (
              <video ref={videoRef} playsInline muted className="h-full w-full -scale-x-100 object-cover" />
            ) : image ? (
              <img src={image.dataUrl} alt="Selected photo" className="h-full w-full object-cover" />
            ) : (
              <p className="px-6 text-center text-sm text-muted-foreground">No image selected</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {camOn ? (
              <>
                <button onClick={capture} className="btn-gold inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
                  <Camera className="h-4 w-4" /> Capture
                </button>
                <button onClick={stopCam} className="rounded-md border border-border px-4 py-2 text-sm">
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button onClick={startCam} className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm">
                  {image ? <RefreshCw className="h-4 w-4" /> : <Camera className="h-4 w-4" />} {image ? "Retake" : "Use camera"}
                </button>
                <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm">
                  <Upload className="h-4 w-4" /> {image ? "Replace" : "Upload photo"}
                </button>
                {image && (
                  <button onClick={reset} className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm">
                    <Trash2 className="h-4 w-4" /> Remove
                  </button>
                )}
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                void onFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
          {camError && <p className="text-sm text-destructive">{camError}</p>}
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="font-display text-2xl">Capture guidance</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Use good natural or neutral lighting</li>
              <li>Face the camera directly</li>
              <li>Avoid heavy filters</li>
              <li>Keep your face clearly visible</li>
              <li>Avoid extreme angles</li>
            </ul>
          </div>
          <p className="text-xs text-muted-foreground">
            Your photo is analysed privately and is not stored unless you choose to save it below.
          </p>
          <button
            onClick={run}
            disabled={busy || !image}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm text-primary-foreground disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} {busy ? "Analysing…" : "Analyse photo"}
          </button>
          {error && (
            <p className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </p>
          )}
        </div>
      </section>

      {result && result.image_quality !== "good" && (
        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="font-display text-2xl">Not enough visual information</h2>
          <p className="mt-2 text-sm text-muted-foreground">{QUALITY_MSG[result.image_quality]}</p>
          {result.quality_note && <p className="mt-1 text-sm text-muted-foreground">{result.quality_note}</p>}
        </section>
      )}

      {result && result.image_quality === "good" && (
        <section className="space-y-6 rounded-lg border border-border bg-card p-6">
          <div>
            <p className="eyebrow">Visual skin assessment — not a medical diagnosis</p>
            <h2 className="font-display text-2xl">Skin appearance</h2>
            <p className="mt-1 text-sm text-muted-foreground">{result.summary}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {result.findings.map((f) => {
              const before = prev?.findings.find((p) => p.key === f.key)?.level;
              return (
                <div key={f.key} className="rounded-md border border-border p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{FINDING_LABELS[f.key]}</p>
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-gold">{f.level}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{f.explanation}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    <span className="text-foreground">Pageant relevance:</span> {f.relevance}
                  </p>
                  {before && before !== f.level && (
                    <p className="mt-1 text-xs text-gold">Previously: {before}</p>
                  )}
                </div>
              );
            })}
          </div>
          {result.recommendations.length > 0 && (
            <div>
              <h3 className="font-display text-xl">Pageant-prep suggestions</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {result.recommendations.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">General, non-medical guidance. For skin concerns, consult a dermatologist.</p>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-4 border-t border-border pt-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={keepPhoto} onChange={(e) => setKeepPhoto(e.target.checked)} />
              Also keep the photo (private, only you can see it)
            </label>
            <button
              onClick={doSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save to my profile
            </button>
          </div>
        </section>
      )}

      <CheckIn />

      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="font-display text-2xl">Your history</h2>
        {!data ? (
          <Loader2 className="mt-3 h-4 w-4 animate-spin text-gold" />
        ) : data.analyses.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No saved analyses yet.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {data.analyses.map((a, i) => {
              const older = data.analyses[i + 1];
              const changed = older
                ? a.findings.filter((f) => older.findings.find((o) => o.key === f.key)?.level !== f.level)
                : [];
              return (
                <li key={a.id} className="flex gap-4 rounded-md border border-border p-4">
                  {a.thumb && <img src={a.thumb} alt="Saved analysis photo" className="h-20 w-16 rounded object-cover" />}
                  <div className="flex-1 text-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{new Date(a.created_at).toLocaleString()}</p>
                      <button
                        aria-label="Delete analysis"
                        onClick={async () => {
                          await del({ data: { id: a.id } });
                          await qc.invalidateQueries({ queryKey: ["skin-data"] });
                        }}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      {a.findings.map((f) => `${FINDING_LABELS[f.key]}: ${f.level}`).join(" · ")}
                    </p>
                    {older && (
                      <p className="mt-1 text-xs text-gold">
                        {changed.length
                          ? `Visible appearance changed since your previous analysis (${changed.map((c) => FINDING_LABELS[c.key]).join(", ")}).`
                          : "No visible change in labels since your previous analysis."}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function CheckIn() {
  const qc = useQueryClient();
  const submit = useServerFn(saveCheckin);
  const [vals, setVals] = useState({ confidence: 5, preparedness: 5, camera_comfort: 5 });
  const [goal, setGoal] = useState("");
  const [busy, setBusy] = useState(false);
  const fields: [keyof typeof vals, string][] = [
    ["confidence", "How confident do you feel today?"],
    ["preparedness", "How prepared do you feel?"],
    ["camera_comfort", "How comfortable do you feel on camera?"],
  ];
  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <h2 className="font-display text-2xl">Confidence check-in</h2>
      <p className="mt-1 text-sm text-muted-foreground">Self-reported — separate from the photo analysis.</p>
      <div className="mt-4 space-y-4">
        {fields.map(([k, label]) => (
          <label key={k} className="block text-sm">
            <span className="flex justify-between">
              {label} <span className="text-gold">{vals[k]}/10</span>
            </span>
            <input
              type="range"
              min={1}
              max={10}
              value={vals[k]}
              onChange={(e) => setVals((v) => ({ ...v, [k]: Number(e.target.value) }))}
              className="mt-1 w-full accent-[var(--gold)]"
            />
          </label>
        ))}
        <label className="block text-sm">
          What would you like to improve before your next pageant appearance?
          <textarea
            value={goal}
            maxLength={500}
            onChange={(e) => setGoal(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background p-2"
            rows={2}
          />
        </label>
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await submit({ data: { ...vals, improvement_goal: goal } });
              toast.success("Check-in saved");
              setGoal("");
              await qc.invalidateQueries({ queryKey: ["skin-data"] });
            } catch (e) {
              toast.error((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
        >
          Save check-in
        </button>
      </div>
    </section>
  );
}

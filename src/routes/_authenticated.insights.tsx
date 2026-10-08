import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles, Activity, Gauge, CalendarDays } from "lucide-react";
import { getInsights } from "@/lib/insights.functions";
import { listSkinData, FINDING_LABELS } from "@/lib/skin.functions";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/insights")({
  head: () => ({
    meta: [
      { title: "Digital Twin & Analytics — CrownFit" },
      {
        name: "description",
        content:
          "Your real readiness score, consistency trends and preparation insights, computed only from what you logged.",
      },
      { property: "og:title", content: "Digital Twin & Analytics — CrownFit" },
      {
        property: "og:description",
        content:
          "Readiness, consistency and progress trends built from your own logged pageant preparation data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InsightsPage,
});

function Bar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex h-24 w-full items-end">
      <div
        className="w-full rounded-t bg-gold/70"
        style={{ height: `${Math.max(pct, value > 0 ? 4 : 0)}%` }}
        aria-hidden
      />
    </div>
  );
}

function InsightsPage() {
  const fetchFn = useServerFn(getInsights);
  const { data, isLoading } = useQuery({ queryKey: ["insights"], queryFn: () => fetchFn() });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-muted-foreground">Analytics unavailable right now.</p>;
  }

  const maxWater = Math.max(data.targets.water_ml, ...data.series.map((d) => d.water_ml));
  const maxSteps = Math.max(data.targets.steps, ...data.series.map((d) => d.steps));

  return (
    <div className="mx-auto max-w-5xl">
      <p className="eyebrow mb-2">Digital twin</p>
      <h1 className="font-display mb-8 text-4xl">Your readiness &amp; analytics</h1>

      <div className="mb-8 grid gap-5 md:grid-cols-3">
        <div className="glass-panel rounded-xl p-6">
          <div className="mb-3 flex items-center gap-2 text-muted-foreground">
            <Gauge className="h-4 w-4 text-gold" />
            <span className="eyebrow">Readiness</span>
          </div>
          {data.readiness != null ? (
            <>
              <p className="font-display text-4xl">{data.readiness}%</p>
              <Progress value={data.readiness} className="mt-3" />
              <p className="mt-2 text-xs text-muted-foreground">
                Based on {data.dataPoints} logged data points
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Not enough data yet. Log your wellness for a few days and complete a mock jury session
              — readiness appears once there is enough real data to be honest about.
            </p>
          )}
        </div>

        <div className="glass-panel rounded-xl p-6">
          <div className="mb-3 flex items-center gap-2 text-muted-foreground">
            <Activity className="h-4 w-4 text-gold" />
            <span className="eyebrow">Streak</span>
          </div>
          <p className="font-display text-4xl">{data.streak}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            consecutive days with logged preparation
          </p>
        </div>

        <div className="glass-panel rounded-xl p-6">
          <div className="mb-3 flex items-center gap-2 text-muted-foreground">
            <CalendarDays className="h-4 w-4 text-gold" />
            <span className="eyebrow">Target</span>
          </div>
          {data.profile?.target_pageant ? (
            <p className="font-display text-2xl leading-tight">{data.profile.target_pageant}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No target pageant set yet.</p>
          )}
          {data.daysToTarget != null && (
            <p className="mt-1 text-xs text-muted-foreground">
              {data.daysToTarget >= 0
                ? `${data.daysToTarget} day(s) to go`
                : "Target date has passed"}
            </p>
          )}
          <Link to="/profile" className="mt-3 inline-block text-xs text-gold underline">
            Update profile ({data.profileCompletion}% complete)
          </Link>
        </div>
      </div>

      <div className="glass-panel mb-8 rounded-xl p-6">
        <h2 className="font-display mb-4 text-2xl">Readiness breakdown</h2>
        <ul className="space-y-4">
          {data.components.map((c) => (
            <li key={c.label}>
              <div className="mb-1 flex items-baseline justify-between text-sm">
                <span>{c.label}</span>
                <span className={c.value == null ? "text-muted-foreground" : "font-medium"}>
                  {c.value == null ? "No data yet" : `${c.value}%`}
                </span>
              </div>
              {c.value != null && <Progress value={c.value} />}
              <p className="mt-1 text-xs text-muted-foreground">{c.detail}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-8 grid gap-5 md:grid-cols-2">
        <div className="glass-panel rounded-xl p-6">
          <h3 className="font-display mb-1 text-xl">Water — last 30 days</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            Target {data.targets.water_ml} ml/day
          </p>
          <div className="flex gap-[2px]">
            {data.series.map((d) => (
              <Bar key={d.day} value={d.water_ml} max={maxWater} />
            ))}
          </div>
        </div>
        <div className="glass-panel rounded-xl p-6">
          <h3 className="font-display mb-1 text-xl">Steps — last 30 days</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            Target {data.targets.steps} steps/day
          </p>
          <div className="flex gap-[2px]">
            {data.series.map((d) => (
              <Bar key={d.day} value={d.steps} max={maxSteps} />
            ))}
          </div>
        </div>
      </div>

      <div className="mb-8 grid gap-5 md:grid-cols-4">
        {(
          [
            ["Water", data.consistency.water],
            ["Training", data.consistency.training],
            ["Steps", data.consistency.steps],
            ["Sleep", data.consistency.sleep],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="glass-panel rounded-xl p-5">
            <p className="eyebrow mb-2">{label}</p>
            {value != null ? (
              <p className="font-display text-3xl">{value}%</p>
            ) : (
              <p className="text-xs text-muted-foreground">Nothing logged yet</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">of the last 14 days on target</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="glass-panel rounded-xl p-6">
          <h3 className="font-display mb-4 text-2xl">What your data says</h3>
          {data.insights.length ? (
            <ul className="space-y-2 text-sm">
              {data.insights.map((i) => (
                <li key={i} className="flex gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                  <span>{i}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No insights yet — they appear as soon as you have logged data to compare.
            </p>
          )}
        </div>

        <div className="glass-panel rounded-xl p-6">
          <h3 className="font-display mb-4 text-2xl">Coming up</h3>
          {data.upcoming.length ? (
            <ul className="divide-y divide-border text-sm">
              {data.upcoming.map((e) => (
                <li key={e.id} className="flex items-center justify-between py-3">
                  <span>{e.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(e.starts_at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nothing scheduled.{" "}
              <Link to="/calendar" className="text-gold underline">
                Add an event
              </Link>
              .
            </p>
          )}
        </div>
      </div>
      <SkinPresentationSection />
      <PostureSection />
    </div>
  );
}

function SkinPresentationSection() {
  const fetchSkin = useServerFn(listSkinData);
  const { data, isLoading } = useQuery({ queryKey: ["skin-data"], queryFn: () => fetchSkin() });
  const latest = data?.analyses[0];
  const prev = data?.analyses[1];
  const changed =
    latest && prev
      ? latest.findings.filter((f) => prev.findings.find((p) => p.key === f.key)?.level !== f.level)
      : [];
  const lastCheck = data?.checkins[0];
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-2xl">Skin & Presentation</h2>
        <Link to="/skin-analysis" className="text-sm text-gold underline">
          Open analyzer
        </Link>
      </div>
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-gold" />
      ) : !latest && !lastCheck ? (
        <p className="text-sm text-muted-foreground">Not enough data yet.</p>
      ) : (
        <div className="grid gap-4 text-sm md:grid-cols-2">
          <div>
            <p className="eyebrow mb-1">Visual assessment (non-medical)</p>
            {latest ? (
              <>
                <p>Last saved {new Date(latest.created_at).toLocaleDateString()}.</p>
                {prev ? (
                  <p className="text-muted-foreground">
                    {changed.length
                      ? `Visible appearance changed since your previous analysis: ${changed.map((c) => FINDING_LABELS[c.key]).join(", ")}.`
                      : "No visible change in labels since your previous analysis."}
                  </p>
                ) : (
                  <p className="text-muted-foreground">Not enough data yet to compare.</p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">Not enough data yet.</p>
            )}
          </div>
          <div>
            <p className="eyebrow mb-1">Self-reported check-in</p>
            {lastCheck ? (
              <p>
                Confidence {lastCheck.confidence}/10 · Prepared {lastCheck.preparedness}/10 · Camera
                comfort {lastCheck.camera_comfort}/10
              </p>
            ) : (
              <p className="text-muted-foreground">Not enough data yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

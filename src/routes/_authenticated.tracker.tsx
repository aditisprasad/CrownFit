import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, Droplets, Utensils, Dumbbell, Footprints, Moon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  getWellness,
  logWater,
  logDiet,
  logExercise,
  logSteps,
  logSleep,
  deleteWellnessEntry,
} from "@/lib/wellness.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/tracker")({
  head: () => ({
    meta: [
      { title: "Personal Tracker — CrownFit" },
      { name: "description", content: "Log water, meals, training, steps and sleep — and see your real 14-day consistency." },
      { property: "og:title", content: "Personal Tracker — CrownFit" },
      { property: "og:description", content: "Log water, meals, training, steps and sleep with real consistency tracking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TrackerPage,
});

function TrackerPage() {
  const qc = useQueryClient();
  const fetchFn = useServerFn(getWellness);
  const waterFn = useServerFn(logWater);
  const dietFn = useServerFn(logDiet);
  const exerciseFn = useServerFn(logExercise);
  const stepsFn = useServerFn(logSteps);
  const sleepFn = useServerFn(logSleep);
  const deleteFn = useServerFn(deleteWellnessEntry);

  const { data, isLoading } = useQuery({ queryKey: ["wellness"], queryFn: () => fetchFn() });
  const refresh = () => qc.invalidateQueries({ queryKey: ["wellness"] });

  const [meal, setMeal] = useState<"breakfast" | "lunch" | "dinner" | "snack">("breakfast");
  const [mealText, setMealText] = useState("");
  const [activity, setActivity] = useState("");
  const [minutes, setMinutes] = useState("");
  const [steps, setSteps] = useState("");
  const [sleepHours, setSleepHours] = useState("");

  const run = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => {
      refresh();
      toast.success("Logged");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save that entry"),
  });

  if (isLoading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  const todayWater = data.water.filter((w) => w.logged_on === data.today).reduce((s, w) => s + (w.amount_ml ?? 0), 0);
  const todaySteps = data.steps.filter((s) => s.logged_on === data.today).reduce((s, r) => s + (r.steps ?? 0), 0);
  const todaySleep = data.sleep.find((s) => s.logged_on === data.today);
  const todayTraining = data.exercise
    .filter((e) => e.logged_on === data.today)
    .reduce((s, e) => s + (e.duration_minutes ?? 0), 0);

  return (
    <div className="mx-auto max-w-5xl">
      <p className="eyebrow mb-2">Daily discipline</p>
      <h1 className="font-display mb-8 text-4xl">Personal tracker</h1>

      <div className="mb-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={<Droplets className="h-4 w-4 text-gold" />} label="Water" value={`${todayWater} ml`} pct={(todayWater / data.targets.water_ml) * 100} sub={`target ${data.targets.water_ml} ml`} />
        <Stat icon={<Footprints className="h-4 w-4 text-gold" />} label="Steps" value={todaySteps.toLocaleString()} pct={(todaySteps / data.targets.steps) * 100} sub={`target ${data.targets.steps.toLocaleString()}`} />
        <Stat icon={<Moon className="h-4 w-4 text-gold" />} label="Sleep" value={todaySleep?.duration_hours ? `${Number(todaySleep.duration_hours)} h` : "Not logged"} pct={todaySleep?.duration_hours ? (Number(todaySleep.duration_hours) / data.targets.sleep_hours) * 100 : 0} sub={`target ${data.targets.sleep_hours} h`} />
        <Stat icon={<Dumbbell className="h-4 w-4 text-gold" />} label="Training" value={`${todayTraining} min`} pct={Math.min(todayTraining, 90) / 0.9} sub="today" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Water" icon={<Droplets className="h-4 w-4 text-gold" />}>
          <div className="flex flex-wrap gap-2">
            {[200, 300, 500, 750].map((ml) => (
              <Button key={ml} variant="outline" size="sm" onClick={() => run.mutate(() => waterFn({ data: { amount_ml: ml } }))}>
                +{ml} ml
              </Button>
            ))}
          </div>
        </Panel>

        <Panel title="Steps" icon={<Footprints className="h-4 w-4 text-gold" />}>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const n = Number(steps);
              if (!n) return;
              run.mutate(() => stepsFn({ data: { steps: n } }));
              setSteps("");
            }}
          >
            <Input value={steps} onChange={(e) => setSteps(e.target.value)} inputMode="numeric" placeholder="Steps today" />
            <Button type="submit">Log</Button>
          </form>
        </Panel>

        <Panel title="Meal" icon={<Utensils className="h-4 w-4 text-gold" />}>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!mealText.trim()) return;
              run.mutate(() => dietFn({ data: { meal, description: mealText.trim() } }));
              setMealText("");
            }}
          >
            <div className="flex flex-wrap gap-2">
              {(["breakfast", "lunch", "dinner", "snack"] as const).map((m) => (
                <Button key={m} type="button" size="sm" variant={meal === m ? "default" : "outline"} onClick={() => setMeal(m)}>
                  {m}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={mealText} onChange={(e) => setMealText(e.target.value)} placeholder="What did you eat?" />
              <Button type="submit">Log</Button>
            </div>
          </form>
        </Panel>

        <Panel title="Training" icon={<Dumbbell className="h-4 w-4 text-gold" />}>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!activity.trim()) return;
              run.mutate(() =>
                exerciseFn({ data: { activity: activity.trim(), duration_minutes: Number(minutes) || undefined } }),
              );
              setActivity("");
              setMinutes("");
            }}
          >
            <Input value={activity} onChange={(e) => setActivity(e.target.value)} placeholder="Activity (e.g. ramp walk drills)" />
            <Input value={minutes} onChange={(e) => setMinutes(e.target.value)} inputMode="numeric" placeholder="Min" className="max-w-[90px]" />
            <Button type="submit">Log</Button>
          </form>
        </Panel>

        <Panel title="Sleep" icon={<Moon className="h-4 w-4 text-gold" />}>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const h = Number(sleepHours);
              if (!h) return;
              run.mutate(() => sleepFn({ data: { duration_hours: h } }));
              setSleepHours("");
            }}
          >
            <Input value={sleepHours} onChange={(e) => setSleepHours(e.target.value)} inputMode="decimal" placeholder="Hours slept" />
            <Button type="submit">Log</Button>
          </form>
        </Panel>

        <Panel title="Recent meals" icon={<Utensils className="h-4 w-4 text-gold" />}>
          {data.diet.length ? (
            <ul className="divide-y divide-border text-sm">
              {data.diet.slice(0, 8).map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 py-2">
                  <span>
                    <span className="eyebrow mr-2">{d.meal}</span>
                    {d.description}
                  </span>
                  <button
                    aria-label="Delete entry"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => run.mutate(() => deleteFn({ data: { table: "diet_logs", id: d.id } }))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing logged in the last 14 days.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, sub, pct }: { icon: React.ReactNode; label: string; value: string; sub: string; pct: number }) {
  return (
    <div className="glass-panel rounded-xl p-5">
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <span className="eyebrow">{label}</span>
      </div>
      <p className="font-display text-3xl">{value}</p>
      <Progress value={Math.max(0, Math.min(100, pct))} className="mt-3" />
      <p className="mt-2 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="glass-panel rounded-xl p-6">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h2 className="font-display text-xl">{title}</h2>
      </div>
      {children}
    </div>
  );
}

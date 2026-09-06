import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CalendarCheck, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { getPreparation, generatePlan, toggleTask } from "@/lib/prep.functions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/_authenticated/plan")({
  head: () => ({
    meta: [
      { title: "Preparation Plan — CrownFit" },
      {
        name: "description",
        content: "An adaptive week-by-week pageant preparation plan built from your own profile, wellness data and jury results.",
      },
      { property: "og:title", content: "Preparation Plan — CrownFit" },
      { property: "og:description", content: "Your adaptive week-by-week pageant preparation plan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlanPage,
});

type Week = {
  week: number;
  theme: string;
  fitness: string;
  nutrition: string;
  grooming: string;
  communication: string;
  mindset: string;
  tasks: string[];
};

function PlanPage() {
  const qc = useQueryClient();
  const getFn = useServerFn(getPreparation);
  const genFn = useServerFn(generatePlan);
  const toggleFn = useServerFn(toggleTask);
  const [weeks, setWeeks] = useState(8);

  const { data, isLoading } = useQuery({ queryKey: ["preparation"], queryFn: () => getFn() });

  const generate = useMutation({
    mutationFn: () => genFn({ data: { horizonWeeks: weeks } }),
    onSuccess: () => {
      toast.success("Your plan is ready.");
      qc.invalidateQueries({ queryKey: ["preparation"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not build the plan."),
  });

  const toggle = useMutation({
    mutationFn: (v: { id: string; done: boolean }) => toggleFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["preparation"] }),
    onError: () => toast.error("Could not update that task."),
  });

  const plan = data?.plan ?? null;
  const planWeeks = (plan?.weeks as unknown as Week[] | null) ?? [];
  const tasks = data?.tasks ?? [];
  const doneCount = tasks.filter((t) => t.completed_at).length;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 flex items-center gap-3">
        <CalendarCheck className="h-6 w-6 text-gold" />
        <div>
          <h1 className="font-display text-3xl">Preparation Plan</h1>
          <p className="text-xs text-muted-foreground">Built from your profile, logs and jury results — nothing invented.</p>
        </div>
      </div>

      <div className="glass-panel mb-8 rounded-xl p-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <p className="eyebrow mb-2">Plan length</p>
            <div className="flex gap-2">
              {[4, 6, 8, 12].map((w) => (
                <button
                  key={w}
                  onClick={() => setWeeks(w)}
                  className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                    weeks === w ? "border-gold text-gold" : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {w} weeks
                </button>
              ))}
            </div>
          </div>
          <Button onClick={() => generate.mutate()} disabled={generate.isPending} className="ml-auto">
            {generate.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {plan ? "Rebuild plan" : "Build my plan"}
          </Button>
        </div>
        {plan?.summary && <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{plan.summary}</p>}
        {!!plan?.focus_areas?.length && (
          <div className="mt-4 flex flex-wrap gap-2">
            {plan.focus_areas.map((f: string) => (
              <span key={f} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                {f}
              </span>
            ))}
          </div>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-gold" />
        </div>
      )}

      {!isLoading && !plan && (
        <div className="glass-panel rounded-xl p-8 text-center text-sm text-muted-foreground">
          No plan yet. Fill in your profile for a sharper plan, then build one above.
        </div>
      )}

      {planWeeks.map((w) => (
        <div key={w.week} className="glass-panel mb-4 rounded-xl p-6">
          <p className="eyebrow mb-1">Week {w.week}</p>
          <h2 className="font-display mb-4 text-2xl">{w.theme}</h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ["Fitness", w.fitness],
                ["Nutrition", w.nutrition],
                ["Grooming", w.grooming],
                ["Communication", w.communication],
                ["Mindset", w.mindset],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <dt className="eyebrow mb-1">{label}</dt>
                <dd className="text-sm leading-relaxed text-muted-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}

      {!!tasks.length && (
        <div className="glass-panel mt-8 rounded-xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-2xl">Tasks</h3>
            <span className="text-xs text-muted-foreground">
              {doneCount} of {tasks.length} done
            </span>
          </div>
          <ul className="divide-y divide-border">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-start gap-3 py-3">
                <Checkbox
                  checked={!!t.completed_at}
                  onCheckedChange={(v) => toggle.mutate({ id: t.id, done: v === true })}
                  className="mt-0.5"
                />
                <div>
                  <p className={`text-sm ${t.completed_at ? "text-muted-foreground line-through" : ""}`}>{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.stage}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Crown, Sparkles, Mic2, Loader2, Bookmark, TrendingUp } from "lucide-react";
import { getDashboardData } from "@/lib/profile.functions";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — CrownFit" },
      { name: "description", content: "Your pageant readiness, tasks and coaching at a glance." },
      { property: "og:title", content: "Dashboard — CrownFit" },
      { property: "og:description", content: "Your pageant readiness, tasks and coaching at a glance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const fetchData = useServerFn(getDashboardData);
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: () => fetchData() });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  const profile = data?.profile;
  const readiness = data?.readiness;
  const lastScore = data?.sessions?.find((s) => s.final_score != null)?.final_score;

  return (
    <div className="mx-auto max-w-5xl">
      <p className="eyebrow mb-2">Your workspace</p>
      <h1 className="font-display mb-8 text-4xl">
        {profile?.full_name ? `Welcome back, ${profile.full_name.split(" ")[0]}` : "Welcome to CrownFit"}
      </h1>

      {!profile?.onboarding_completed && (
        <div className="glass-panel mb-8 flex items-center justify-between rounded-xl p-6">
          <div>
            <h2 className="font-display text-2xl">Complete your contestant profile</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Anaira and the mock jury personalise everything from your profile. It takes two minutes.
            </p>
          </div>
          <Link
            to="/profile"
            className="shrink-0 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
          >
            Set up profile
          </Link>
        </div>
      )}

      <div className="mb-8 grid gap-5 md:grid-cols-3">
        <div className="glass-panel rounded-xl p-6">
          <div className="mb-3 flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-gold" />
            <span className="eyebrow">Readiness</span>
          </div>
          {readiness?.readiness != null ? (
            <>
              <p className="font-display text-4xl">{Math.round(Number(readiness.readiness))}%</p>
              <Progress value={Number(readiness.readiness)} className="mt-3" />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Not enough data yet — complete a mock jury session to generate your first readiness score.
            </p>
          )}
        </div>

        <div className="glass-panel rounded-xl p-6">
          <div className="mb-3 flex items-center gap-2 text-muted-foreground">
            <Mic2 className="h-4 w-4 text-gold" />
            <span className="eyebrow">Last jury score</span>
          </div>
          {lastScore != null ? (
            <p className="font-display text-4xl">{Number(lastScore).toFixed(1)}<span className="text-xl text-muted-foreground">/10</span></p>
          ) : (
            <p className="text-sm text-muted-foreground">No completed sessions yet.</p>
          )}
        </div>

        <div className="glass-panel rounded-xl p-6">
          <div className="mb-3 flex items-center gap-2 text-muted-foreground">
            <Bookmark className="h-4 w-4 text-gold" />
            <span className="eyebrow">Saved</span>
          </div>
          <p className="font-display text-4xl">{data?.savedCount ?? 0}</p>
          <p className="mt-1 text-xs text-muted-foreground">pageants &amp; providers</p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Link to="/anaira" className="glass-panel rounded-xl p-6 transition-transform hover:-translate-y-1">
          <Sparkles className="mb-3 h-6 w-6 text-gold" />
          <h3 className="font-display text-2xl">Talk to Anaira</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Your AI pageant coach — interview frameworks, walk technique, wardrobe strategy and mindset.
          </p>
        </Link>
        <Link to="/mock-jury" className="glass-panel rounded-xl p-6 transition-transform hover:-translate-y-1">
          <Crown className="mb-3 h-6 w-6 text-gold" />
          <h3 className="font-display text-2xl">Face the jury</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            A strict AI panel that probes hard and scores honestly. The best rehearsal you can get.
          </p>
        </Link>
      </div>

      <div className="glass-panel mt-8 rounded-xl p-6">
        <h3 className="font-display mb-4 text-2xl">Preparation tasks</h3>
        {data?.tasks?.length ? (
          <ul className="divide-y divide-border">
            {data.tasks.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-3 text-sm">
                <span className={t.completed_at ? "text-muted-foreground line-through" : ""}>{t.title}</span>
                <span className="text-xs text-muted-foreground">{t.due_date ?? t.stage}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No tasks yet.</p>
        )}
      </div>
    </div>
  );
}

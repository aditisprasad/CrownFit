import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, Mic2, Crown } from "lucide-react";
import { toast } from "sonner";
import { startInterview, submitAnswer, listInterviewSessions } from "@/lib/jury.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/mock-jury")({
  head: () => ({
    meta: [
      { title: "Mock Jury Interview — CrownFit" },
      { name: "description", content: "Face a strict AI pageant jury: probing questions and honest 0-10 scoring on clarity, substance, poise and authenticity." },
      { property: "og:title", content: "Mock Jury Interview — CrownFit" },
      { property: "og:description", content: "A strict AI pageant jury that probes hard and scores honestly." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MockJury,
});

type Evaluation = {
  clarity: number;
  substance: number;
  poise: number;
  authenticity: number;
  overall: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
};

type Active = {
  sessionId: string;
  answerId: string;
  question: string;
  index: number;
  total: number;
};

function MockJury() {
  const qc = useQueryClient();
  const startFn = useServerFn(startInterview);
  const submitFn = useServerFn(submitAnswer);
  const sessionsFn = useServerFn(listInterviewSessions);

  const [active, setActive] = useState<Active | null>(null);
  const [answer, setAnswer] = useState("");
  const [lastEval, setLastEval] = useState<Evaluation | null>(null);
  const [finished, setFinished] = useState<{ score: number | null; strengths: string[]; weaknesses: string[] } | null>(null);

  const { data: sessions } = useQuery({ queryKey: ["jury-sessions"], queryFn: () => sessionsFn() });

  const start = useMutation({
    mutationFn: () => startFn({ data: { mode: "strict", questionCount: 5 } }),
    onSuccess: (r) => {
      setFinished(null);
      setLastEval(null);
      setAnswer("");
      setActive({ sessionId: r.sessionId, answerId: r.answerId, question: r.question, index: 0, total: r.questionCount });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not start the session."),
  });

  const submit = useMutation({
    mutationFn: () => submitFn({ data: { sessionId: active!.sessionId, answerId: active!.answerId, answer } }),
    onSuccess: (r) => {
      setLastEval((r.evaluation as Evaluation) ?? null);
      setAnswer("");
      if (r.done) {
        setActive(null);
        setFinished({ score: r.finalScore ?? null, strengths: r.strengths ?? [], weaknesses: r.weaknesses ?? [] });
        qc.invalidateQueries({ queryKey: ["jury-sessions"] });
        qc.invalidateQueries({ queryKey: ["dashboard"] });
      } else {
        setActive((prev) =>
          prev ? { ...prev, answerId: r.nextAnswerId, question: r.nextQuestion, index: r.nextIndex } : prev,
        );
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "The jury could not evaluate that answer."),
  });

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 flex items-center gap-3">
        <Mic2 className="h-6 w-6 text-gold" />
        <div>
          <h1 className="font-display text-3xl">Mock Jury Interview</h1>
          <p className="text-xs text-muted-foreground">Strict panel. Real scoring. No flattery.</p>
        </div>
      </div>

      {!active && !finished && (
        <div className="glass-panel rounded-xl p-8 text-center">
          <Crown className="mx-auto mb-4 h-8 w-8 text-gold" />
          <h2 className="font-display text-3xl">Five questions. One honest verdict.</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
            The panel asks demanding questions across introduction, current affairs, motivation, leadership and a
            pressure follow-up — then scores you on clarity, substance, poise and authenticity.
          </p>
          <Button className="mt-6" onClick={() => start.mutate()} disabled={start.isPending}>
            {start.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enter the interview room
          </Button>
        </div>
      )}

      {active && (
        <div className="glass-panel rounded-xl p-8">
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span className="eyebrow">Question {active.index + 1} of {active.total}</span>
            </div>
            <Progress value={(active.index / active.total) * 100} />
          </div>
          <p className="font-display mb-6 text-2xl leading-snug">{active.question}</p>
          <Textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={7}
            placeholder="Answer as you would on stage — out loud first, then write it here."
            className="resize-none"
          />
          <Button className="mt-4 w-full" disabled={!answer.trim() || submit.isPending} onClick={() => submit.mutate()}>
            {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit to the panel
          </Button>
        </div>
      )}

      {lastEval && (
        <div className="glass-panel mt-6 rounded-xl p-6">
          <p className="eyebrow mb-4">Panel evaluation</p>
          <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-5">
            {(["clarity", "substance", "poise", "authenticity", "overall"] as const).map((k) => (
              <div key={k}>
                <p className="font-display text-3xl">{Number(lastEval[k]).toFixed(1)}</p>
                <p className="eyebrow">{k}</p>
              </div>
            ))}
          </div>
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{lastEval.feedback}</p>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="eyebrow mb-2">Strengths</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {lastEval.strengths?.map((s) => <li key={s}>• {s}</li>)}
              </ul>
            </div>
            <div>
              <p className="eyebrow mb-2">Improve</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {lastEval.improvements?.map((s) => <li key={s}>• {s}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      {finished && (
        <div className="glass-panel mt-6 rounded-xl p-8 text-center">
          <p className="eyebrow mb-2">Final verdict</p>
          <p className="font-display text-6xl text-gradient-royal">
            {finished.score != null ? finished.score.toFixed(1) : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">out of 10</p>
          <Button className="mt-6" variant="outline" onClick={() => start.mutate()} disabled={start.isPending}>
            Run another session
          </Button>
        </div>
      )}

      {!!sessions?.length && (
        <div className="glass-panel mt-8 rounded-xl p-6">
          <h3 className="font-display mb-4 text-2xl">Past sessions</h3>
          <ul className="divide-y divide-border">
            {sessions.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-3 text-sm">
                <span className="text-muted-foreground">
                  {new Date(s.started_at).toLocaleDateString()} · {s.mode} · {s.status}
                </span>
                <span className="font-display text-lg">
                  {s.final_score != null ? `${Number(s.final_score).toFixed(1)}/10` : "—"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

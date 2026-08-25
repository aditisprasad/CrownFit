import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, Output } from "ai";
import { getGateway } from "./ai-gateway.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const QUESTION_TOPICS = [
  "personal introduction and platform",
  "current affairs and social issues",
  "pageant motivation and purpose",
  "leadership and adversity",
  "advocacy deep-dive",
  "pressure question / controversial follow-up",
];

const ScoreSchema = z.object({
  clarity: z.number().min(0).max(10),
  substance: z.number().min(0).max(10),
  poise: z.number().min(0).max(10),
  authenticity: z.number().min(0).max(10),
  overall: z.number().min(0).max(10),
  feedback: z.string(),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
});

export const startInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ mode: z.enum(["strict", "standard"]).default("strict"), questionCount: z.number().min(3).max(10).default(5) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase
      .from("contestant_profiles")
      .select("full_name, target_pageant, bio")
      .eq("user_id", context.userId)
      .maybeSingle();

    const question = await generateQuestion(getGateway, 0, data.mode, profile, []);
    const { data: session, error } = await context.supabase
      .from("interview_sessions")
      .insert({ user_id: context.userId, mode: data.mode, question_count: data.questionCount, status: "active" })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const { data: answerRow, error: aErr } = await context.supabase
      .from("interview_answers")
      .insert({ session_id: session.id, user_id: context.userId, question, question_index: 0 })
      .select("id")
      .single();
    if (aErr) throw new Error(aErr.message);

    return { sessionId: session.id, answerId: answerRow.id, question, questionIndex: 0, questionCount: data.questionCount };
  });

async function generateQuestion(
  gatewayFn: typeof getGateway,
  index: number,
  mode: string,
  profile: { full_name: string | null; target_pageant: string | null; bio: string | null } | null,
  previous: string[],
) {
  const topic = QUESTION_TOPICS[index % QUESTION_TOPICS.length];
  const strictNote =
    mode === "strict"
      ? "This is a STRICT jury panel: ask a demanding, probing question a real national pageant judge would ask. No softball questions."
      : "Ask a realistic pageant interview question.";
  const { text } = await generateText({
    model: gatewayFn()("google/gemini-3.7-flash"),
    prompt: `You are a pageant jury member. ${strictNote} Topic area: ${topic}. Contestant: ${profile?.full_name ?? "contestant"}, targeting ${profile?.target_pageant ?? "an upcoming pageant"}. ${profile?.bio ? `Bio: ${profile.bio}` : ""} ${previous.length ? `Do NOT repeat these previous questions: ${previous.join(" | ")}` : ""} Output ONLY the question text, one question, no preamble. Do not invent false facts about real pageants.`,
  });
  return text.trim().replace(/^["']|["']$/g, "");
}

const SubmitInput = z.object({
  sessionId: z.string().uuid(),
  answerId: z.string().uuid(),
  answer: z.string().min(1).max(5000),
});

export const submitAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SubmitInput.parse(input))
  .handler(async ({ data, context }) => {
    const uid = context.userId;
    const { data: session, error: sErr } = await context.supabase
      .from("interview_sessions")
      .select("*")
      .eq("id", data.sessionId)
      .eq("user_id", uid)
      .single();
    if (sErr || !session) throw new Error("Session not found");
    if (session.status !== "active") throw new Error("Session is not active");

    const { data: answerRow, error: aErr } = await context.supabase
      .from("interview_answers")
      .select("*")
      .eq("id", data.answerId)
      .single();
    if (aErr || !answerRow) throw new Error("Question not found");

    const strict = session.mode === "strict";
    const { output } = await generateText({
      model: getGateway()("google/gemini-3.7-flash"),
      output: Output.object({ schema: ScoreSchema }),
      prompt: `You are ${strict ? "an extremely strict, hard-to-impress national pageant jury panel. Score harshly — an average answer must score 4-5, only truly exceptional answers score 8+. Vague, generic, or evasive answers score below 4" : "a professional pageant jury panel"}.

Question: "${answerRow.question}"
Contestant's answer: "${data.answer}"

Score 0-10 on: clarity, substance, poise, authenticity, and an overall score. Give direct, specific written feedback, 2-3 concrete strengths, and 2-3 concrete improvements. Never fabricate facts; if the answer contains factual claims you cannot verify, flag them as unverifiable rather than praising them.`,
    });

    const overall = output?.overall ?? null;
    await context.supabase
      .from("interview_answers")
      .update({
        answer: data.answer,
        scores: output ?? null,
        overall_score: overall,
        feedback: output?.feedback ?? null,
      })
      .eq("id", data.answerId);

    const nextIndex = answerRow.question_index + 1;
    if (nextIndex >= session.question_count) {
      const { data: all } = await context.supabase
        .from("interview_answers")
        .select("overall_score, scores")
        .eq("session_id", data.sessionId)
        .not("overall_score", "is", null);
      const scores = (all ?? []).map((r) => Number(r.overall_score)).filter((n) => !Number.isNaN(n));
      const final = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null;
      const strengths = (all ?? []).flatMap((r) => ((r.scores as { strengths?: string[] } | null)?.strengths ?? [])).slice(0, 5);
      const weaknesses = (all ?? []).flatMap((r) => ((r.scores as { improvements?: string[] } | null)?.improvements ?? [])).slice(0, 5);

      await context.supabase
        .from("interview_sessions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          final_score: final,
          strengths,
          weaknesses,
          summary: `Completed ${session.question_count}-question ${session.mode} jury interview.`,
        })
        .eq("id", data.sessionId);

      return { done: true as const, evaluation: output, finalScore: final, strengths, weaknesses };
    }

    const { data: prev } = await context.supabase
      .from("interview_answers")
      .select("question")
      .eq("session_id", data.sessionId);
    const { data: profile } = await context.supabase
      .from("contestant_profiles")
      .select("full_name, target_pageant, bio")
      .eq("user_id", uid)
      .maybeSingle();

    const nextQuestion = await generateQuestion(getGateway, nextIndex, session.mode, profile, (prev ?? []).map((p) => p.question));
    const { data: nextRow, error: nErr } = await context.supabase
      .from("interview_answers")
      .insert({ session_id: data.sessionId, user_id: uid, question: nextQuestion, question_index: nextIndex })
      .select("id")
      .single();
    if (nErr) throw new Error(nErr.message);

    return {
      done: false as const,
      evaluation: output,
      nextAnswerId: nextRow.id,
      nextQuestion,
      nextIndex,
    };
  });

export const listInterviewSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("interview_sessions")
      .select("id, mode, status, final_score, question_count, started_at, completed_at, strengths, weaknesses, summary")
      .eq("user_id", context.userId)
      .order("started_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

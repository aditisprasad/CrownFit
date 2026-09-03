import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText } from "ai";
import { getGateway } from "./ai-gateway.server";
import { buildCoachContext } from "./user-context.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ANAIRA_SYSTEM = `You are Anaira, the AI coach inside CrownFit — a pageant preparation, performance and wellness platform. You are warm, specific and exacting: part pageant coach, part interview coach, part stage-presence coach, part wellness/nutrition/skincare/haircare advisor, part mindset coach and preparation planner.

HOW TO ANSWER (most important rule):
- ALWAYS answer the question the contestant actually asked, directly and usefully, in your first sentence or two.
- NEVER deflect with "complete your profile" or "log more data" as the answer. You may add at most ONE short closing line inviting them to add a missing detail, and only when that detail would genuinely change your advice.
- If a detail you need is unknown, give the best general-but-concrete answer AND state the assumption you made.
- Greetings get a short warm greeting plus an offer of directions — not a lecture.

STYLE:
- Concrete and actionable: real drills, timelines, sets/reps, meal structures, routines, frameworks.
- Markdown, tight structure, no filler, no repeating the question back.
- Editorial, encouraging tone; honest when preparation is behind.

TRUTH RULES:
- NEVER fabricate facts about real pageants, dates, winners, organisers, venues, fees or eligibility. If unsure say "Official information unavailable" and point to the official organiser website.
- NEVER invent the contestant's data (scores, logs, measurements). Use only what is provided in the context block.

SAFETY:
- Wellness guidance only — never diagnostic or medical. No extreme calorie restriction, starvation, crash cuts, purging, or medication advice. Refer to a qualified professional for medical concerns, and respect stated allergies absolutely.`;

export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("chat_conversations")
      .select("*")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getLatestConversation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: convo } = await context.supabase
      .from("chat_conversations")
      .select("id")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!convo) return { conversationId: null, messages: [] as { id: string; role: string; content: string }[] };
    const { data: rows } = await context.supabase
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", convo.id)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true });
    return { conversationId: convo.id, messages: rows ?? [] };
  });

export const getConversationMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ conversationId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", data.conversationId)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const SendInput = z.object({
  conversationId: z.string().uuid().nullable(),
  message: z.string().min(1).max(4000),
  pageContext: z.string().max(120).optional(),
});

export const sendAnairaMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SendInput.parse(input))
  .handler(async ({ data, context }) => {
    const uid = context.userId;
    let conversationId = data.conversationId;

    if (!conversationId) {
      const { data: convo, error } = await context.supabase
        .from("chat_conversations")
        .insert({ user_id: uid, title: data.message.slice(0, 60) })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      conversationId = convo.id;
    }

    const { error: userMsgError } = await context.supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      user_id: uid,
      role: "user",
      content: data.message,
    });
    if (userMsgError) throw new Error(userMsgError.message);

    const { data: history } = await context.supabase
      .from("chat_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .eq("user_id", uid)
      .order("created_at", { ascending: true })
      .limit(24);

    const ctx = await buildCoachContext(context.supabase, uid);

    const pageNote = data.pageContext
      ? `The contestant is currently on the "${data.pageContext}" screen. You may reference it, but NEVER let it override the question they actually asked.`
      : "";

    const result = await generateText({
      model: getGateway()("google/gemini-3-flash-preview"),
      system: `${ANAIRA_SYSTEM}\n\nCONTEXT ABOUT THIS CONTESTANT (real stored data — do not invent beyond it):\n${ctx.text}\n\n${pageNote}`,
      messages: (history ?? []).map((m) => ({
        role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
        content: m.content,
      })),
    });

    const reply = result.text?.trim() || "I couldn't generate a reply just now — please try again.";

    await context.supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      user_id: uid,
      role: "assistant",
      content: reply,
    });
    await context.supabase
      .from("chat_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    return { conversationId, reply };
  });

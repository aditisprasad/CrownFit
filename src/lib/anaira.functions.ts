import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { streamText } from "ai";
import { getGateway } from "./ai-gateway.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ANAIRA_SYSTEM = `You are Anaira, the AI pageant coach inside CrownFit — a pageant preparation and performance operating system. You are an expert, warm but exacting mentor: part pageant coach, part pageant historian, part performance psychologist.

Rules you must always follow:
- NEVER fabricate facts about real pageants, dates, winners, venues, or organisations. If you do not know something with certainty, say "Official information unavailable" and suggest where the contestant could verify it (official pageant website or organisers).
- Be specific and actionable. Give concrete drills, timelines, and frameworks.
- Keep a luxurious, encouraging, editorial tone — but be honest when preparation is behind.
- When relevant, structure answers for interview practice: hook, substance, poise, close.
- Format with markdown. Keep responses focused; avoid filler.`;

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
      .order("created_at", { ascending: true })
      .limit(30);

    const { data: profile } = await context.supabase
      .from("contestant_profiles")
      .select("full_name, target_pageant, target_year, city, experience")
      .eq("user_id", uid)
      .maybeSingle();

    const profileNote = profile
      ? `Contestant context: name ${profile.full_name ?? "unknown"}, targeting ${profile.target_pageant ?? "undecided pageant"} ${profile.target_year ?? ""}, based in ${profile.city ?? "unknown city"}. Experience: ${profile.experience ?? "not provided"}.`
      : "The contestant has not completed their profile yet.";

    const result = streamText({
      model: getGateway()("google/gemini-3.7-flash"),
      system: `${ANAIRA_SYSTEM}\n\n${profileNote}`,
      messages: (history ?? []).map((m) => ({
        role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
        content: m.content,
      })),
    });

    const reply = await result.text;

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

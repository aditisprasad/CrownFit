import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, Loader2, Plus } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { listConversations, getConversationMessages, sendAnairaMessage } from "@/lib/anaira.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/anaira")({
  head: () => ({
    meta: [
      { title: "Anaira — AI Pageant Coach | CrownFit" },
      { name: "description", content: "Coaching on interview, walk, wardrobe and mindset from Anaira, your AI pageant mentor." },
      { property: "og:title", content: "Anaira — AI Pageant Coach | CrownFit" },
      { property: "og:description", content: "Coaching on interview, walk, wardrobe and mindset from Anaira." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AnairaPage,
});

const STARTERS = [
  "Build me a 12-week preparation plan for a state-level pageant.",
  "Critique this introduction: 'Hi, I'm Aditi and I love helping people.'",
  "How do I answer a question about a social issue I know little about?",
  "What should I look for when choosing an evening gown for my body type?",
];

type Msg = { id?: string; role: string; content: string };

function AnairaPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listConversations);
  const msgsFn = useServerFn(getConversationMessages);
  const sendFn = useServerFn(sendAnairaMessage);

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<Msg[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: conversations } = useQuery({ queryKey: ["anaira-convos"], queryFn: () => listFn() });
  const { data: messages } = useQuery({
    queryKey: ["anaira-msgs", conversationId],
    queryFn: () => msgsFn({ data: { conversationId: conversationId! } }),
    enabled: !!conversationId,
  });

  const mutation = useMutation({
    mutationFn: (message: string) => sendFn({ data: { conversationId, message } }),
    onSuccess: (res) => {
      setConversationId(res.conversationId);
      setPending([]);
      qc.invalidateQueries({ queryKey: ["anaira-msgs", res.conversationId] });
      qc.invalidateQueries({ queryKey: ["anaira-convos"] });
    },
    onError: (e) => {
      setPending([]);
      toast.error(e instanceof Error ? e.message : "Anaira could not respond right now.");
    },
  });

  const all: Msg[] = [...(messages ?? []), ...pending];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [all.length, mutation.isPending]);

  function submit(text: string) {
    if (!text.trim() || mutation.isPending) return;
    setPending([{ role: "user", content: text }]);
    setInput("");
    mutation.mutate(text);
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-6xl gap-6">
      <div className="hidden w-56 shrink-0 flex-col lg:flex">
        <Button
          variant="outline"
          className="mb-3 w-full justify-start"
          onClick={() => {
            setConversationId(null);
            setPending([]);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> New session
        </Button>
        <div className="space-y-1 overflow-y-auto">
          {(conversations ?? []).map((c) => (
            <button
              key={c.id}
              onClick={() => setConversationId(c.id)}
              className={cn(
                "w-full truncate rounded-md px-3 py-2 text-left text-xs transition-colors",
                conversationId === c.id ? "bg-secondary text-gold" : "text-muted-foreground hover:bg-secondary/60",
              )}
            >
              {c.title}
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mb-4 flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-gold" />
          <div>
            <h1 className="font-display text-3xl">Anaira</h1>
            <p className="text-xs text-muted-foreground">Your AI pageant coach — honest, exacting, never invents facts.</p>
          </div>
        </div>

        <div className="glass-panel flex-1 overflow-y-auto rounded-xl p-6">
          {all.length === 0 ? (
            <div className="mx-auto max-w-lg py-12 text-center">
              <p className="mb-6 text-sm text-muted-foreground">Where would you like to begin?</p>
              <div className="space-y-2">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => submit(s)}
                    className="w-full rounded-md border border-border px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:border-gold hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {all.map((m, i) => (
                <div key={m.id ?? i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-xl px-4 py-3 text-sm",
                      m.role === "user" ? "bg-secondary" : "bg-surface",
                    )}
                  >
                    {m.role === "user" ? (
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    ) : (
                      <div className="prose-anaira space-y-3 [&_h1]:font-display [&_h2]:font-display [&_h3]:font-display [&_li]:ml-4 [&_li]:list-disc [&_strong]:text-gold">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {mutation.isPending && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-gold" /> Anaira is considering your question…
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <form
          className="mt-4 flex items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Anaira anything about your preparation…"
            rows={2}
            className="resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(input);
              }
            }}
          />
          <Button type="submit" disabled={mutation.isPending || !input.trim()} className="h-[60px]">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRouterState } from "@tanstack/react-router";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { getLatestConversation, sendAnairaMessage } from "@/lib/anaira.functions";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Msg = { id?: string; role: string; content: string };

const PAGE_LABELS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/anaira": "Anaira coach",
  "/mock-jury": "Mock Jury",
  "/pageants": "Pageant discovery",
  "/providers": "Professionals directory",
  "/tracker": "Personal tracker",
  "/calendar": "Calendar & bookings",
  "/profile": "Contestant profile",
};

export function AnairaWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [pending, setPending] = useState<Msg[]>([]);
  const qc = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const pageContext = PAGE_LABELS[pathname] ?? undefined;

  const latestFn = useServerFn(getLatestConversation);
  const sendFn = useServerFn(sendAnairaMessage);

  const { data, isLoading } = useQuery({
    queryKey: ["anaira-widget"],
    queryFn: () => latestFn(),
    enabled: open,
  });

  useEffect(() => {
    if (data?.conversationId) setConversationId(data.conversationId);
  }, [data?.conversationId]);

  const messages: Msg[] = [...(data?.messages ?? []), ...pending];

  const mutation = useMutation({
    mutationFn: (message: string) => sendFn({ data: { conversationId, message, pageContext } }),
    onSuccess: (res) => {
      setConversationId(res.conversationId);
      setPending([]);
      qc.invalidateQueries({ queryKey: ["anaira-widget"] });
      qc.invalidateQueries({ queryKey: ["anaira-msgs"] });
      qc.invalidateQueries({ queryKey: ["anaira-convos"] });
    },
    onError: (e) => {
      setPending((p) => p.filter((m) => m.role !== "user" || m.content !== input));
      toast.error(e instanceof Error ? e.message : "Anaira could not reply just now");
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, mutation.isPending]);

  useEffect(() => {
    if (open) taRef.current?.focus();
  }, [open]);

  function submit() {
    const text = input.trim();
    if (!text || mutation.isPending) return;
    setPending([{ role: "user", content: text }]);
    setInput("");
    mutation.mutate(text);
    requestAnimationFrame(() => taRef.current?.focus());
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open Anaira, your AI pageant coach"
          className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-royal text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:scale-105"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div className="glass-panel fixed bottom-5 right-5 z-50 flex h-[min(560px,80vh)] w-[min(400px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="font-display text-lg leading-none">Anaira</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {pageContext ? `Aware of: ${pageContext}` : "Your AI pageant coach"}
              </p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close chat" className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-gold" />
              </div>
            ) : messages.length === 0 ? (
              <p className="text-muted-foreground">
                Ask me anything — interview answers, walk technique, wardrobe, skincare, training or your prep plan.
              </p>
            ) : (
              messages.map((m, i) => (
                <div key={m.id ?? i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-xl px-3 py-2",
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "prose prose-sm prose-invert max-w-none bg-transparent text-foreground",
                    )}
                  >
                    {m.role === "user" ? m.content : <ReactMarkdown>{m.content}</ReactMarkdown>}
                  </div>
                </div>
              ))
            )}
            {mutation.isPending && (
              <p className="animate-pulse text-xs text-muted-foreground">Anaira is thinking…</p>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="flex items-end gap-2 border-t border-border p-3">
            <Textarea
              ref={taRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="Ask Anaira…"
              rows={2}
              className="min-h-[44px] resize-none"
            />
            <Button size="icon" onClick={submit} disabled={mutation.isPending || !input.trim()} aria-label="Send">
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

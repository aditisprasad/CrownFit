import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CalendarDays, Loader2, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { getPlanner, createEvent, deleteEvent, createBooking, updateBookingStatus } from "@/lib/planner.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar & Bookings — CrownFit" },
      { name: "description", content: "Track auditions, appointments and bookings — dated bookings become calendar events automatically." },
      { property: "og:title", content: "Calendar & Bookings — CrownFit" },
      { property: "og:description", content: "Track auditions, appointments and bookings in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CalendarPage,
});

const KINDS = ["audition", "appointment", "training", "deadline", "shoot", "other"] as const;
const STATUSES = ["pending", "confirmed", "completed", "cancelled"] as const;

function CalendarPage() {
  const qc = useQueryClient();
  const fetchFn = useServerFn(getPlanner);
  const eventFn = useServerFn(createEvent);
  const delEventFn = useServerFn(deleteEvent);
  const bookingFn = useServerFn(createBooking);
  const statusFn = useServerFn(updateBookingStatus);

  const { data, isLoading } = useQuery({ queryKey: ["planner"], queryFn: () => fetchFn() });
  const refresh = () => qc.invalidateQueries({ queryKey: ["planner"] });

  const [evTitle, setEvTitle] = useState("");
  const [evKind, setEvKind] = useState<(typeof KINDS)[number]>("audition");
  const [evWhen, setEvWhen] = useState("");
  const [evPlace, setEvPlace] = useState("");

  const [bkTitle, setBkTitle] = useState("");
  const [bkProvider, setBkProvider] = useState("");
  const [bkWhen, setBkWhen] = useState("");
  const [bkNotes, setBkNotes] = useState("");

  const mutate = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => refresh(),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  if (isLoading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  const upcoming = data.events.filter((e) => new Date(e.starts_at).getTime() >= Date.now() - 86400000);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex items-center gap-3">
        <CalendarDays className="h-6 w-6 text-gold" />
        <div>
          <h1 className="font-display text-3xl">Calendar &amp; bookings</h1>
          <p className="text-xs text-muted-foreground">
            Every booking with a date is added to your calendar automatically.
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="glass-panel rounded-xl p-6">
          <h2 className="font-display mb-4 text-xl">Add to calendar</h2>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!evTitle.trim() || !evWhen) return;
              mutate.mutate(async () => {
                await eventFn({
                  data: { title: evTitle.trim(), kind: evKind, starts_at: evWhen, location: evPlace || null },
                });
                toast.success("Added to your calendar");
                setEvTitle("");
                setEvWhen("");
                setEvPlace("");
              });
            }}
          >
            <Input value={evTitle} onChange={(e) => setEvTitle(e.target.value)} placeholder="Title (e.g. State audition round 1)" />
            <div className="flex flex-wrap gap-2">
              {KINDS.map((k) => (
                <Button key={k} type="button" size="sm" variant={evKind === k ? "default" : "outline"} onClick={() => setEvKind(k)}>
                  {k}
                </Button>
              ))}
            </div>
            <Input type="datetime-local" value={evWhen} onChange={(e) => setEvWhen(e.target.value)} />
            <Input value={evPlace} onChange={(e) => setEvPlace(e.target.value)} placeholder="Location (optional)" />
            <Button type="submit" className="w-full">Add event</Button>
          </form>
        </div>

        <div className="glass-panel rounded-xl p-6">
          <h2 className="font-display mb-4 text-xl">Log a booking</h2>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!bkTitle.trim()) return;
              mutate.mutate(async () => {
                const res = await bookingFn({
                  data: {
                    title: bkTitle.trim(),
                    provider_name: bkProvider || null,
                    starts_at: bkWhen || null,
                    notes: bkNotes || null,
                    is_external: true,
                  },
                });
                toast.success(res.calendarEventCreated ? "Booking saved and added to your calendar" : "Booking saved");
                setBkTitle("");
                setBkProvider("");
                setBkWhen("");
                setBkNotes("");
              });
            }}
          >
            <Input value={bkTitle} onChange={(e) => setBkTitle(e.target.value)} placeholder="What is it for? (e.g. Portfolio shoot)" />
            <Input value={bkProvider} onChange={(e) => setBkProvider(e.target.value)} placeholder="Professional / studio name" />
            <Input type="datetime-local" value={bkWhen} onChange={(e) => setBkWhen(e.target.value)} />
            <Textarea value={bkNotes} onChange={(e) => setBkNotes(e.target.value)} rows={2} placeholder="Notes (optional)" />
            <Button type="submit" className="w-full">Save booking</Button>
          </form>
        </div>
      </div>

      <div className="glass-panel mt-8 rounded-xl p-6">
        <h2 className="font-display mb-4 text-xl">Upcoming</h2>
        {upcoming.length ? (
          <ul className="divide-y divide-border">
            {upcoming.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                <div>
                  <p>{e.title}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="eyebrow mr-2">{e.kind}</span>
                    {new Date(e.starts_at).toLocaleString()}
                    {e.location ? ` · ${e.location}` : ""}
                  </p>
                </div>
                <button
                  aria-label="Delete event"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => mutate.mutate(() => delEventFn({ data: { id: e.id } }))}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Nothing scheduled yet.</p>
        )}
      </div>

      <div className="glass-panel mt-5 rounded-xl p-6">
        <h2 className="font-display mb-4 text-xl">Bookings</h2>
        {data.bookings.length ? (
          <ul className="divide-y divide-border">
            {data.bookings.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p>
                    {b.title}
                    {b.provider_name ? ` — ${b.provider_name}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {b.starts_at ? new Date(b.starts_at).toLocaleString() : "No date set"}
                    {b.confirmation_reference ? ` · ref ${b.confirmation_reference}` : ""}
                  </p>
                  {b.booking_url && (
                    <a href={b.booking_url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-xs text-gold hover:underline">
                      Booking link <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={b.status === s ? "default" : "outline"}
                      onClick={() => mutate.mutate(() => statusFn({ data: { id: b.id, status: s } }))}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No bookings logged yet.</p>
        )}
      </div>
    </div>
  );
}

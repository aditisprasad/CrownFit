import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, MapPin, Bookmark, BookmarkCheck, ExternalLink, ShieldCheck, ShieldAlert, Search, Database, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { listPageants, toggleSaved } from "@/lib/discovery.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/pageants")({
  head: () => ({
    meta: [
      { title: "Pageant Discovery — CrownFit" },
      { name: "description", content: "Browse pageants with verified eligibility, dates and official links — unverified details are clearly marked." },
      { property: "og:title", content: "Pageant Discovery — CrownFit" },
      { property: "og:description", content: "Browse pageants with verified eligibility, dates and official links." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Pageants,
});

const UNAVAILABLE = "Official information unavailable";
type Filters = { q: string; country: string; state: string; city: string; age: string; registration: "any" | "open" | "upcoming" | "closed" };
const EMPTY: Filters = { q: "", country: "", state: "", city: "", age: "", registration: "any" };

function Pageants() {
  const qc = useQueryClient();
  const listFn = useServerFn(listPageants);
  const saveFn = useServerFn(toggleSaved);
  const [f, setF] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["pageants", applied],
    queryFn: () =>
      listFn({
        data: {
          q: applied.q || undefined,
          country: applied.country || undefined,
          state: applied.state || undefined,
          city: applied.city || undefined,
          age: applied.age ? Number(applied.age) : undefined,
          registration: applied.registration,
        },
      }),
  });

  const save = useMutation({
    mutationFn: (p: { id: string; name: string }) => saveFn({ data: { itemType: "pageant", itemId: p.id, label: p.name } }),
    onSuccess: (r) => {
      toast.success(r.saved ? "Saved to your shortlist" : "Removed from shortlist");
      qc.invalidateQueries({ queryKey: ["pageants"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update shortlist"),
  });

  const saved = new Set(data?.saved ?? []);
  const rows = data?.rows ?? [];
  const open = rows.find((r) => r.id === openId);
  const status = isError ? "error" : data?.status;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center gap-3">
        <MapPin className="h-6 w-6 text-gold" />
        <div>
          <h1 className="font-display text-3xl">Pageant Discovery</h1>
          <p className="text-xs text-muted-foreground">Only verified data is shown as fact. Anything unconfirmed reads “{UNAVAILABLE}”.</p>
        </div>
      </div>

      <form
        className="glass-panel mb-8 space-y-3 rounded-xl p-5"
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(f);
        }}
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="Search pageant or organisation" className="h-11 pl-9" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Input value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })} placeholder="Country" />
          <Input value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })} placeholder="State / region" />
          <Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} placeholder="City" />
          <Input type="number" min={10} max={80} value={f.age} onChange={(e) => setF({ ...f, age: e.target.value })} placeholder="Your age" />
          <select
            value={f.registration}
            onChange={(e) => setF({ ...f, registration: e.target.value as Filters["registration"] })}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="any">Any registration</option>
            <option value="open">Registration open</option>
            <option value="upcoming">Opening soon</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => { setF(EMPTY); setApplied(EMPTY); }}>Reset</Button>
          <Button type="submit">Search</Button>
        </div>
      </form>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div>
      ) : status === "ok" ? (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((p) => (
            <div key={p.id} className="glass-panel flex flex-col rounded-xl p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl">{p.name}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{p.organizer ?? UNAVAILABLE}</p>
                  <p className="text-xs text-muted-foreground">{[p.city, p.state, p.country].filter(Boolean).join(", ") || UNAVAILABLE}</p>
                </div>
                <Button size="sm" variant="outline" aria-label="Save pageant" onClick={() => save.mutate({ id: p.id, name: p.name })}>
                  {saved.has(p.id) ? <BookmarkCheck className="h-3.5 w-3.5 text-gold" /> : <Bookmark className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <Detail label="Age" value={p.min_age != null && p.max_age != null ? `${p.min_age}–${p.max_age}` : null} />
                <Detail label="Registration closes" value={p.registration_close} />
              </div>
              <div className="mt-auto flex items-center justify-between pt-5">
                <VerifyBadge verified={p.verified} />
                <Button size="sm" variant="ghost" onClick={() => setOpenId(p.id)}>View details</Button>
              </div>
            </div>
          ))}
        </div>
      ) : status === "no_match" ? (
        <Empty icon={Search} title="No matching pageants" body="Verified pageants exist, but none match these filters. Try widening your search." />
      ) : status === "error" ? (
        <Empty icon={AlertTriangle} title="Pageant data is temporarily unavailable" body="We couldn't reach the pageant source right now. Please try again shortly." />
      ) : (
        <Empty icon={Database} title="No verified pageant source connected yet" body="CrownFit never invents pageant listings. Pageants will appear here once they are confirmed against official sources." />
      )}

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpenId(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-3xl">{open.name}</DialogTitle>
                <DialogDescription>{open.organizer ?? UNAVAILABLE}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 text-sm sm:grid-cols-2">
                <Detail label="Country" value={open.country} />
                <Detail label="State / region" value={open.state} />
                <Detail label="City" value={open.city} />
                <Detail label="Age eligibility" value={open.min_age != null && open.max_age != null ? `${open.min_age}–${open.max_age}` : null} />
                <Detail label="Height requirement" value={open.min_height_cm ? `${open.min_height_cm} cm minimum` : null} />
                <Detail label="Application fee" value={open.application_fee} />
                <Detail label="Registration opens" value={open.registration_open} />
                <Detail label="Registration deadline" value={open.registration_close} />
                <Detail label="Finale" value={open.finale_date} />
                <Detail label="Last verified" value={open.last_verified?.slice(0, 10)} />
              </div>
              <Detail label="Eligibility requirements" value={open.eligibility} />
              <div className="flex flex-wrap items-center gap-4 border-t border-border pt-4 text-xs">
                <VerifyBadge verified={open.verified} />
                {open.official_url ? <ExtLink href={open.official_url}>Official website</ExtLink> : <span className="italic text-muted-foreground">Official website: {UNAVAILABLE}</span>}
                {open.application_url && <ExtLink href={open.application_url}>Apply</ExtLink>}
                {open.source_url ? <ExtLink href={open.source_url}>Source</ExtLink> : <span className="italic text-muted-foreground">Source: {UNAVAILABLE}</span>}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VerifyBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="flex items-center gap-1 text-xs text-success"><ShieldCheck className="h-3.5 w-3.5" /> Verified</span>
  ) : (
    <span className="flex items-center gap-1 text-xs text-warning"><ShieldAlert className="h-3.5 w-3.5" /> Unverified</span>
  );
}

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-gold hover:underline">
      {children} <ExternalLink className="h-3 w-3" />
    </a>
  );
}

function Empty({ icon: Icon, title, body }: { icon: typeof Search; title: string; body: string }) {
  return (
    <div className="glass-panel rounded-xl p-10 text-center">
      <Icon className="mx-auto mb-3 h-6 w-6 text-gold" />
      <p className="font-display text-2xl">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <p className={value ? "text-foreground" : "italic text-muted-foreground"}>{value ?? UNAVAILABLE}</p>
    </div>
  );
}

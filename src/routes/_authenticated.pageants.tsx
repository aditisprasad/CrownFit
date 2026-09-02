import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, MapPin, Bookmark, ExternalLink, ShieldCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { listPageants, toggleSaved } from "@/lib/discovery.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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

function Pageants() {
  const listFn = useServerFn(listPageants);
  const saveFn = useServerFn(toggleSaved);
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [applied, setApplied] = useState({ q: "", city: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["pageants", applied],
    queryFn: () => listFn({ data: applied }),
  });

  const save = useMutation({
    mutationFn: (p: { id: string; name: string }) =>
      saveFn({ data: { itemType: "pageant", itemId: p.id, label: p.name } }),
    onSuccess: (r) => toast.success(r.saved ? "Saved to your shortlist" : "Removed from shortlist"),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update shortlist"),
  });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center gap-3">
        <MapPin className="h-6 w-6 text-gold" />
        <div>
          <h1 className="font-display text-3xl">Pageant Discovery</h1>
          <p className="text-xs text-muted-foreground">
            Only verified data is shown as fact. Anything unconfirmed reads “{UNAVAILABLE}”.
          </p>
        </div>
      </div>

      <form
        className="mb-8 flex gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setApplied({ q, city });
        }}
      >
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pageant name" />
        <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="max-w-[200px]" />
        <Button type="submit">Search</Button>
      </form>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gold" />
        </div>
      ) : data?.length ? (
        <div className="space-y-4">
          {data.map((p) => (
            <div key={p.id} className="glass-panel rounded-xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl">{p.name}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[p.city, p.state, p.country].filter(Boolean).join(", ") || UNAVAILABLE}
                    {p.organizer ? ` · ${p.organizer}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {p.verified ? (
                    <span className="flex items-center gap-1 text-xs text-success">
                      <ShieldCheck className="h-3.5 w-3.5" /> Verified
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-warning">
                      <ShieldAlert className="h-3.5 w-3.5" /> Unverified
                    </span>
                  )}
                  <Button size="sm" variant="outline" onClick={() => save.mutate({ id: p.id, name: p.name })}>
                    <Bookmark className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
                <Detail label="Age" value={p.min_age || p.max_age ? `${p.min_age ?? "?"}–${p.max_age ?? "?"}` : null} />
                <Detail label="Min height" value={p.min_height_cm ? `${p.min_height_cm} cm` : null} />
                <Detail label="Registration closes" value={p.registration_close} />
                <Detail label="Finale" value={p.finale_date} />
                <Detail label="Application fee" value={p.application_fee} />
                <Detail label="Eligibility" value={p.eligibility} />
              </div>
              {p.official_url && (
                <a
                  href={p.official_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-4 inline-flex items-center gap-1 text-xs text-gold hover:underline"
                >
                  Official site <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-panel rounded-xl p-10 text-center">
          <p className="font-display text-2xl">No pageants listed yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            CrownFit never invents pageant listings. Verified pageants appear here as they are confirmed against official sources.
          </p>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <p className={value ? "text-foreground" : "text-muted-foreground italic"}>{value ?? UNAVAILABLE}</p>
    </div>
  );
}

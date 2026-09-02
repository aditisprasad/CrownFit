import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, Building2, Bookmark, ExternalLink, ShieldCheck, ShieldAlert, Star } from "lucide-react";
import { toast } from "sonner";
import { listProviders, toggleSaved } from "@/lib/discovery.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/providers")({
  head: () => ({
    meta: [
      { title: "Provider Discovery — CrownFit" },
      { name: "description", content: "Find modelling institutes, pageant coaches, designers and makeup artists — with verification status on every listing." },
      { property: "og:title", content: "Provider Discovery — CrownFit" },
      { property: "og:description", content: "Find institutes, coaches, designers and makeup artists for your pageant journey." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Providers,
});

const UNAVAILABLE = "Official information unavailable";
const CATEGORIES = ["institute", "coach", "designer", "makeup_artist", "photographer", "fitness"];

function label(c: string) {
  return c.replace(/_/g, " ");
}

function Providers() {
  const listFn = useServerFn(listProviders);
  const saveFn = useServerFn(toggleSaved);
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState<string>("");
  const [applied, setApplied] = useState<{ q: string; city: string; category?: string }>({ q: "", city: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["providers", applied],
    queryFn: () => listFn({ data: applied }),
  });

  const save = useMutation({
    mutationFn: (p: { id: string; name: string }) =>
      saveFn({ data: { itemType: "provider", itemId: p.id, label: p.name } }),
    onSuccess: (r) => toast.success(r.saved ? "Saved to your shortlist" : "Removed from shortlist"),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update shortlist"),
  });

  function apply(nextCategory = category) {
    setApplied(nextCategory ? { q, city, category: nextCategory } : { q, city });
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center gap-3">
        <Building2 className="h-6 w-6 text-gold" />
        <div>
          <h1 className="font-display text-3xl">Provider Discovery</h1>
          <p className="text-xs text-muted-foreground">
            Institutes, coaches, designers, MUAs and photographers — verification status shown on every listing.
          </p>
        </div>
      </div>

      <form
        className="mb-4 flex gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          apply();
        }}
      >
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name" />
        <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="max-w-[200px]" />
        <Button type="submit">Search</Button>
      </form>

      <div className="mb-8 flex flex-wrap gap-2">
        <button
          onClick={() => {
            setCategory("");
            apply("");
          }}
          className={cn(
            "rounded-full border border-border px-3 py-1 text-xs capitalize transition-colors",
            !category ? "border-gold text-gold" : "text-muted-foreground hover:text-foreground",
          )}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => {
              setCategory(c);
              apply(c);
            }}
            className={cn(
              "rounded-full border border-border px-3 py-1 text-xs capitalize transition-colors",
              category === c ? "border-gold text-gold" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label(c)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gold" />
        </div>
      ) : data?.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((p) => (
            <div key={p.id} className="glass-panel rounded-xl p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl">{p.name}</h2>
                  <p className="eyebrow mt-1">{label(p.category)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {p.verified ? (
                    <ShieldCheck className="h-4 w-4 text-success" />
                  ) : (
                    <ShieldAlert className="h-4 w-4 text-warning" />
                  )}
                  <Button size="sm" variant="outline" onClick={() => save.mutate({ id: p.id, name: p.name })}>
                    <Bookmark className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {p.address || [p.city, p.state].filter(Boolean).join(", ") || UNAVAILABLE}
              </p>
              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                {p.rating != null ? (
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-gold" /> {Number(p.rating).toFixed(1)}
                    {p.review_count ? ` (${p.review_count})` : ""}
                  </span>
                ) : (
                  <span className="italic">Rating unavailable</span>
                )}
                {p.price_band && <span>{p.price_band}</span>}
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-xs">
                {p.phone && <span className="text-muted-foreground">{p.phone}</span>}
                {p.website && (
                  <a href={p.website} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-gold hover:underline">
                    Website <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {p.maps_url && (
                  <a href={p.maps_url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-gold hover:underline">
                    Map <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-panel rounded-xl p-10 text-center">
          <p className="font-display text-2xl">No providers listed yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            CrownFit never fabricates businesses. Verified providers appear here once confirmed against official sources.
          </p>
        </div>
      )}
    </div>
  );
}

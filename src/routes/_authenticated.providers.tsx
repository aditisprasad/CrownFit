import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  Loader2,
  Building2,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Star,
  Search,
  AlertTriangle,
  Settings2,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { searchProviders, toggleSavedPlace, PROVIDER_CATEGORIES } from "@/lib/places.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/providers")({
  head: () => ({
    meta: [
      { title: "Professionals — CrownFit" },
      {
        name: "description",
        content:
          "Find real pageant coaches, institutes, makeup artists, designers, photographers and fitness studios near you.",
      },
      { property: "og:title", content: "Professionals — CrownFit" },
      {
        property: "og:description",
        content: "Find real pageant professionals near you, sourced from Google.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Providers,
});

const UNAVAILABLE = "Official information unavailable";
type Cat = keyof typeof PROVIDER_CATEGORIES;
type Applied = { q: string; city: string; category?: Cat };

function Providers() {
  const qc = useQueryClient();
  const searchFn = useServerFn(searchProviders);
  const saveFn = useServerFn(toggleSavedPlace);
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState<Cat | undefined>();
  const [applied, setApplied] = useState<Applied | null>(null);

  const { data, isFetching, isError } = useQuery({
    queryKey: ["providers", applied],
    queryFn: () => searchFn({ data: applied! }),
    enabled: !!applied,
    staleTime: 5 * 60_000,
  });

  const save = useMutation({
    mutationFn: (placeId: string) => saveFn({ data: { placeId, category: applied?.category } }),
    onSuccess: (r) => {
      toast.success(r.saved ? "Saved to your shortlist" : "Removed from shortlist");
      qc.invalidateQueries({ queryKey: ["providers"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update shortlist"),
  });

  function run(next: Cat | undefined = category) {
    if (!city.trim() && !q.trim()) {
      toast.error("Enter a city or a search term.");
      return;
    }
    setApplied({ q: q.trim(), city: city.trim(), ...(next ? { category: next } : {}) });
  }

  const saved = new Set(data?.saved ?? []);
  const status = isError ? "error" : data?.status;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center gap-3">
        <Building2 className="h-6 w-6 text-gold" />
        <div>
          <h1 className="font-display text-3xl">Professionals</h1>
          <p className="text-xs text-muted-foreground">
            Real businesses from Google. Missing details read “{UNAVAILABLE}”.
          </p>
        </div>
      </div>

      <form
        className="glass-panel mb-4 grid gap-3 rounded-xl p-5 sm:grid-cols-[1fr_220px_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name or speciality (optional)"
            className="h-11 pl-9"
          />
        </div>
        <Input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City, e.g. Mumbai"
          className="h-11"
        />
        <Button type="submit" className="h-11" disabled={isFetching}>
          Search
        </Button>
      </form>

      <div className="mb-8 flex flex-wrap gap-2">
        {([undefined, ...(Object.keys(PROVIDER_CATEGORIES) as Cat[])] as (Cat | undefined)[]).map(
          (c) => (
            <button
              key={c ?? "all"}
              onClick={() => {
                setCategory(c);
                if (applied) run(c);
              }}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                category === c
                  ? "border-gold text-gold"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {c ? PROVIDER_CATEGORIES[c].label : "All"}
            </button>
          ),
        )}
      </div>

      {!applied ? (
        <Empty
          icon={MapPin}
          title="Search for professionals"
          body="Enter your city and pick a category to find real coaches, institutes, makeup artists and more."
        />
      ) : isFetching ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gold" />
        </div>
      ) : status === "not_configured" ? (
        <Empty
          icon={Settings2}
          title="Provider discovery requires Google Places configuration."
          body="Google Places isn't set up for this app yet."
        />
      ) : status === "error" ? (
        <Empty
          icon={AlertTriangle}
          title="Unable to retrieve provider information right now."
          body="Please try again in a moment."
        />
      ) : status === "no_match" || status === "need_input" ? (
        <Empty
          icon={Search}
          title="No verified professionals found for this search."
          body="Try another city, category or search term."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data!.results.map((p) => (
            <div key={p.placeId} className="glass-panel flex flex-col rounded-xl p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl">{p.name}</h2>
                  <p className="eyebrow mt-1">
                    {p.type ??
                      (applied.category
                        ? PROVIDER_CATEGORIES[applied.category].label
                        : UNAVAILABLE)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  aria-label="Save professional"
                  disabled={save.isPending}
                  onClick={() => save.mutate(p.placeId)}
                >
                  {saved.has(p.placeId) ? (
                    <BookmarkCheck className="h-3.5 w-3.5 text-gold" />
                  ) : (
                    <Bookmark className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{p.address ?? UNAVAILABLE}</p>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                {p.rating != null ? (
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-gold" /> {p.rating.toFixed(1)}
                    {p.reviewCount != null ? ` (${p.reviewCount} reviews)` : ""}
                  </span>
                ) : (
                  <span className="italic">Rating: {UNAVAILABLE}</span>
                )}
                {p.businessStatus && p.businessStatus !== "OPERATIONAL" && (
                  <span className="text-warning">
                    {p.businessStatus.replace(/_/g, " ").toLowerCase()}
                  </span>
                )}
              </div>
              <div className="mt-auto flex flex-wrap gap-4 pt-4 text-xs">
                <span className="text-muted-foreground">
                  {p.phone ?? <span className="italic">Phone: {UNAVAILABLE}</span>}
                </span>
                {p.website && <ExtLink href={p.website}>Website</ExtLink>}
                {p.mapsUrl && <ExtLink href={p.mapsUrl}>Google Maps</ExtLink>}
              </div>
            </div>
          ))}
        </div>
      )}
      {status === "ok" && (
        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Business information provided by Google.
        </p>
      )}
    </div>
  );
}

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-1 text-gold hover:underline"
    >
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

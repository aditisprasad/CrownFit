import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";

export const PROVIDER_CATEGORIES = {
  coach: { label: "Pageant Coach", query: "pageant coach" },
  institute: { label: "Modeling / Fashion Institute", query: "modeling academy fashion institute" },
  makeup_artist: { label: "Makeup Artist", query: "makeup artist" },
  designer: { label: "Fashion Designer", query: "fashion designer boutique" },
  photographer: { label: "Photographer", query: "fashion portfolio photographer" },
  fitness: { label: "Fitness / Wellness", query: "fitness wellness studio" },
} as const;
type Cat = keyof typeof PROVIDER_CATEGORIES;
const CatEnum = z.enum(Object.keys(PROVIDER_CATEGORIES) as [Cat, ...Cat[]]);

export type PlaceResult = {
  placeId: string;
  name: string;
  address: string | null;
  rating: number | null;
  reviewCount: number | null;
  phone: string | null;
  website: string | null;
  mapsUrl: string | null;
  businessStatus: string | null;
  type: string | null;
};

type RawPlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  businessStatus?: string;
  primaryTypeDisplayName?: { text?: string };
  location?: { latitude?: number; longitude?: number };
};

const FIELDS = [
  "id", "displayName", "formattedAddress", "rating", "userRatingCount", "nationalPhoneNumber",
  "internationalPhoneNumber", "websiteUri", "googleMapsUri", "businessStatus", "primaryTypeDisplayName", "location",
];

function creds() {
  const lovable = process.env["LOVABLE_API_KEY"];
  const maps = process.env["GOOGLE_MAPS_API_KEY"];
  return lovable && maps ? { lovable, maps } : null;
}

function map(p: RawPlace): PlaceResult | null {
  if (!p.id || !p.displayName?.text) return null;
  return {
    placeId: p.id,
    name: p.displayName.text,
    address: p.formattedAddress ?? null,
    rating: p.rating ?? null,
    reviewCount: p.userRatingCount ?? null,
    phone: p.nationalPhoneNumber ?? p.internationalPhoneNumber ?? null,
    website: p.websiteUri ?? null,
    mapsUrl: p.googleMapsUri ?? null,
    businessStatus: p.businessStatus ?? null,
    type: p.primaryTypeDisplayName?.text ?? null,
  };
}

export const searchProviders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ q: z.string().max(100).default(""), city: z.string().max(80).default(""), category: CatEnum.optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const c = creds();
    if (!c) return { status: "not_configured" as const, results: [] as PlaceResult[], saved: [] as string[] };
    if (!data.city.trim() && !data.q.trim()) return { status: "need_input" as const, results: [], saved: [] };

    const cat = data.category ? PROVIDER_CATEGORIES[data.category].query : "pageant coach makeup artist modeling";
    const textQuery = [data.q.trim(), cat, data.city.trim() ? `in ${data.city.trim()}` : ""].filter(Boolean).join(" ");
    try {
      const res = await fetch(`${GATEWAY}/places/v1/places:searchText`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${c.lovable}`,
          "X-Connection-Api-Key": c.maps,
          "Content-Type": "application/json",
          "X-Goog-FieldMask": FIELDS.map((f) => `places.${f}`).join(","),
        },
        body: JSON.stringify({ textQuery, pageSize: 20 }),
      });
      if (!res.ok) {
        console.error("Places search failed", res.status, await res.text());
        return { status: "error" as const, results: [], saved: [] };
      }
      const json = (await res.json()) as { places?: RawPlace[] };
      const results = (json.places ?? []).map(map).filter((x): x is PlaceResult => !!x);

      let saved: string[] = [];
      if (results.length) {
        const { data: rows } = await context.supabase
          .from("providers")
          .select("id, place_id")
          .in("place_id", results.map((r) => r.placeId));
        const ids = (rows ?? []).map((r) => r.id);
        if (ids.length) {
          const { data: s } = await context.supabase
            .from("saved_items")
            .select("item_id")
            .eq("user_id", context.userId)
            .eq("item_type", "provider")
            .in("item_id", ids);
          const savedIds = new Set((s ?? []).map((x) => x.item_id));
          saved = (rows ?? []).filter((r) => savedIds.has(r.id)).map((r) => r.place_id!);
        }
      }
      return { status: results.length ? ("ok" as const) : ("no_match" as const), results, saved };
    } catch (e) {
      console.error("Places search error", e);
      return { status: "error" as const, results: [], saved: [] };
    }
  });

export const toggleSavedPlace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ placeId: z.string().min(3).max(300).regex(/^[A-Za-z0-9_-]+$/), category: CatEnum.optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const c = creds();
    if (!c) throw new Error("Provider discovery requires Google Places configuration.");

    // Re-fetch details server-side so stored data always comes from Google, never the client.
    const res = await fetch(`${GATEWAY}/places/v1/places/${data.placeId}`, {
      headers: { Authorization: `Bearer ${c.lovable}`, "X-Connection-Api-Key": c.maps, "X-Goog-FieldMask": FIELDS.join(",") },
    });
    if (!res.ok) {
      console.error("Place details failed", res.status, await res.text());
      throw new Error("Unable to retrieve provider information right now.");
    }
    const raw = (await res.json()) as RawPlace;
    const p = map(raw);
    if (!p) throw new Error("Unable to retrieve provider information right now.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("providers")
      .upsert(
        {
          place_id: p.placeId,
          name: p.name,
          category: data.category ?? "other",
          address: p.address,
          rating: p.rating,
          review_count: p.reviewCount,
          phone: p.phone,
          website: p.website,
          maps_url: p.mapsUrl,
          latitude: raw.location?.latitude ?? null,
          longitude: raw.location?.longitude ?? null,
          source: "google_places",
          source_url: p.mapsUrl,
          last_verified: new Date().toISOString(),
        },
        { onConflict: "place_id" },
      )
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const { data: existing } = await context.supabase
      .from("saved_items")
      .select("id")
      .eq("user_id", context.userId)
      .eq("item_type", "provider")
      .eq("item_id", row.id)
      .maybeSingle();
    if (existing) {
      await context.supabase.from("saved_items").delete().eq("id", existing.id);
      return { saved: false };
    }
    const { error: insErr } = await context.supabase
      .from("saved_items")
      .insert({ user_id: context.userId, item_type: "provider", item_id: row.id, label: p.name });
    if (insErr) throw new Error(insErr.message);
    return { saved: true };
  });

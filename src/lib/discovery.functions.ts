import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Search = z.object({ q: z.string().optional(), city: z.string().optional() });

const PageantSearch = z.object({
  q: z.string().max(100).optional(),
  country: z.string().max(80).optional(),
  state: z.string().max(80).optional(),
  city: z.string().max(80).optional(),
  age: z.number().int().min(10).max(80).optional(),
  registration: z.enum(["any", "open", "upcoming", "closed"]).optional(),
});

export const listPageants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PageantSearch.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    // Is any data source populated at all? Distinguishes "no source" from "no match".
    const { count, error: countErr } = await context.supabase
      .from("pageants")
      .select("id", { count: "exact", head: true });
    if (countErr) return { status: "error" as const, rows: [], saved: [] as string[] };
    if (!count) return { status: "no_source" as const, rows: [], saved: [] as string[] };

    const today = new Date().toISOString().slice(0, 10);
    let query = context.supabase.from("pageants").select("*").order("name").limit(60);
    if (data.q) query = query.or(`name.ilike.%${data.q.replace(/[,()%]/g, "")}%,organizer.ilike.%${data.q.replace(/[,()%]/g, "")}%`);
    if (data.country) query = query.ilike("country", `%${data.country}%`);
    if (data.state) query = query.ilike("state", `%${data.state}%`);
    if (data.city) query = query.ilike("city", `%${data.city}%`);
    if (data.age != null) query = query.lte("min_age", data.age).gte("max_age", data.age);
    if (data.registration === "open") query = query.lte("registration_open", today).gte("registration_close", today);
    if (data.registration === "upcoming") query = query.gt("registration_open", today);
    if (data.registration === "closed") query = query.lt("registration_close", today);
    const { data: rows, error } = await query;
    if (error) return { status: "error" as const, rows: [], saved: [] as string[] };

    const { data: saved } = await context.supabase
      .from("saved_items")
      .select("item_id")
      .eq("user_id", context.userId)
      .eq("item_type", "pageant");
    return {
      status: rows?.length ? ("ok" as const) : ("no_match" as const),
      rows: rows ?? [],
      saved: (saved ?? []).map((s) => s.item_id as string),
    };
  });

export const listProviders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Search.extend({ category: z.string().optional() }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    let query = context.supabase.from("providers").select("*").order("name").limit(60);
    if (data.q) query = query.ilike("name", `%${data.q}%`);
    if (data.city) query = query.ilike("city", `%${data.city}%`);
    if (data.category) query = query.eq("category", data.category);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const toggleSaved = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ itemType: z.enum(["pageant", "provider"]), itemId: z.string().uuid(), label: z.string().optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("saved_items")
      .select("id")
      .eq("user_id", context.userId)
      .eq("item_type", data.itemType)
      .eq("item_id", data.itemId)
      .maybeSingle();
    if (existing) {
      await context.supabase.from("saved_items").delete().eq("id", existing.id);
      return { saved: false };
    }
    const { error } = await context.supabase.from("saved_items").insert({
      user_id: context.userId,
      item_type: data.itemType,
      item_id: data.itemId,
      label: data.label ?? null,
    });
    if (error) throw new Error(error.message);
    return { saved: true };
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Search = z.object({ q: z.string().optional(), city: z.string().optional() });

export const listPageants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Search.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    let query = context.supabase.from("pageants").select("*").order("name").limit(60);
    if (data.q) query = query.ilike("name", `%${data.q}%`);
    if (data.city) query = query.ilike("city", `%${data.city}%`);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
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

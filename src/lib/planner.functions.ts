import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getPlanner = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const uid = context.userId;
    const [events, bookings] = await Promise.all([
      context.supabase
        .from("calendar_events")
        .select("*")
        .eq("user_id", uid)
        .order("starts_at", { ascending: true })
        .limit(200),
      context.supabase
        .from("bookings")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    if (events.error) throw new Error(events.error.message);
    if (bookings.error) throw new Error(bookings.error.message);
    return { events: events.data ?? [], bookings: bookings.data ?? [] };
  });

const EventInput = z.object({
  title: z.string().min(1).max(160),
  kind: z.enum(["audition", "appointment", "training", "deadline", "shoot", "other"]),
  starts_at: z.string().min(10),
  ends_at: z.string().min(10).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  reminder_minutes: z.number().int().min(0).max(10080).optional().nullable(),
});

export const createEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => EventInput.parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("calendar_events")
      .insert({
        user_id: context.userId,
        title: data.title,
        kind: data.kind,
        starts_at: new Date(data.starts_at).toISOString(),
        ends_at: data.ends_at ? new Date(data.ends_at).toISOString() : null,
        location: data.location ?? null,
        notes: data.notes ?? null,
        reminder_minutes: data.reminder_minutes ?? 60,
        status: "scheduled",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("calendar_events")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const BookingInput = z.object({
  title: z.string().min(1).max(160),
  category: z.string().max(80).optional().nullable(),
  provider_name: z.string().max(160).optional().nullable(),
  starts_at: z.string().min(10).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  contact: z.string().max(160).optional().nullable(),
  booking_url: z.string().url().max(500).optional().nullable(),
  confirmation_reference: z.string().max(160).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  is_external: z.boolean().default(true),
});

export const createBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => BookingInput.parse(i))
  .handler(async ({ data, context }) => {
    const uid = context.userId;
    const startsAt = data.starts_at ? new Date(data.starts_at).toISOString() : null;
    const { data: booking, error } = await context.supabase
      .from("bookings")
      .insert({
        user_id: uid,
        title: data.title,
        category: data.category ?? null,
        provider_name: data.provider_name ?? null,
        starts_at: startsAt,
        location: data.location ?? null,
        contact: data.contact ?? null,
        booking_url: data.booking_url ?? null,
        confirmation_reference: data.confirmation_reference ?? null,
        notes: data.notes ?? null,
        is_external: data.is_external,
        status: "pending",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    // A booking with a date automatically becomes a calendar appointment.
    if (startsAt) {
      await context.supabase.from("calendar_events").insert({
        user_id: uid,
        title: data.provider_name ? `${data.title} — ${data.provider_name}` : data.title,
        kind: "appointment",
        starts_at: startsAt,
        location: data.location ?? null,
        notes: data.notes ?? null,
        reminder_minutes: 120,
        status: "scheduled",
      });
    }
    return { id: booking.id, calendarEventCreated: Boolean(startsAt) };
  });

export const updateBookingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["pending", "confirmed", "completed", "cancelled"]),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("bookings")
      .update({ status: data.status })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

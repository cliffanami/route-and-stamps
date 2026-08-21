import { z } from "zod";

// Free-text logistics fields on a stop (ROADMAP.md M4) — shared by the
// Stop Detail edit form and the Supabase update (CONVENTIONS.md §3). Not a
// full stop schema; stop creation itself is still SQL-seeded/AddStopForm
// only (name/lat/lng/town/dates), not this.
export const stopLogisticsSchema = z
  .object({
    guide_info: z.string().trim().max(500).nullable(),
    flight_info: z.string().trim().max(500).nullable(),
    // Structured scheduling fields (ROADMAP.md Milestone D) — date_label
    // stays as a free-text override; these are what check_scheduled_arrivals()
    // actually reads. arrival_time is a full timestamp (flights especially);
    // start_date/end_date are date-only. Validated end >= start client-side
    // too (below) — the DB's own check constraint is the real boundary,
    // this is just immediate feedback.
    start_date: z.string().trim().min(1).nullable(),
    end_date: z.string().trim().min(1).nullable(),
    arrival_time: z.string().trim().min(1).nullable(),
    // Day-by-day narrative (Japan-trip seed, ROADMAP.md's Stop Detail
    // work) — rendered with visual breaks between days at display time,
    // not split into a structured per-day table (deliberately deferred
    // when this field was designed).
    description: z.string().trim().max(4000).nullable(),
    // Inter-stop transport — plain text, not its own enum; valid values
    // come from the trip's own configurable transport_modes array
    // (ROADMAP.md Milestone C), enforced by the UI's select, not this
    // schema (a trip's list isn't known statically here).
    transport_mode: z.string().trim().max(50).nullable(),
    transport_detail: z.string().trim().max(500).nullable(),
    transport_cost_status: z
      .enum(["included", "own_account", "check"])
      .nullable(),
    departure_point: z.string().trim().max(200).nullable(),
    arrival_point: z.string().trim().max(200).nullable(),
  })
  .refine(
    (v) => !v.start_date || !v.end_date || v.end_date >= v.start_date,
    { message: "End date can't be before the start date", path: ["end_date"] },
  );

export type StopLogisticsInput = z.infer<typeof stopLogisticsSchema>;

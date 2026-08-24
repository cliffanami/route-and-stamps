// Hand-authored stand-in for `supabase gen types typescript`, which needs
// an authenticated CLI session this environment doesn't have. Shapes match
// supabase/migrations/0001_init.sql exactly — regenerate this file for real
// once `supabase login` is available, rather than hand-editing further.

export type VoteLevel =
  "interested" | "want" | "really_want" | "must_go" | "skip";
export type BookingStatus = "not_booked" | "booked" | "confirmed";
export type MealTag = "breakfast" | "lunch" | "dinner";
export type TransportCostStatus = "included" | "own_account" | "check";
export type TipFormat = "text" | "video";
export type BudgetMode = "cap" | "tally";
export type BudgetStatus = "not_booked" | "pending" | "paid";
export type NotificationType =
  "consensus_reached" | "place_added" | "tip_added" | "vote_cast" |
  "arrival_estimated" | "packing_due" | "trip_joined" | "checked_in";
export type TripRole = "owner" | "member";
export type FunFactSource = "wikipedia" | "manual";

export interface Stop {
  id: string;
  trip_id: string;
  name: string;
  town: string | null;
  lat: number;
  lng: number;
  order_index: number;
  date_label: string | null;
  is_pending: boolean;
  guide_info: string | null;
  flight_info: string | null;
  start_date: string | null;
  end_date: string | null;
  arrival_time: string | null;
  description: string | null;
  // Inter-stop transport only — a within-stop activity (e.g. a cycling
  // day) stays in `description`, not here (ROADMAP.md Milestone C).
  // transport_mode is plain text, not its own enum — valid values come
  // from the trip's own transport_modes array, not a fixed schema-level set.
  transport_mode: string | null;
  transport_detail: string | null;
  transport_cost_status: TransportCostStatus | null;
  departure_point: string | null;
  arrival_point: string | null;
  created_at: string;
}

export interface Trip {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  is_international: boolean;
  budget_mode: BudgetMode;
  budget_cap: number | null;
  budget_cap_currency: string | null;
  currencies: string[];
  tip_categories: string[];
  budget_categories: string[];
  outbound_travel_note: string | null;
  return_travel_note: string | null;
  // Per-trip configurable list backing stops.transport_mode's strict select
  // (ROADMAP.md Milestone C) — defaults to a starter set on new trips
  // (DB column default), stays freely editable per trip afterward.
  transport_modes: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Place {
  id: string;
  trip_id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  town: string | null;
  nearest_stop_id: string | null;
  source_url: string | null;
  embed_html: string | null;
  photo_url: string | null;
  note: string | null;
  booking_status: BookingStatus;
  meal_tags: MealTag[];
  is_accommodation: boolean;
  needs_name: boolean;
  added_by: string;
  created_at: string;
  updated_at: string;
}

export interface Vote {
  place_id: string;
  user_id: string;
  level: VoteLevel;
  updated_at: string;
}

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  // Which notification types the person wants as a real OS push while the
  // app isn't open (migration 0020) — independent of is_instant, which
  // only governs in-app digest-eligibility.
  push_enabled_types: NotificationType[];
  created_at: string;
}

export interface Tip {
  id: string;
  trip_id: string;
  category: string;
  format: TipFormat;
  content_text: string | null;
  source_url: string | null;
  embed_html: string | null;
  related_place_id: string | null;
  related_stop_id: string | null;
  added_by: string;
  created_at: string;
}

export interface BudgetLine {
  id: string;
  trip_id: string;
  category: string;
  description: string;
  amount_minor: number;
  currency: string;
  status: BudgetStatus;
  paid_by: string | null;
  payment_details: string | null;
  due_date: string | null;
  paid_at: string | null;
  place_id: string | null;
  stop_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PackingItem {
  id: string;
  trip_id: string;
  // Shared items use is_checked directly (single flag, unchanged);
  // non-shared items track completion per-person via PackingItemCheck
  // rows instead — is_checked stays false and unused for these.
  is_shared: boolean;
  name: string;
  category: string | null;
  is_document: boolean;
  is_checked: boolean;
  due_date: string | null;
  created_at: string;
}

// One row per (item, person) who's checked a non-shared packing item —
// modeled like Vote, not an ownership flag on a duplicated row.
export interface PackingItemCheck {
  item_id: string;
  user_id: string;
  checked_at: string;
}

export interface TripMember {
  trip_id: string;
  user_id: string;
  role: TripRole;
  joined_at: string;
}

export interface TripInvite {
  token: string;
  trip_id: string;
  created_by: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
}

export interface InvitePreview {
  trip_id: string;
  trip_name: string;
  start_date: string | null;
  end_date: string | null;
  stop_cities: string[];
  place_count: number;
  tip_count: number;
  inviter_name: string;
  is_valid: boolean;
}

// One row per (stop, person) who's checked in — modeled exactly like
// Vote, not a single per-stop flag, since more than one person can
// confirm independently.
export interface StopCheckin {
  stop_id: string;
  user_id: string;
  checked_in_at: string;
}

// One row per (place, person) who's marked it visited — modeled exactly
// like StopCheckin, not the single dropped visited_at timestamp it
// replaces (that column tracked "has this been visited" with no sense of
// who, and was never actually wired to any mutation or UI).
export interface PlaceCheckin {
  place_id: string;
  user_id: string;
  checked_in_at: string;
}

export interface FunFact {
  id: string;
  trip_id: string;
  place_id: string | null;
  stop_id: string | null;
  source: FunFactSource;
  body: string;
  // Null for wikipedia-sourced rows — nothing to attribute a keyless API
  // lookup to.
  added_by: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  trip_id: string;
  recipient_id: string;
  type: NotificationType;
  // Every field the trigger functions embed (0005_notifications.sql) is
  // text/uuid-as-string — place_id/place_name/tip_id/category/
  // added_by_name — not typed per-variant since it's read straight from a
  // jsonb column with no schema enforcement beyond what the triggers write.
  payload: Record<string, string>;
  is_instant: boolean;
  read_at: string | null;
  digested_at: string | null;
  created_at: string;
}

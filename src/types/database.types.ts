// Hand-authored stand-in for `supabase gen types typescript`, which needs
// an authenticated CLI session this environment doesn't have. Shapes match
// supabase/migrations/0001_init.sql exactly — regenerate this file for real
// once `supabase login` is available, rather than hand-editing further.

export type VoteLevel =
  "interested" | "want" | "really_want" | "must_go" | "skip";
export type BookingStatus = "not_booked" | "booked" | "confirmed";
export type TipFormat = "text" | "video";
export type BudgetMode = "cap" | "tally";
export type BudgetStatus = "not_booked" | "pending" | "paid";
export type NotificationType =
  "consensus_reached" | "place_added" | "tip_added" | "vote_cast" |
  "arrival_estimated" | "packing_due" | "trip_joined";
export type TripRole = "owner" | "member";

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
  hotel_info: string | null;
  meals_info: string | null;
  guide_info: string | null;
  flight_info: string | null;
  start_date: string | null;
  end_date: string | null;
  arrival_time: string | null;
  created_at: string;
}

export interface Trip {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  is_international: boolean;
  budget_mode: BudgetMode;
  budget_cap: number | null;
  budget_cap_currency: string | null;
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
  needs_name: boolean;
  visited_at: string | null;
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
  place_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PackingItem {
  id: string;
  trip_id: string;
  owner_id: string | null; // null = shared/trip-essentials item
  name: string;
  category: string | null;
  is_document: boolean;
  is_checked: boolean;
  due_date: string | null;
  created_at: string;
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

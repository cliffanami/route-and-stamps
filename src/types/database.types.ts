// Hand-authored stand-in for `supabase gen types typescript`, which needs
// an authenticated CLI session this environment doesn't have. Shapes match
// supabase/migrations/0001_init.sql exactly — regenerate this file for real
// once `supabase login` is available, rather than hand-editing further.

export type VoteLevel = "interested" | "want" | "really_want" | "must_go" | "skip";
export type BookingStatus = "not_booked" | "booked" | "confirmed";

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
  created_at: string;
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

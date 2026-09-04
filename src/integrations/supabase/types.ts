// Databasetypes voor supabase-js, in het formaat dat Lovable Cloud genereert.
// Bron van waarheid: supabase/migrations/*.sql. Lovable vervangt dit bestand door een gegenereerde versie
// zodra de backend is ingeschakeld; houd de kolomnamen hier en in de migratie gelijk.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'none';
export type SubscriptionPlan = 'maand' | 'seizoen' | 'jaar';
export type BookingStatus = 'requested' | 'confirmed' | 'declined' | 'expired' | 'cancelled';
export type ReportKind = 'hoogte' | 'bediening' | 'naam' | 'bestaat_niet' | 'anders';

export type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  boat: Json;
  settings: Json;
  created_at: string;
  updated_at: string;
}

export type TripRow = {
  id: string;
  user_id: string;
  name: string;
  waypoints: Json;
  hours_per_day: number;
  start_time: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type LogRow = {
  id: string;
  user_id: string;
  date: string;
  from: string;
  to: string;
  distance: number;
  duration: number;
  max_speed: number;
  avg_speed: number;
  track: Json;
  created_at: string;
  updated_at: string;
}

export type LessonProgressRow = {
  user_id: string;
  lesson_id: string;
  read_at: string | null;
  quiz_score: number | null;
  updated_at: string;
}

export type FavouriteRow = {
  user_id: string;
  poi_id: string;
  created_at: string;
}

export type SubscriptionRow = {
  user_id: string;
  status: SubscriptionStatus;
  plan: SubscriptionPlan | null;
  current_period_end: string | null;
  trial_until: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export type MarinaRow = {
  id: string;
  poi_id: string | null;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  whatsapp: string | null;
  berths_visitor: number | null;
  max_length: number | null;
  price_per_night: number | null;
  price_rules: Json;
  amenities: Json;
  accepts_requests: boolean;
  auto_confirm: boolean;
  created_at: string;
  updated_at: string;
}

export type BookingRequestRow = {
  id: string;
  marina_id: string;
  user_id: string;
  date_from: string;
  date_to: string;
  boat: Json;
  persons: number | null;
  note: string | null;
  status: BookingStatus;
  price_estimate: number | null;
  created_at: string;
  updated_at: string;
}

export type BookingRow = {
  id: string;
  request_id: string;
  marina_id: string;
  user_id: string;
  berth: string | null;
  amount_paid: number;
  stripe_payment_intent: string | null;
  created_at: string;
}

export type ReportRow = {
  id: string;
  user_id: string | null;
  object_type: 'bridge' | 'lock' | 'poi';
  object_id: string;
  kind: ReportKind;
  value: string | null;
  note: string | null;
  lat: number | null;
  lon: number | null;
  handled: boolean;
  created_at: string;
}

type Table<Row, Required extends keyof Row = never> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, Required>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, 'id'>;
      trips: Table<TripRow, 'id' | 'user_id' | 'name' | 'waypoints'>;
      logs: Table<LogRow, 'id' | 'user_id' | 'date' | 'from' | 'to' | 'distance' | 'duration'>;
      lesson_progress: Table<LessonProgressRow, 'user_id' | 'lesson_id'>;
      favourites: Table<FavouriteRow, 'user_id' | 'poi_id'>;
      subscriptions: Table<SubscriptionRow, 'user_id'>;
      marinas: Table<MarinaRow, 'name'>;
      booking_requests: Table<BookingRequestRow, 'marina_id' | 'user_id' | 'date_from' | 'date_to' | 'boat'>;
      bookings: Table<BookingRow, 'request_id' | 'marina_id' | 'user_id'>;
      reports: Table<ReportRow, 'object_type' | 'object_id' | 'kind'>;
    };
    Views: Record<string, never>;
    Functions: {
      has_plus: { Args: { uid?: string }; Returns: boolean };
    };
    Enums: {
      subscription_status: SubscriptionStatus;
      subscription_plan: SubscriptionPlan;
      booking_status: BookingStatus;
      report_kind: ReportKind;
    };
    CompositeTypes: Record<string, never>;
  };
};

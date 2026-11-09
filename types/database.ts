export type Role = "USER" | "ADMIN";
export type HackathonStatus = "UPCOMING" | "LIVE" | "ENDED";
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      users: Table<
        { id: string; name: string; email: string; passwordHash: string; role: Role; college: string | null; createdAt: string },
        { id?: string; name: string; email: string; passwordHash: string; role?: Role; college?: string | null; createdAt?: string }
      >;
      hackathons: Table<
        { id: string; title: string; description: string; rules: string; startAt: string; endAt: string; status: HackathonStatus; totalSlots: number; maxRealParticipants: number; resultsPublished: boolean; createdAt: string; updatedAt: string },
        { id?: string; title: string; description: string; rules: string; startAt: string; endAt: string; status?: HackathonStatus; totalSlots?: number; maxRealParticipants?: number; resultsPublished?: boolean; createdAt?: string; updatedAt?: string }
      >;
      registrations: Table<
        { id: string; userId: string; hackathonId: string; createdAt: string },
        { id?: string; userId: string; hackathonId: string; createdAt?: string }
      >;
      submissions: Table<
        { id: string; registrationId: string; title: string; description: string; repoUrl: string | null; zipPath: string; zipSize: number; submittedAt: string; score: number | null; adminFeedback: string | null },
        { id?: string; registrationId: string; title: string; description: string; repoUrl?: string | null; zipPath: string; zipSize: number; submittedAt?: string; score?: number | null; adminFeedback?: string | null }
      >;
      leaderboard_entries: Table<
        { id: string; hackathonId: string; rank: number; registrationId: string | null; displayName: string; score: number; isPlaceholder: boolean },
        { id?: string; hackathonId: string; rank: number; registrationId?: string | null; displayName: string; score: number; isPlaceholder?: boolean }
      >;
      announcements: Table<
        { id: string; hackathonId: string | null; title: string; body: string; createdAt: string },
        { id?: string; hackathonId?: string | null; title: string; body: string; createdAt?: string }
      >;
      rate_limit_counters: Table<
        { key: string; count: number; reset_at: string },
        { key: string; count: number; reset_at: string },
        { count?: number; reset_at?: string }
      >;
    };
    Views: Record<string, never>;
    Functions: {
      register_for_hackathon: { Args: { p_user_id: string; p_hackathon_id: string }; Returns: Database["public"]["Tables"]["registrations"]["Row"] };
      save_rank_assignments: { Args: { p_hackathon_id: string; p_assignments: Json }; Returns: undefined };
      replace_filler_entries: { Args: { p_hackathon_id: string; p_entries: Json }; Returns: number };
      get_hackathon_registration_counts: { Args: Record<string, never>; Returns: { hackathonId: string; registrationCount: number }[] };
      check_rate_limit: { Args: { p_key: string; p_limit: number; p_window_ms: number }; Returns: { allowed: boolean; remaining: number }[] };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

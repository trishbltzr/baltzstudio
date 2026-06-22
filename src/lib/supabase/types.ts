export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      dashboard_state: {
        Row: {
          id: string;
          projects: Json;
          selected_project_id: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          projects: Json;
          selected_project_id?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          projects?: Json;
          selected_project_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

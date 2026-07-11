export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      dashboard_project_state: {
        Row: {
          client_email: string | null;
          project: Json;
          project_id: string;
          updated_at: string;
        };
        Insert: {
          client_email?: string | null;
          project: Json;
          project_id: string;
          updated_at?: string;
        };
        Update: {
          client_email?: string | null;
          project?: Json;
          project_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
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
      dashboard_user_state: {
        Row: {
          selected_project_id: string | null;
          updated_at: string;
          user_email: string;
        };
        Insert: {
          selected_project_id?: string | null;
          updated_at?: string;
          user_email: string;
        };
        Update: {
          selected_project_id?: string | null;
          updated_at?: string;
          user_email?: string;
        };
        Relationships: [
          {
            foreignKeyName: "dashboard_user_state_selected_project_id_fkey";
            columns: ["selected_project_id"];
            isOneToOne: false;
            referencedRelation: "dashboard_project_state";
            referencedColumns: ["project_id"];
          },
        ];
      };
      portal_access_requests: {
        Row: {
          business_name: string | null;
          id: string;
          note: string | null;
          requested_at: string;
          requested_email: string;
          requested_name: string;
          status: string;
        };
        Insert: {
          business_name?: string | null;
          id?: string;
          note?: string | null;
          requested_at?: string;
          requested_email: string;
          requested_name: string;
          status?: string;
        };
        Update: {
          business_name?: string | null;
          id?: string;
          note?: string | null;
          requested_at?: string;
          requested_email?: string;
          requested_name?: string;
          status?: string;
        };
        Relationships: [];
      };
      portal_audit_runs: {
        Row: {
          client_id: string;
          run: Json;
          run_id: string;
          state: Json;
          updated_at: string;
        };
        Insert: {
          client_id: string;
          run: Json;
          run_id: string;
          state: Json;
          updated_at?: string;
        };
        Update: {
          client_id?: string;
          run?: Json;
          run_id?: string;
          state?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      portal_workspace_state: {
        Row: {
          state: Json;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          state: Json;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          state?: Json;
          updated_at?: string;
          workspace_id?: string;
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

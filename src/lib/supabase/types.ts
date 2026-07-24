export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agent_definitions: {
        Row: {
          allowed_tools: string[]
          approval_requirements: Json
          change_summary: string
          created_at: string
          id: string
          instructions: string
          last_reviewed_at: string | null
          lifecycle_state: string
          memory_policy: Json
          name: string
          output_schema: Json
          owner_user_id: string | null
          playbook_key: string
          playbook_version: number
          published_at: string | null
          service_kind: string
          stable_key: string
          tenant_id: string
          updated_at: string
          version: number
        }
        Insert: {
          allowed_tools?: string[]
          approval_requirements?: Json
          change_summary?: string
          created_at?: string
          id?: string
          instructions: string
          last_reviewed_at?: string | null
          lifecycle_state?: string
          memory_policy?: Json
          name: string
          output_schema?: Json
          owner_user_id?: string | null
          playbook_key: string
          playbook_version: number
          published_at?: string | null
          service_kind: string
          stable_key: string
          tenant_id: string
          updated_at?: string
          version: number
        }
        Update: {
          allowed_tools?: string[]
          approval_requirements?: Json
          change_summary?: string
          created_at?: string
          id?: string
          instructions?: string
          last_reviewed_at?: string | null
          lifecycle_state?: string
          memory_policy?: Json
          name?: string
          output_schema?: Json
          owner_user_id?: string | null
          playbook_key?: string
          playbook_version?: number
          published_at?: string | null
          service_kind?: string
          stable_key?: string
          tenant_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_definitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "portal_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_learning_events: {
        Row: {
          agent_definition_id: string
          agent_run_id: string | null
          client_id: string | null
          created_at: string
          event_kind: string
          evidence: Json
          id: string
          proposed_change: Json
          review_state: string
          reviewed_at: string | null
          reviewed_by: string | null
          summary: string
          tenant_id: string
        }
        Insert: {
          agent_definition_id: string
          agent_run_id?: string | null
          client_id?: string | null
          created_at?: string
          event_kind: string
          evidence?: Json
          id?: string
          proposed_change?: Json
          review_state?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          summary: string
          tenant_id: string
        }
        Update: {
          agent_definition_id?: string
          agent_run_id?: string | null
          client_id?: string | null
          created_at?: string
          event_kind?: string
          evidence?: Json
          id?: string
          proposed_change?: Json
          review_state?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          summary?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_learning_events_agent_definition_id_fkey"
            columns: ["agent_definition_id"]
            isOneToOne: false
            referencedRelation: "agent_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_learning_events_agent_run_id_fkey"
            columns: ["agent_run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_learning_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_learning_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "portal_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_memory: {
        Row: {
          access_policy: string
          approved_at: string
          approved_by: string
          client_id: string
          confidence: number
          content: Json
          created_at: string
          expires_at: string | null
          id: string
          memory_kind: string
          revoked_at: string | null
          revoked_by: string | null
          role_scope: string[]
          service_kind: string
          source_kind: string
          source_reference: string
          stage_key: string
          tenant_id: string
        }
        Insert: {
          access_policy?: string
          approved_at?: string
          approved_by: string
          client_id: string
          confidence: number
          content: Json
          created_at?: string
          expires_at?: string | null
          id?: string
          memory_kind: string
          revoked_at?: string | null
          revoked_by?: string | null
          role_scope?: string[]
          service_kind: string
          source_kind: string
          source_reference: string
          stage_key?: string
          tenant_id: string
        }
        Update: {
          access_policy?: string
          approved_at?: string
          approved_by?: string
          client_id?: string
          confidence?: number
          content?: Json
          created_at?: string
          expires_at?: string | null
          id?: string
          memory_kind?: string
          revoked_at?: string | null
          revoked_by?: string | null
          role_scope?: string[]
          service_kind?: string
          source_kind?: string
          source_reference?: string
          stage_key?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_memory_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_memory_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "portal_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_memory_revisions: {
        Row: {
          change_kind: string
          change_summary: string
          changed_by: string | null
          created_at: string
          id: string
          memory_id: string
          revision: number
          snapshot: Json
          tenant_id: string
        }
        Insert: {
          change_kind: string
          change_summary?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          memory_id: string
          revision: number
          snapshot: Json
          tenant_id: string
        }
        Update: {
          change_kind?: string
          change_summary?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          memory_id?: string
          revision?: number
          snapshot?: Json
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_memory_revisions_memory_id_fkey"
            columns: ["memory_id"]
            isOneToOne: false
            referencedRelation: "agent_memory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_memory_revisions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "portal_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_memory_usage_events: {
        Row: {
          agent_run_id: string
          id: string
          memory_id: string
          service_run_id: string
          stage_key: string
          tenant_id: string
          used_at: string
        }
        Insert: {
          agent_run_id: string
          id?: string
          memory_id: string
          service_run_id: string
          stage_key: string
          tenant_id: string
          used_at?: string
        }
        Update: {
          agent_run_id?: string
          id?: string
          memory_id?: string
          service_run_id?: string
          stage_key?: string
          tenant_id?: string
          used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_memory_usage_events_agent_run_id_fkey"
            columns: ["agent_run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_memory_usage_events_memory_id_fkey"
            columns: ["memory_id"]
            isOneToOne: false
            referencedRelation: "agent_memory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_memory_usage_events_service_run_id_fkey"
            columns: ["service_run_id"]
            isOneToOne: false
            referencedRelation: "service_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_memory_usage_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "portal_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_runs: {
        Row: {
          agent_definition_id: string
          agent_version: number
          client_id: string
          completed_at: string | null
          correction_summary: string | null
          created_at: string
          id: string
          idempotency_key: string
          input_scope: Json
          latency_ms: number | null
          output: Json
          service_run_id: string
          started_at: string | null
          state: string
          tenant_id: string
          token_cost: number | null
          tool_trace: Json
        }
        Insert: {
          agent_definition_id: string
          agent_version: number
          client_id: string
          completed_at?: string | null
          correction_summary?: string | null
          created_at?: string
          id?: string
          idempotency_key: string
          input_scope?: Json
          latency_ms?: number | null
          output?: Json
          service_run_id: string
          started_at?: string | null
          state: string
          tenant_id: string
          token_cost?: number | null
          tool_trace?: Json
        }
        Update: {
          agent_definition_id?: string
          agent_version?: number
          client_id?: string
          completed_at?: string | null
          correction_summary?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string
          input_scope?: Json
          latency_ms?: number | null
          output?: Json
          service_run_id?: string
          started_at?: string | null
          state?: string
          tenant_id?: string
          token_cost?: number | null
          tool_trace?: Json
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_agent_definition_id_fkey"
            columns: ["agent_definition_id"]
            isOneToOne: false
            referencedRelation: "agent_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_service_run_id_fkey"
            columns: ["service_run_id"]
            isOneToOne: false
            referencedRelation: "service_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "portal_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      check_definitions: {
        Row: {
          change_summary: string
          created_at: string
          created_by: string | null
          description: string
          evaluation_kind: string
          formula: Json
          freshness_seconds: number | null
          id: string
          lifecycle_state: string
          published_at: string | null
          required: boolean
          service_kind: string
          stable_key: string
          tenant_id: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          change_summary?: string
          created_at?: string
          created_by?: string | null
          description?: string
          evaluation_kind: string
          formula?: Json
          freshness_seconds?: number | null
          id?: string
          lifecycle_state?: string
          published_at?: string | null
          required?: boolean
          service_kind: string
          stable_key: string
          tenant_id: string
          title: string
          updated_at?: string
          version: number
        }
        Update: {
          change_summary?: string
          created_at?: string
          created_by?: string | null
          description?: string
          evaluation_kind?: string
          formula?: Json
          freshness_seconds?: number | null
          id?: string
          lifecycle_state?: string
          published_at?: string | null
          required?: boolean
          service_kind?: string
          stable_key?: string
          tenant_id?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "check_definitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "portal_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      check_dependencies: {
        Row: {
          check_definition_id: string
          created_at: string
          dependency_key: string
          dependency_kind: string
          id: string
          required: boolean
          tenant_id: string
        }
        Insert: {
          check_definition_id: string
          created_at?: string
          dependency_key: string
          dependency_kind: string
          id?: string
          required?: boolean
          tenant_id: string
        }
        Update: {
          check_definition_id?: string
          created_at?: string
          dependency_key?: string
          dependency_kind?: string
          id?: string
          required?: boolean
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_dependencies_check_definition_id_fkey"
            columns: ["check_definition_id"]
            isOneToOne: false
            referencedRelation: "check_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_dependencies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "portal_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      check_result_revisions: {
        Row: {
          check_definition_id: string
          client_id: string
          confidence: number | null
          created_at: string
          evidence_fingerprint: string | null
          evidence_item_ids: string[]
          evidence_snapshot_id: string | null
          id: string
          idempotency_key: string
          limitations: string[]
          rationale: string
          revision: number
          score: number | null
          service_run_id: string
          status: string
          supersedes_revision_id: string | null
          tenant_id: string
          verifier_id: string | null
          verifier_kind: string
        }
        Insert: {
          check_definition_id: string
          client_id: string
          confidence?: number | null
          created_at?: string
          evidence_fingerprint?: string | null
          evidence_item_ids?: string[]
          evidence_snapshot_id?: string | null
          id?: string
          idempotency_key: string
          limitations?: string[]
          rationale?: string
          revision: number
          score?: number | null
          service_run_id: string
          status: string
          supersedes_revision_id?: string | null
          tenant_id: string
          verifier_id?: string | null
          verifier_kind: string
        }
        Update: {
          check_definition_id?: string
          client_id?: string
          confidence?: number | null
          created_at?: string
          evidence_fingerprint?: string | null
          evidence_item_ids?: string[]
          evidence_snapshot_id?: string | null
          id?: string
          idempotency_key?: string
          limitations?: string[]
          rationale?: string
          revision?: number
          score?: number | null
          service_run_id?: string
          status?: string
          supersedes_revision_id?: string | null
          tenant_id?: string
          verifier_id?: string | null
          verifier_kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_result_revisions_check_definition_id_fkey"
            columns: ["check_definition_id"]
            isOneToOne: false
            referencedRelation: "check_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_result_revisions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_result_revisions_evidence_snapshot_id_fkey"
            columns: ["evidence_snapshot_id"]
            isOneToOne: false
            referencedRelation: "evidence_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_result_revisions_service_run_id_fkey"
            columns: ["service_run_id"]
            isOneToOne: false
            referencedRelation: "service_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_result_revisions_supersedes_revision_id_fkey"
            columns: ["supersedes_revision_id"]
            isOneToOne: false
            referencedRelation: "check_result_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_result_revisions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "portal_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      client_sources: {
        Row: {
          asset_reference: string | null
          client_id: string
          connected_data_reference: string | null
          created_at: string
          created_by: string | null
          fingerprint: string | null
          id: string
          metadata: Json
          normalized_domain: string | null
          retention_until: string | null
          secret_ref: string | null
          sitemap_url: string | null
          source_kind: string
          source_url: string | null
          supersedes_source_id: string | null
          tenant_id: string
          validated_at: string | null
          validation_message: string | null
          validation_state: string
          version: number
        }
        Insert: {
          asset_reference?: string | null
          client_id: string
          connected_data_reference?: string | null
          created_at?: string
          created_by?: string | null
          fingerprint?: string | null
          id?: string
          metadata?: Json
          normalized_domain?: string | null
          retention_until?: string | null
          secret_ref?: string | null
          sitemap_url?: string | null
          source_kind: string
          source_url?: string | null
          supersedes_source_id?: string | null
          tenant_id: string
          validated_at?: string | null
          validation_message?: string | null
          validation_state?: string
          version: number
        }
        Update: {
          asset_reference?: string | null
          client_id?: string
          connected_data_reference?: string | null
          created_at?: string
          created_by?: string | null
          fingerprint?: string | null
          id?: string
          metadata?: Json
          normalized_domain?: string | null
          retention_until?: string | null
          secret_ref?: string | null
          sitemap_url?: string | null
          source_kind?: string
          source_url?: string | null
          supersedes_source_id?: string | null
          tenant_id?: string
          validated_at?: string | null
          validation_message?: string | null
          validation_state?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_sources_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_sources_supersedes_source_id_fkey"
            columns: ["supersedes_source_id"]
            isOneToOne: false
            referencedRelation: "client_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_sources_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "portal_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          primary_contact_email: string | null
          slug: string
          source_kind: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          primary_contact_email?: string | null
          slug: string
          source_kind?: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          primary_contact_email?: string | null
          slug?: string
          source_kind?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "portal_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cocoon_leads: {
        Row: {
          brand_name: string | null
          building: string | null
          created_at: string
          email: string
          first_name: string | null
          goal: string | null
          id: string
          last_name: string | null
          metadata: Json
          phone: string | null
          source: string
          status: string
          updated_at: string
          website: string | null
        }
        Insert: {
          brand_name?: string | null
          building?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          goal?: string | null
          id?: string
          last_name?: string | null
          metadata?: Json
          phone?: string | null
          source?: string
          status?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          brand_name?: string | null
          building?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          goal?: string | null
          id?: string
          last_name?: string | null
          metadata?: Json
          phone?: string | null
          source?: string
          status?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      dashboard_project_state: {
        Row: {
          client_email: string | null
          project: Json
          project_id: string
          updated_at: string
        }
        Insert: {
          client_email?: string | null
          project: Json
          project_id: string
          updated_at?: string
        }
        Update: {
          client_email?: string | null
          project?: Json
          project_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      dashboard_state: {
        Row: {
          id: string
          projects: Json
          selected_project_id: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          projects: Json
          selected_project_id?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          projects?: Json
          selected_project_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      dashboard_user_state: {
        Row: {
          selected_project_id: string | null
          updated_at: string
          user_email: string
        }
        Insert: {
          selected_project_id?: string | null
          updated_at?: string
          user_email: string
        }
        Update: {
          selected_project_id?: string | null
          updated_at?: string
          user_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_user_state_selected_project_id_fkey"
            columns: ["selected_project_id"]
            isOneToOne: false
            referencedRelation: "dashboard_project_state"
            referencedColumns: ["project_id"]
          },
        ]
      }
      evidence_items: {
        Row: {
          captured_at: string
          client_id: string
          device_kind: string | null
          evidence_snapshot_id: string
          fingerprint: string
          fresh_until: string | null
          id: string
          payload: Json
          payload_reference: string | null
          retention_until: string | null
          source_kind: string
          source_locator: string
          status: string
          tenant_id: string
        }
        Insert: {
          captured_at?: string
          client_id: string
          device_kind?: string | null
          evidence_snapshot_id: string
          fingerprint: string
          fresh_until?: string | null
          id?: string
          payload?: Json
          payload_reference?: string | null
          retention_until?: string | null
          source_kind: string
          source_locator: string
          status: string
          tenant_id: string
        }
        Update: {
          captured_at?: string
          client_id?: string
          device_kind?: string | null
          evidence_snapshot_id?: string
          fingerprint?: string
          fresh_until?: string | null
          id?: string
          payload?: Json
          payload_reference?: string | null
          retention_until?: string | null
          source_kind?: string
          source_locator?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_items_evidence_snapshot_id_fkey"
            columns: ["evidence_snapshot_id"]
            isOneToOne: false
            referencedRelation: "evidence_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "portal_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_snapshots: {
        Row: {
          captured_at: string | null
          client_id: string
          client_source_id: string
          coverage_ratio: number
          created_at: string
          fingerprint: string | null
          fresh_until: string | null
          id: string
          idempotency_key: string
          provenance: Json
          retention_until: string | null
          service_run_id: string
          snapshot_kind: string
          source_kind: string
          status: string
          tenant_id: string
        }
        Insert: {
          captured_at?: string | null
          client_id: string
          client_source_id: string
          coverage_ratio?: number
          created_at?: string
          fingerprint?: string | null
          fresh_until?: string | null
          id?: string
          idempotency_key: string
          provenance?: Json
          retention_until?: string | null
          service_run_id: string
          snapshot_kind: string
          source_kind?: string
          status?: string
          tenant_id: string
        }
        Update: {
          captured_at?: string | null
          client_id?: string
          client_source_id?: string
          coverage_ratio?: number
          created_at?: string
          fingerprint?: string | null
          fresh_until?: string | null
          id?: string
          idempotency_key?: string
          provenance?: Json
          retention_until?: string | null
          service_run_id?: string
          snapshot_kind?: string
          source_kind?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_snapshots_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_snapshots_client_source_id_fkey"
            columns: ["client_source_id"]
            isOneToOne: false
            referencedRelation: "client_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_snapshots_service_run_id_fkey"
            columns: ["service_run_id"]
            isOneToOne: false
            referencedRelation: "service_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "portal_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      legacy_service_run_links: {
        Row: {
          client_id: string
          created_at: string
          id: string
          legacy_kind: string
          legacy_reference: string
          legacy_url: string | null
          linked_by: string | null
          migration_state: string
          review_reason: string | null
          service_run_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          legacy_kind: string
          legacy_reference: string
          legacy_url?: string | null
          linked_by?: string | null
          migration_state?: string
          review_reason?: string | null
          service_run_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          legacy_kind?: string
          legacy_reference?: string
          legacy_url?: string | null
          linked_by?: string | null
          migration_state?: string
          review_reason?: string | null
          service_run_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legacy_service_run_links_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legacy_service_run_links_service_run_id_fkey"
            columns: ["service_run_id"]
            isOneToOne: false
            referencedRelation: "service_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legacy_service_run_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "portal_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      migration_review_queue: {
        Row: {
          created_at: string
          evidence: Json
          id: string
          legacy_kind: string
          legacy_reference: string
          proposed_client_id: string | null
          proposed_service_run_id: string | null
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          state: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          evidence?: Json
          id?: string
          legacy_kind: string
          legacy_reference: string
          proposed_client_id?: string | null
          proposed_service_run_id?: string | null
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          state?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          evidence?: Json
          id?: string
          legacy_kind?: string
          legacy_reference?: string
          proposed_client_id?: string | null
          proposed_service_run_id?: string | null
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          state?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "migration_review_queue_proposed_client_id_fkey"
            columns: ["proposed_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "migration_review_queue_proposed_service_run_id_fkey"
            columns: ["proposed_service_run_id"]
            isOneToOne: false
            referencedRelation: "service_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "migration_review_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "portal_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      projection_shadow_comparisons: {
        Row: {
          client_id: string
          created_at: string
          discrepancies: Json
          id: string
          legacy_fingerprint: string
          legacy_kind: string
          legacy_reference: string
          legacy_score: number | null
          normalized_fingerprint: string
          normalized_score: number | null
          parity_state: string
          review_state: string
          reviewed_at: string | null
          reviewed_by: string | null
          service_run_id: string
          tenant_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          discrepancies?: Json
          id?: string
          legacy_fingerprint: string
          legacy_kind: string
          legacy_reference: string
          legacy_score?: number | null
          normalized_fingerprint: string
          normalized_score?: number | null
          parity_state: string
          review_state?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          service_run_id: string
          tenant_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          discrepancies?: Json
          id?: string
          legacy_fingerprint?: string
          legacy_kind?: string
          legacy_reference?: string
          legacy_score?: number | null
          normalized_fingerprint?: string
          normalized_score?: number | null
          parity_state?: string
          review_state?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          service_run_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projection_shadow_comparisons_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projection_shadow_comparisons_service_run_id_fkey"
            columns: ["service_run_id"]
            isOneToOne: false
            referencedRelation: "service_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projection_shadow_comparisons_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "portal_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_access_requests: {
        Row: {
          business_name: string | null
          id: string
          note: string | null
          requested_at: string
          requested_email: string
          requested_name: string
          status: string
        }
        Insert: {
          business_name?: string | null
          id?: string
          note?: string | null
          requested_at?: string
          requested_email: string
          requested_name: string
          status?: string
        }
        Update: {
          business_name?: string | null
          id?: string
          note?: string | null
          requested_at?: string
          requested_email?: string
          requested_name?: string
          status?: string
        }
        Relationships: []
      }
      portal_audit_runs: {
        Row: {
          client_id: string
          run: Json
          run_id: string
          source_kind: string
          state: Json
          updated_at: string
        }
        Insert: {
          client_id: string
          run: Json
          run_id: string
          source_kind?: string
          state: Json
          updated_at?: string
        }
        Update: {
          client_id?: string
          run?: Json
          run_id?: string
          source_kind?: string
          state?: Json
          updated_at?: string
        }
        Relationships: []
      }
      portal_chat_turns: {
        Row: {
          actions: Json
          assistant_message: string
          client_id: string | null
          created_at: string
          error: string | null
          id: string
          input_tokens: number | null
          latency_ms: number
          model: string | null
          outcome: Json
          output_tokens: number | null
          request_hash: string
          request_id: string
          session_id: string
          status: string
          tenant_id: string
          tool_activity: Json
          user_id: string
          user_message: string
        }
        Insert: {
          actions?: Json
          assistant_message?: string
          client_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          input_tokens?: number | null
          latency_ms: number
          model?: string | null
          outcome?: Json
          output_tokens?: number | null
          request_hash: string
          request_id: string
          session_id: string
          status?: string
          tenant_id: string
          tool_activity?: Json
          user_id: string
          user_message: string
        }
        Update: {
          actions?: Json
          assistant_message?: string
          client_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          input_tokens?: number | null
          latency_ms?: number
          model?: string | null
          outcome?: Json
          output_tokens?: number | null
          request_hash?: string
          request_id?: string
          session_id?: string
          status?: string
          tenant_id?: string
          tool_activity?: Json
          user_id?: string
          user_message?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_chat_turns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_chat_turns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "portal_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_tenant_memberships: {
        Row: {
          client_id: string | null
          created_at: string
          role: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          role: string
          tenant_id: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          role?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_tenant_memberships_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_tenant_memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "portal_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_tenants: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      process_exceptions: {
        Row: {
          client_id: string
          created_at: string
          exception_kind: string
          id: string
          idempotency_key: string
          owner_kind: string
          owner_user_id: string | null
          recovery_action: string
          resolved_at: string | null
          resolved_by: string | null
          retry_policy: Json
          service_run_id: string
          state: string
          summary: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          exception_kind: string
          id?: string
          idempotency_key: string
          owner_kind: string
          owner_user_id?: string | null
          recovery_action: string
          resolved_at?: string | null
          resolved_by?: string | null
          retry_policy?: Json
          service_run_id: string
          state?: string
          summary: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          exception_kind?: string
          id?: string
          idempotency_key?: string
          owner_kind?: string
          owner_user_id?: string | null
          recovery_action?: string
          resolved_at?: string | null
          resolved_by?: string | null
          retry_policy?: Json
          service_run_id?: string
          state?: string
          summary?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "process_exceptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_exceptions_service_run_id_fkey"
            columns: ["service_run_id"]
            isOneToOne: false
            referencedRelation: "service_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_exceptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "portal_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_workspace_state: {
        Row: {
          source_kind: string
          state: Json
          updated_at: string
          workspace_id: string
        }
        Insert: {
          source_kind?: string
          state: Json
          updated_at?: string
          workspace_id: string
        }
        Update: {
          source_kind?: string
          state?: Json
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      run_events: {
        Row: {
          completed_targets: number | null
          event_kind: string
          id: string
          idempotency_key: string
          message: string
          metadata: Json
          occurred_at: string
          service_run_id: string
          state: string | null
          tenant_id: string
          total_targets: number | null
        }
        Insert: {
          completed_targets?: number | null
          event_kind: string
          id?: string
          idempotency_key: string
          message?: string
          metadata?: Json
          occurred_at?: string
          service_run_id: string
          state?: string | null
          tenant_id: string
          total_targets?: number | null
        }
        Update: {
          completed_targets?: number | null
          event_kind?: string
          id?: string
          idempotency_key?: string
          message?: string
          metadata?: Json
          occurred_at?: string
          service_run_id?: string
          state?: string | null
          tenant_id?: string
          total_targets?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "run_events_service_run_id_fkey"
            columns: ["service_run_id"]
            isOneToOne: false
            referencedRelation: "service_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "run_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "portal_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_handoffs: {
        Row: {
          accepted_run_id: string | null
          approved_at: string | null
          approved_by: string | null
          client_id: string
          created_at: string
          destination_service_kind: string
          evidence_snapshot_ids: string[]
          id: string
          idempotency_key: string
          payload: Json
          projection_version: number
          source_service_run_id: string
          state: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          accepted_run_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          client_id: string
          created_at?: string
          destination_service_kind: string
          evidence_snapshot_ids?: string[]
          id?: string
          idempotency_key: string
          payload?: Json
          projection_version: number
          source_service_run_id: string
          state?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          accepted_run_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          client_id?: string
          created_at?: string
          destination_service_kind?: string
          evidence_snapshot_ids?: string[]
          id?: string
          idempotency_key?: string
          payload?: Json
          projection_version?: number
          source_service_run_id?: string
          state?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_handoffs_accepted_run_id_fkey"
            columns: ["accepted_run_id"]
            isOneToOne: false
            referencedRelation: "service_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_handoffs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_handoffs_source_service_run_id_fkey"
            columns: ["source_service_run_id"]
            isOneToOne: false
            referencedRelation: "service_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_handoffs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "portal_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_runs: {
        Row: {
          agent_definition_id: string | null
          agent_version: number | null
          baseline_run_id: string | null
          blocker_code: string | null
          blocker_summary: string | null
          cancelled_at: string | null
          checklist_version: number
          checkpoint: Json
          client_id: string
          completed_at: string | null
          completed_targets: number
          created_at: string
          id: string
          idempotency_key: string
          owner_user_id: string | null
          parent_run_id: string | null
          playbook_key: string
          playbook_version: number
          recheck_scope: string
          recovery_action: string | null
          run_kind: string
          selected_check_keys: string[]
          service_kind: string
          source_kind: string
          source_version: number
          started_at: string | null
          state: string
          tenant_id: string
          total_targets: number
          trigger_kind: string
          updated_at: string
          workflow_id: string | null
          workflow_token_expires_at: string | null
          workflow_token_hash: string | null
        }
        Insert: {
          agent_definition_id?: string | null
          agent_version?: number | null
          baseline_run_id?: string | null
          blocker_code?: string | null
          blocker_summary?: string | null
          cancelled_at?: string | null
          checklist_version: number
          checkpoint?: Json
          client_id: string
          completed_at?: string | null
          completed_targets?: number
          created_at?: string
          id?: string
          idempotency_key: string
          owner_user_id?: string | null
          parent_run_id?: string | null
          playbook_key: string
          playbook_version: number
          recheck_scope?: string
          recovery_action?: string | null
          run_kind: string
          selected_check_keys?: string[]
          service_kind: string
          source_kind?: string
          source_version: number
          started_at?: string | null
          state?: string
          tenant_id: string
          total_targets?: number
          trigger_kind: string
          updated_at?: string
          workflow_id?: string | null
          workflow_token_expires_at?: string | null
          workflow_token_hash?: string | null
        }
        Update: {
          agent_definition_id?: string | null
          agent_version?: number | null
          baseline_run_id?: string | null
          blocker_code?: string | null
          blocker_summary?: string | null
          cancelled_at?: string | null
          checklist_version?: number
          checkpoint?: Json
          client_id?: string
          completed_at?: string | null
          completed_targets?: number
          created_at?: string
          id?: string
          idempotency_key?: string
          owner_user_id?: string | null
          parent_run_id?: string | null
          playbook_key?: string
          playbook_version?: number
          recheck_scope?: string
          recovery_action?: string | null
          run_kind?: string
          selected_check_keys?: string[]
          service_kind?: string
          source_kind?: string
          source_version?: number
          started_at?: string | null
          state?: string
          tenant_id?: string
          total_targets?: number
          trigger_kind?: string
          updated_at?: string
          workflow_id?: string | null
          workflow_token_expires_at?: string | null
          workflow_token_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_runs_agent_definition_id_fkey"
            columns: ["agent_definition_id"]
            isOneToOne: false
            referencedRelation: "agent_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_runs_baseline_run_id_fkey"
            columns: ["baseline_run_id"]
            isOneToOne: false
            referencedRelation: "service_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_runs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_runs_parent_run_id_fkey"
            columns: ["parent_run_id"]
            isOneToOne: false
            referencedRelation: "service_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "portal_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_alerts: {
        Row: {
          alert_kind: string
          created_at: string
          id: string
          metadata: Json
          owner_user_id: string | null
          resolved_at: string | null
          service_run_id: string | null
          severity: string
          state: string
          summary: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          alert_kind: string
          created_at?: string
          id?: string
          metadata?: Json
          owner_user_id?: string | null
          resolved_at?: string | null
          service_run_id?: string | null
          severity?: string
          state?: string
          summary: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          alert_kind?: string
          created_at?: string
          id?: string
          metadata?: Json
          owner_user_id?: string | null
          resolved_at?: string | null
          service_run_id?: string | null
          severity?: string
          state?: string
          summary?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_alerts_service_run_id_fkey"
            columns: ["service_run_id"]
            isOneToOne: false
            referencedRelation: "service_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "portal_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_release_controls: {
        Row: {
          client_projection_source: string
          new_workflows_enabled: boolean
          pilot_client_id: string | null
          rollout_stage: string
          rollout_note: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          client_projection_source?: string
          new_workflows_enabled?: boolean
          pilot_client_id?: string | null
          rollout_stage?: string
          rollout_note?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          client_projection_source?: string
          new_workflows_enabled?: boolean
          pilot_client_id?: string | null
          rollout_stage?: string
          rollout_note?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_release_controls_pilot_client_id_fkey"
            columns: ["pilot_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_release_controls_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "portal_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_rollout_clients: {
        Row: {
          added_by: string | null
          client_id: string
          cohort_name: string
          created_at: string
          enabled: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          added_by?: string | null
          client_id: string
          cohort_name?: string
          created_at?: string
          enabled?: boolean
          tenant_id: string
          updated_at?: string
        }
        Update: {
          added_by?: string | null
          client_id?: string
          cohort_name?: string
          created_at?: string
          enabled?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_rollout_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_rollout_clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "portal_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      task_import_batches: {
        Row: {
          client_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_summary: string | null
          id: string
          idempotency_key: string
          imported_count: number
          row_count: number
          service_run_id: string | null
          source_kind: string
          source_reference: string
          state: string
          tenant_id: string
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_summary?: string | null
          id?: string
          idempotency_key: string
          imported_count?: number
          row_count?: number
          service_run_id?: string | null
          source_kind: string
          source_reference: string
          state?: string
          tenant_id: string
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_summary?: string | null
          id?: string
          idempotency_key?: string
          imported_count?: number
          row_count?: number
          service_run_id?: string | null
          source_kind?: string
          source_reference?: string
          state?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_import_batches_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_import_batches_service_run_id_fkey"
            columns: ["service_run_id"]
            isOneToOne: false
            referencedRelation: "service_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_import_batches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "portal_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      service_run_operational_metrics: {
        Row: {
          agent_latency_ms: number | null
          agent_tool_call_count: number | null
          agent_token_cost: number | null
          approval_turnaround_seconds: number | null
          check_throughput_per_minute: number | null
          client_id: string | null
          completed_targets: number | null
          coverage_ratio: number | null
          duration_seconds: number | null
          failure_class: string | null
          failure_count: number | null
          evidence_item_count: number | null
          no_op: boolean | null
          page_evidence_throughput_per_minute: number | null
          regression_count: number | null
          retry_count: number | null
          run_kind: string | null
          service_kind: string | null
          service_run_id: string | null
          state: string | null
          stage_duration_seconds: Json | null
          target_completion_ratio: number | null
          tenant_id: string | null
          total_targets: number | null
        }
        Relationships: [
          {
            foreignKeyName: "service_runs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "portal_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      review_agent_finding: {
        Args: {
          p_action: string
          p_exception_id: string
          p_rationale?: string | null
          p_status?: string | null
        }
        Returns: Json
      }
      workflow_begin_agent_run_context: {
        Args: {
          p_dispatch_token: string
          p_idempotency_key: string
          p_run_id: string
          p_snapshot_id: string
          p_stage_key: string
        }
        Returns: Json
      }
      workflow_capture_requirements: {
        Args: {
          p_dispatch_token: string
          p_run_id: string
        }
        Returns: Json
      }
      workflow_complete_agent_run: {
        Args: {
          p_agent_run_id: string
          p_dispatch_token: string
          p_latency_ms: number
          p_output: Json
          p_run_id: string
          p_state: string
          p_tool_trace: Json
        }
        Returns: Json
      }
      workflow_ensure_check_dependencies: {
        Args: {
          p_dependencies: Json
          p_dispatch_token: string
          p_run_id: string
        }
        Returns: number
      }
      workflow_record_sentinel: {
        Args: {
          p_dispatch_token: string
          p_fingerprint: string
          p_payload: Json
          p_run_id: string
        }
        Returns: Json
      }
      workflow_recheck_plan: {
        Args: {
          p_changed_dependencies?: Json
          p_dispatch_token: string
          p_run_id: string
        }
        Returns: Json
      }
      get_recheck_targets: {
        Args: {
          p_client_id: string
          p_service_kind: string
        }
        Returns: Json
      }
      create_client_with_baseline: {
        Args: {
          p_checklist_version?: number
          p_client_name: string
          p_client_slug: string
          p_event_key: string
          p_normalized_domain: string
          p_playbook_key?: string
          p_playbook_version?: number
          p_primary_contact_email?: string
          p_service_kind?: string
          p_sitemap_url?: string
          p_source_url: string
          p_tenant_id: string
        }
        Returns: {
          client_id: string
          client_source_id: string
          created: boolean
          service_run_id: string
        }[]
      }
      enroll_pilot_client_with_baseline: {
        Args: {
          p_client_name: string
          p_client_slug: string
          p_event_key: string
          p_normalized_domain: string
          p_primary_contact_email?: string
          p_rollout_note?: string
          p_service_kind?: string
          p_sitemap_url?: string
          p_source_url: string
          p_tenant_id: string
        }
        Returns: {
          client_id: string
          client_source_id: string
          created: boolean
          service_run_id: string
        }[]
      }
      prepare_service_run_dispatch: {
        Args: { p_run_id: string }
        Returns: {
          dispatch_token: string
          expires_at: string
        }[]
      }
      recover_stale_service_run: {
        Args: {
          p_run_id: string
          p_stale_after_seconds?: number
        }
        Returns: Json
      }
      revoke_agent_memory: {
        Args: {
          p_memory_id: string
          p_reason: string
        }
        Returns: Json
      }
      workflow_begin_evidence_snapshot: {
        Args: {
          p_dispatch_token: string
          p_idempotency_key: string
          p_provenance?: Json
          p_run_id: string
        }
        Returns: string
      }
      workflow_ensure_check_definitions: {
        Args: {
          p_definitions: Json
          p_dispatch_token: string
          p_run_id: string
        }
        Returns: number
      }
      workflow_evidence_bundle: {
        Args: {
          p_dispatch_token: string
          p_run_id: string
          p_snapshot_id: string
        }
        Returns: Json
      }
      workflow_finalize_evidence_snapshot: {
        Args: {
          p_coverage_ratio: number
          p_dispatch_token: string
          p_fingerprint: string
          p_run_id: string
          p_snapshot_id: string
          p_status: string
        }
        Returns: boolean
      }
      workflow_record_check_revisions: {
        Args: {
          p_dispatch_token: string
          p_results: Json
          p_run_id: string
          p_snapshot_id: string
        }
        Returns: Json
      }
      workflow_record_source_validation: {
        Args: {
          p_dispatch_token: string
          p_normalized_domain?: string | null
          p_run_id: string
          p_source_url?: string | null
          p_validation_message: string
          p_validation_state: string
        }
        Returns: boolean
      }
      workflow_service_run_context: {
        Args: {
          p_dispatch_token: string
          p_run_id: string
        }
        Returns: Json
      }
      workflow_store_evidence_item: {
        Args: {
          p_device_kind: string | null
          p_dispatch_token: string
          p_fingerprint: string
          p_fresh_until?: string
          p_payload: Json
          p_run_id: string
          p_snapshot_id: string
          p_source_kind: string
          p_source_locator: string
          p_status: string
        }
        Returns: string
      }
      workflow_transition_service_run: {
        Args: {
          p_blocker_code?: string
          p_blocker_summary?: string
          p_checkpoint?: Json
          p_completed_targets?: number
          p_dispatch_token: string
          p_event_key: string
          p_event_kind: string
          p_message: string
          p_recovery_action?: string
          p_run_id: string
          p_state: string
          p_total_targets?: number
          p_workflow_id?: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

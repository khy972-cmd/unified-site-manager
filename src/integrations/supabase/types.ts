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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      documents: {
        Row: {
          badge: string | null
          created_at: string
          doc_type: string
          file_ext: string | null
          file_path: string | null
          file_size: string | null
          file_url: string | null
          id: string
          search_vector: unknown
          site_id: string | null
          site_name: string | null
          title: string
          updated_at: string
          uploaded_by: string
          work_date: string | null
          worklog_id: string | null
        }
        Insert: {
          badge?: string | null
          created_at?: string
          doc_type: string
          file_ext?: string | null
          file_path?: string | null
          file_size?: string | null
          file_url?: string | null
          id?: string
          search_vector?: unknown
          site_id?: string | null
          site_name?: string | null
          title?: string
          updated_at?: string
          uploaded_by: string
          work_date?: string | null
          worklog_id?: string | null
        }
        Update: {
          badge?: string | null
          created_at?: string
          doc_type?: string
          file_ext?: string | null
          file_path?: string | null
          file_size?: string | null
          file_url?: string | null
          id?: string
          search_vector?: unknown
          site_id?: string | null
          site_name?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string
          work_date?: string | null
          worklog_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_worklog_id_fkey"
            columns: ["worklog_id"]
            isOneToOne: false
            referencedRelation: "worklogs"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_deployments: {
        Row: {
          affiliation: string | null
          contractor: string | null
          created_at: string
          deploy_date: string
          id: string
          note: string | null
          partner_user_id: string
          people_count: number
          site_id: string | null
          site_name: string
          status: string
          updated_at: string
        }
        Insert: {
          affiliation?: string | null
          contractor?: string | null
          created_at?: string
          deploy_date?: string
          id?: string
          note?: string | null
          partner_user_id: string
          people_count?: number
          site_id?: string | null
          site_name?: string
          status?: string
          updated_at?: string
        }
        Update: {
          affiliation?: string | null
          contractor?: string | null
          created_at?: string
          deploy_date?: string
          id?: string
          note?: string | null
          partner_user_id?: string
          people_count?: number
          site_id?: string | null
          site_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_deployments_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          affiliation: string | null
          created_at: string
          id: string
          name: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          affiliation?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          affiliation?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      punch_groups: {
        Row: {
          affiliation: string | null
          author: string | null
          contractor: string | null
          created_at: string
          created_by: string
          id: string
          punch_date: string
          punch_time: string | null
          search_vector: unknown
          site_id: string | null
          site_name: string
          status: string
          updated_at: string
        }
        Insert: {
          affiliation?: string | null
          author?: string | null
          contractor?: string | null
          created_at?: string
          created_by: string
          id?: string
          punch_date?: string
          punch_time?: string | null
          search_vector?: unknown
          site_id?: string | null
          site_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          affiliation?: string | null
          author?: string | null
          contractor?: string | null
          created_at?: string
          created_by?: string
          id?: string
          punch_date?: string
          punch_time?: string | null
          search_vector?: unknown
          site_id?: string | null
          site_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "punch_groups_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      punch_items: {
        Row: {
          after_photo: string | null
          assignee: string | null
          before_photo: string | null
          created_at: string
          due_date: string | null
          group_id: string
          id: string
          issue: string | null
          location: string | null
          priority: string
          status: string
          updated_at: string
        }
        Insert: {
          after_photo?: string | null
          assignee?: string | null
          before_photo?: string | null
          created_at?: string
          due_date?: string | null
          group_id: string
          id?: string
          issue?: string | null
          location?: string | null
          priority?: string
          status?: string
          updated_at?: string
        }
        Update: {
          after_photo?: string | null
          assignee?: string | null
          before_photo?: string | null
          created_at?: string
          due_date?: string | null
          group_id?: string
          id?: string
          issue?: string | null
          location?: string | null
          priority?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "punch_items_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "punch_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      site_members: {
        Row: {
          created_at: string
          id: string
          role: string
          site_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          site_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          site_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_members_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          address: string | null
          created_at: string
          created_by: string | null
          end_date: string | null
          id: string
          manager_name: string | null
          manager_phone: string | null
          name: string
          search_vector: unknown
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          manager_name?: string | null
          manager_phone?: string | null
          name: string
          search_vector?: unknown
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          manager_name?: string | null
          manager_phone?: string | null
          name?: string
          search_vector?: unknown
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      worklog_manpower: {
        Row: {
          id: string
          is_custom: boolean | null
          locked: boolean | null
          work_hours: number
          worker_name: string
          worklog_id: string
        }
        Insert: {
          id?: string
          is_custom?: boolean | null
          locked?: boolean | null
          work_hours?: number
          worker_name: string
          worklog_id: string
        }
        Update: {
          id?: string
          is_custom?: boolean | null
          locked?: boolean | null
          work_hours?: number
          worker_name?: string
          worklog_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worklog_manpower_worklog_id_fkey"
            columns: ["worklog_id"]
            isOneToOne: false
            referencedRelation: "worklogs"
            referencedColumns: ["id"]
          },
        ]
      }
      worklog_materials: {
        Row: {
          id: string
          name: string
          qty: number
          worklog_id: string
        }
        Insert: {
          id?: string
          name: string
          qty?: number
          worklog_id: string
        }
        Update: {
          id?: string
          name?: string
          qty?: number
          worklog_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worklog_materials_worklog_id_fkey"
            columns: ["worklog_id"]
            isOneToOne: false
            referencedRelation: "worklogs"
            referencedColumns: ["id"]
          },
        ]
      }
      worklog_worksets: {
        Row: {
          block: string | null
          dong: string | null
          floor: string | null
          id: string
          member: string | null
          process: string | null
          work_type: string | null
          worklog_id: string
        }
        Insert: {
          block?: string | null
          dong?: string | null
          floor?: string | null
          id?: string
          member?: string | null
          process?: string | null
          work_type?: string | null
          worklog_id: string
        }
        Update: {
          block?: string | null
          dong?: string | null
          floor?: string | null
          id?: string
          member?: string | null
          process?: string | null
          work_type?: string | null
          worklog_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worklog_worksets_worklog_id_fkey"
            columns: ["worklog_id"]
            isOneToOne: false
            referencedRelation: "worklogs"
            referencedColumns: ["id"]
          },
        ]
      }
      worklogs: {
        Row: {
          created_at: string
          created_by: string
          dept: string | null
          id: string
          search_vector: unknown
          site_id: string
          site_name: string
          status: string
          updated_at: string
          version: number
          weather: string | null
          work_date: string
        }
        Insert: {
          created_at?: string
          created_by: string
          dept?: string | null
          id?: string
          search_vector?: unknown
          site_id: string
          site_name: string
          status?: string
          updated_at?: string
          version?: number
          weather?: string | null
          work_date: string
        }
        Update: {
          created_at?: string
          created_by?: string
          dept?: string | null
          id?: string
          search_vector?: unknown
          site_id?: string
          site_name?: string
          status?: string
          updated_at?: string
          version?: number
          weather?: string | null
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "worklogs_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_punch_group_site_id: { Args: { _group_id: string }; Returns: string }
      get_worklog_site_id: { Args: { _worklog_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_site_member: {
        Args: { _site_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "worker" | "partner"
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
    Enums: {
      app_role: ["admin", "worker", "partner"],
    },
  },
} as const

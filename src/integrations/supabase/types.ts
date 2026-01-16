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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      app_configurations: {
        Row: {
          config_data: Json
          config_type: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          config_data?: Json
          config_type: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          config_data?: Json
          config_type?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      auto_merge_history: {
        Row: {
          ai_score: number | null
          ai_threshold: number | null
          created_at: string
          decision: string | null
          details: string | null
          id: string
          mode: string | null
          pr_number: number
          sonar_issues: number | null
          sonar_threshold: number | null
        }
        Insert: {
          ai_score?: number | null
          ai_threshold?: number | null
          created_at?: string
          decision?: string | null
          details?: string | null
          id?: string
          mode?: string | null
          pr_number: number
          sonar_issues?: number | null
          sonar_threshold?: number | null
        }
        Update: {
          ai_score?: number | null
          ai_threshold?: number | null
          created_at?: string
          decision?: string | null
          details?: string | null
          id?: string
          mode?: string | null
          pr_number?: number
          sonar_issues?: number | null
          sonar_threshold?: number | null
        }
        Relationships: []
      }
      merge_conflict_resolutions: {
        Row: {
          ai_analysis: string | null
          conflict_content: string | null
          created_at: string
          file_path: string
          has_business_logic: boolean | null
          id: string
          pr_number: number
          resolution_strategy: string | null
          resolved_content: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          ai_analysis?: string | null
          conflict_content?: string | null
          created_at?: string
          file_path: string
          has_business_logic?: boolean | null
          id?: string
          pr_number: number
          resolution_strategy?: string | null
          resolved_content?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          ai_analysis?: string | null
          conflict_content?: string | null
          created_at?: string
          file_path?: string
          has_business_logic?: boolean | null
          id?: string
          pr_number?: number
          resolution_strategy?: string | null
          resolved_content?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pr_comment_ids: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          owner: string
          pr_number: number
          repo: string
          updated_at: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          owner: string
          pr_number: number
          repo: string
          updated_at?: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          owner?: string
          pr_number?: number
          repo?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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

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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      analysis_sessions: {
        Row: {
          analysis_data: Json | null
          created_at: string | null
          feedback_data: Json | null
          id: string
          overall_score: number | null
          skill_level: Database["public"]["Enums"]["skill_level"]
          status: string | null
          technique: Database["public"]["Enums"]["surf_technique"]
          updated_at: string | null
          user_id: string
          video_url: string | null
          wave_type: Database["public"]["Enums"]["wave_type"]
        }
        Insert: {
          analysis_data?: Json | null
          created_at?: string | null
          feedback_data?: Json | null
          id?: string
          overall_score?: number | null
          skill_level: Database["public"]["Enums"]["skill_level"]
          status?: string | null
          technique: Database["public"]["Enums"]["surf_technique"]
          updated_at?: string | null
          user_id: string
          video_url?: string | null
          wave_type: Database["public"]["Enums"]["wave_type"]
        }
        Update: {
          analysis_data?: Json | null
          created_at?: string | null
          feedback_data?: Json | null
          id?: string
          overall_score?: number | null
          skill_level?: Database["public"]["Enums"]["skill_level"]
          status?: string | null
          technique?: Database["public"]["Enums"]["surf_technique"]
          updated_at?: string | null
          user_id?: string
          video_url?: string | null
          wave_type?: Database["public"]["Enums"]["wave_type"]
        }
        Relationships: []
      }
      reference_videos: {
        Row: {
          analysis_data: Json | null
          created_at: string
          frame_analysis: Json | null
          id: string
          is_training_data: boolean | null
          notes: string | null
          quality_score: number
          skill_level: string
          surfer_name: string
          technique: string
          title: string
          updated_at: string
          video_url: string
          wave_type: string
        }
        Insert: {
          analysis_data?: Json | null
          created_at?: string
          frame_analysis?: Json | null
          id?: string
          is_training_data?: boolean | null
          notes?: string | null
          quality_score: number
          skill_level?: string
          surfer_name: string
          technique?: string
          title: string
          updated_at?: string
          video_url: string
          wave_type?: string
        }
        Update: {
          analysis_data?: Json | null
          created_at?: string
          frame_analysis?: Json | null
          id?: string
          is_training_data?: boolean | null
          notes?: string | null
          quality_score?: number
          skill_level?: string
          surfer_name?: string
          technique?: string
          title?: string
          updated_at?: string
          video_url?: string
          wave_type?: string
        }
        Relationships: []
      }
      technique_metrics: {
        Row: {
          acceptable_max: number
          acceptable_min: number
          created_at: string
          excellent_max: number
          excellent_min: number
          good_max: number
          good_min: number
          id: string
          metric_name: string
          pro_average: number
          pro_std_deviation: number
          technique: string
        }
        Insert: {
          acceptable_max: number
          acceptable_min: number
          created_at?: string
          excellent_max: number
          excellent_min: number
          good_max: number
          good_min: number
          id?: string
          metric_name: string
          pro_average: number
          pro_std_deviation: number
          technique: string
        }
        Update: {
          acceptable_max?: number
          acceptable_min?: number
          created_at?: string
          excellent_max?: number
          excellent_min?: number
          good_max?: number
          good_min?: number
          id?: string
          metric_name?: string
          pro_average?: number
          pro_std_deviation?: number
          technique?: string
        }
        Relationships: []
      }
      technique_standards: {
        Row: {
          acceptable_max: number | null
          acceptable_min: number | null
          created_at: string | null
          description: string | null
          good_max: number | null
          good_min: number | null
          id: string
          ideal_max: number | null
          ideal_min: number | null
          metric_name: string
          skill_level: Database["public"]["Enums"]["skill_level"]
          technique: Database["public"]["Enums"]["surf_technique"]
          units: string | null
          wave_type: Database["public"]["Enums"]["wave_type"]
        }
        Insert: {
          acceptable_max?: number | null
          acceptable_min?: number | null
          created_at?: string | null
          description?: string | null
          good_max?: number | null
          good_min?: number | null
          id?: string
          ideal_max?: number | null
          ideal_min?: number | null
          metric_name: string
          skill_level: Database["public"]["Enums"]["skill_level"]
          technique: Database["public"]["Enums"]["surf_technique"]
          units?: string | null
          wave_type: Database["public"]["Enums"]["wave_type"]
        }
        Update: {
          acceptable_max?: number | null
          acceptable_min?: number | null
          created_at?: string | null
          description?: string | null
          good_max?: number | null
          good_min?: number | null
          id?: string
          ideal_max?: number | null
          ideal_min?: number | null
          metric_name?: string
          skill_level?: Database["public"]["Enums"]["skill_level"]
          technique?: Database["public"]["Enums"]["surf_technique"]
          units?: string | null
          wave_type?: Database["public"]["Enums"]["wave_type"]
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string | null
          id: string
          preferred_wave_type: Database["public"]["Enums"]["wave_type"] | null
          skill_level: Database["public"]["Enums"]["skill_level"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          preferred_wave_type?: Database["public"]["Enums"]["wave_type"] | null
          skill_level?: Database["public"]["Enums"]["skill_level"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          preferred_wave_type?: Database["public"]["Enums"]["wave_type"] | null
          skill_level?: Database["public"]["Enums"]["skill_level"]
          updated_at?: string | null
          user_id?: string
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
      skill_level: "beginner" | "intermediate" | "advanced" | "pro"
      surf_technique: "bottom_turn" | "cutback" | "top_turn" | "tube_ride"
      wave_type: "beach_break" | "point_break" | "reef_break"
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
      skill_level: ["beginner", "intermediate", "advanced", "pro"],
      surf_technique: ["bottom_turn", "cutback", "top_turn", "tube_ride"],
      wave_type: ["beach_break", "point_break", "reef_break"],
    },
  },
} as const

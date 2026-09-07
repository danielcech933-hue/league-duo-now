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
      analytics_events: {
        Row: {
          created_at: string
          id: string
          name: string
          props: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          props?: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          props?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      blocks: {
        Row: {
          blocked: string
          blocker: string
          created_at: string
        }
        Insert: {
          blocked: string
          blocker: string
          created_at?: string
        }
        Update: {
          blocked?: string
          blocker?: string
          created_at?: string
        }
        Relationships: []
      }
      conversation_members: {
        Row: {
          conversation_id: string
          joined_at: string
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          match_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          match_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          match_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
        }
        Relationships: []
      }
      live_sessions: {
        Row: {
          ended_at: string | null
          game_mode: string
          games_planned: number
          id: string
          languages: string[]
          last_seen_at: string
          note: string | null
          playstyle: string
          primary_role: string
          rank_range: string
          rank_snapshot: string | null
          region: string
          secondary_role: string
          started_at: string
          status: string
          user_id: string
          voice: string
        }
        Insert: {
          ended_at?: string | null
          game_mode?: string
          games_planned?: number
          id?: string
          languages?: string[]
          last_seen_at?: string
          note?: string | null
          playstyle?: string
          primary_role?: string
          rank_range?: string
          rank_snapshot?: string | null
          region?: string
          secondary_role?: string
          started_at?: string
          status?: string
          user_id: string
          voice?: string
        }
        Update: {
          ended_at?: string | null
          game_mode?: string
          games_planned?: number
          id?: string
          languages?: string[]
          last_seen_at?: string
          note?: string | null
          playstyle?: string
          primary_role?: string
          rank_range?: string
          rank_snapshot?: string | null
          region?: string
          secondary_role?: string
          started_at?: string
          status?: string
          user_id?: string
          voice?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          created_at: string
          id: string
          score: number
          status: string
          updated_at: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          score?: number
          status?: string
          updated_at?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          score?: number
          status?: string
          updated_at?: string
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json
          id: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      player_preferences: {
        Row: {
          game_mode: string
          languages: string[]
          playstyle: string
          rank_range: string
          region_lock: boolean
          roles_wanted: string[]
          session_length: number
          updated_at: string
          user_id: string
          voice_pref: string
        }
        Insert: {
          game_mode?: string
          languages?: string[]
          playstyle?: string
          rank_range?: string
          region_lock?: boolean
          roles_wanted?: string[]
          session_length?: number
          updated_at?: string
          user_id: string
          voice_pref?: string
        }
        Update: {
          game_mode?: string
          languages?: string[]
          playstyle?: string
          rank_range?: string
          region_lock?: boolean
          roles_wanted?: string[]
          session_length?: number
          updated_at?: string
          user_id?: string
          voice_pref?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          id: string
          is_banned: boolean
          languages: string[]
          onboarded: boolean
          play_times: string[]
          playstyle: string
          primary_role: string
          region: string
          secondary_role: string
          suspended_until: string | null
          updated_at: string
          voice: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          id: string
          is_banned?: boolean
          languages?: string[]
          onboarded?: boolean
          play_times?: string[]
          playstyle?: string
          primary_role?: string
          region?: string
          secondary_role?: string
          suspended_until?: string | null
          updated_at?: string
          voice?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_banned?: boolean
          languages?: string[]
          onboarded?: boolean
          play_times?: string[]
          playstyle?: string
          primary_role?: string
          region?: string
          secondary_role?: string
          suspended_until?: string | null
          updated_at?: string
          voice?: string
        }
        Relationships: []
      }
      ratings: {
        Row: {
          created_at: string
          id: string
          match_id: string
          rated: string
          rater: string
          tags: string[]
          verdict: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          rated: string
          rater: string
          tags?: string[]
          verdict: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          rated?: string
          rater?: string
          tags?: string[]
          verdict?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reported: string
          reporter: string
          status: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reported: string
          reporter: string
          status?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reported?: string
          reporter?: string
          status?: string
        }
        Relationships: []
      }
      riot_accounts: {
        Row: {
          created_at: string
          game_name: string
          id: string
          league_points: number | null
          losses: number | null
          profile_level: number | null
          puuid: string | null
          rank_division: string | null
          rank_tier: string | null
          region: string
          synced_at: string | null
          tag_line: string
          top_champions: string[] | null
          updated_at: string
          user_id: string
          verified: boolean
          wins: number | null
        }
        Insert: {
          created_at?: string
          game_name: string
          id?: string
          league_points?: number | null
          losses?: number | null
          profile_level?: number | null
          puuid?: string | null
          rank_division?: string | null
          rank_tier?: string | null
          region: string
          synced_at?: string | null
          tag_line: string
          top_champions?: string[] | null
          updated_at?: string
          user_id: string
          verified?: boolean
          wins?: number | null
        }
        Update: {
          created_at?: string
          game_name?: string
          id?: string
          league_points?: number | null
          losses?: number | null
          profile_level?: number | null
          puuid?: string | null
          rank_division?: string | null
          rank_tier?: string | null
          region?: string
          synced_at?: string | null
          tag_line?: string
          top_champions?: string[] | null
          updated_at?: string
          user_id?: string
          verified?: boolean
          wins?: number | null
        }
        Relationships: []
      }
      swipes: {
        Row: {
          action: string
          created_at: string
          from_user: string
          id: string
          to_user: string
        }
        Insert: {
          action: string
          created_at?: string
          from_user: string
          id?: string
          to_user: string
        }
        Update: {
          action?: string
          created_at?: string
          from_user?: string
          id?: string
          to_user?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_conversation_member: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const

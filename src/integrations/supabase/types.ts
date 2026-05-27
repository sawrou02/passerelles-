export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      admin_actions: {
        Row: {
          action: string;
          admin_id: string;
          created_at: string;
          duration_days: number | null;
          id: string;
          note: string | null;
          reason: string | null;
          target_user_id: string;
        };
        Insert: {
          action: string;
          admin_id: string;
          created_at?: string;
          duration_days?: number | null;
          id?: string;
          note?: string | null;
          reason?: string | null;
          target_user_id: string;
        };
        Update: {
          action?: string;
          admin_id?: string;
          created_at?: string;
          duration_days?: number | null;
          id?: string;
          note?: string | null;
          reason?: string | null;
          target_user_id?: string;
        };
        Relationships: [];
      };
      blocked_users: {
        Row: {
          blocked_id: string;
          blocker_id: string;
          created_at: string;
          id: string;
        };
        Insert: {
          blocked_id: string;
          blocker_id: string;
          created_at?: string;
          id?: string;
        };
        Update: {
          blocked_id?: string;
          blocker_id?: string;
          created_at?: string;
          id?: string;
        };
        Relationships: [];
      };
      book_requests: {
        Row: {
          book_id: string;
          created_at: string;
          id: string;
          requester_id: string;
          requester_name: string;
          status: string;
        };
        Insert: {
          book_id: string;
          created_at?: string;
          id?: string;
          requester_id: string;
          requester_name: string;
          status?: string;
        };
        Update: {
          book_id?: string;
          created_at?: string;
          id?: string;
          requester_id?: string;
          requester_name?: string;
          status?: string;
        };
        Relationships: [];
      };
      books: {
        Row: {
          can_deliver: boolean;
          category: string;
          city: string;
          condition: string;
          created_at: string;
          description: string | null;
          id: string;
          image_url: string;
          is_donation: boolean;
          language: string;
          price: number;
          reserved_at: string | null;
          reserved_by: string | null;
          seller_id: string;
          seller_name: string;
          status: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          can_deliver?: boolean;
          category: string;
          city: string;
          condition: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          image_url: string;
          is_donation?: boolean;
          language?: string;
          price?: number;
          reserved_at?: string | null;
          reserved_by?: string | null;
          seller_id: string;
          seller_name: string;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          can_deliver?: boolean;
          category?: string;
          city?: string;
          condition?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          image_url?: string;
          is_donation?: boolean;
          language?: string;
          price?: number;
          reserved_at?: string | null;
          reserved_by?: string | null;
          seller_id?: string;
          seller_name?: string;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      charte_settings: {
        Row: {
          current_version: string;
          id: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          current_version?: string;
          id?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          current_version?: string;
          id?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      chats: {
        Row: {
          archived_by_user1: boolean;
          archived_by_user2: boolean;
          archived_for: string[];
          book_id: string | null;
          book_image_url: string | null;
          book_title: string | null;
          created_at: string;
          deleted_by_user1: boolean;
          deleted_by_user2: boolean;
          deleted_for: string[];
          id: string;
          last_message: string | null;
          last_message_at: string | null;
          muted_for: string[];
          participants: string[];
          unread_by: string[] | null;
        };
        Insert: {
          archived_by_user1?: boolean;
          archived_by_user2?: boolean;
          archived_for?: string[];
          book_id?: string | null;
          book_image_url?: string | null;
          book_title?: string | null;
          created_at?: string;
          deleted_by_user1?: boolean;
          deleted_by_user2?: boolean;
          deleted_for?: string[];
          id?: string;
          last_message?: string | null;
          last_message_at?: string | null;
          muted_for?: string[];
          participants: string[];
          unread_by?: string[] | null;
        };
        Update: {
          archived_by_user1?: boolean;
          archived_by_user2?: boolean;
          archived_for?: string[];
          book_id?: string | null;
          book_image_url?: string | null;
          book_title?: string | null;
          created_at?: string;
          deleted_by_user1?: boolean;
          deleted_by_user2?: boolean;
          deleted_for?: string[];
          id?: string;
          last_message?: string | null;
          last_message_at?: string | null;
          muted_for?: string[];
          participants?: string[];
          unread_by?: string[] | null;
        };
        Relationships: [
          {
            foreignKeyName: "chats_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
        ];
      };
      contact_messages: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          is_read: boolean;
          message: string;
          name: string;
          subject: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          is_read?: boolean;
          message: string;
          name: string;
          subject: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          is_read?: boolean;
          message?: string;
          name?: string;
          subject?: string;
        };
        Relationships: [];
      };
      email_throttle: {
        Row: {
          context_id: string | null;
          email_type: string;
          id: string;
          sent_at: string;
          user_id: string;
        };
        Insert: {
          context_id?: string | null;
          email_type: string;
          id?: string;
          sent_at?: string;
          user_id: string;
        };
        Update: {
          context_id?: string | null;
          email_type?: string;
          id?: string;
          sent_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      favorites: {
        Row: {
          book_id: string;
          created_at: string;
          id: string;
          user_id: string;
        };
        Insert: {
          book_id: string;
          created_at?: string;
          id?: string;
          user_id: string;
        };
        Update: {
          book_id?: string;
          created_at?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      follows: {
        Row: {
          created_at: string;
          follower_id: string;
          following_id: string;
          id: string;
        };
        Insert: {
          created_at?: string;
          follower_id: string;
          following_id: string;
          id?: string;
        };
        Update: {
          created_at?: string;
          follower_id?: string;
          following_id?: string;
          id?: string;
        };
        Relationships: [];
      };
      global_notifications: {
        Row: {
          created_at: string;
          created_by: string;
          id: string;
          message: string;
          titre: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          id?: string;
          message: string;
          titre: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          id?: string;
          message?: string;
          titre?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          chat_id: string;
          created_at: string;
          deleted_at: string | null;
          deleted_by: string | null;
          deleted_for_everyone: boolean;
          hidden_for: string[];
          id: string;
          read_at: string | null;
          sender_id: string;
          sender_name: string;
          text: string;
        };
        Insert: {
          chat_id: string;
          created_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
          deleted_for_everyone?: boolean;
          hidden_for?: string[];
          id?: string;
          read_at?: string | null;
          sender_id: string;
          sender_name: string;
          text: string;
        };
        Update: {
          chat_id?: string;
          created_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
          deleted_for_everyone?: boolean;
          hidden_for?: string[];
          id?: string;
          read_at?: string | null;
          sender_id?: string;
          sender_name?: string;
          text?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey";
            columns: ["chat_id"];
            isOneToOne: false;
            referencedRelation: "chats";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string;
          id: string;
          is_read: boolean;
          link: string | null;
          message: string;
          type: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_read?: boolean;
          link?: string | null;
          message: string;
          type?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_read?: boolean;
          link?: string | null;
          message?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      phone_verifications: {
        Row: {
          attempts: number;
          code: string;
          created_at: string;
          expires_at: string;
          last_sent_at: string;
          phone: string;
          user_id: string;
        };
        Insert: {
          attempts?: number;
          code: string;
          created_at?: string;
          expires_at: string;
          last_sent_at?: string;
          phone: string;
          user_id: string;
        };
        Update: {
          attempts?: number;
          code?: string;
          created_at?: string;
          expires_at?: string;
          last_sent_at?: string;
          phone?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          ban_reason: string | null;
          banned_at: string | null;
          banned_by: string | null;
          birthdate: string | null;
          charte_accepted: boolean;
          charte_accepted_at: string | null;
          charte_version: string | null;
          city: string | null;
          created_at: string;
          display_name: string | null;
          followers_count: number;
          id: string;
          is_banned: boolean;
          is_online: boolean;
          is_suspended: boolean;
          is_verified: boolean;
          last_seen: string;
          notify_admin: boolean;
          notify_email: boolean;
          notify_followers: boolean;
          notify_messages: boolean;
          notify_push: boolean;
          notify_reservations: boolean;
          notify_sms: boolean;
          phone: string | null;
          phone_verified: boolean;
          phone_visible: boolean;
          suspended_until: string | null;
          suspension_reason: string | null;
          title: string | null;
          unsubscribed_all: boolean;
          updated_at: string;
          verified: boolean;
          warning_count: number;
        };
        Insert: {
          avatar_url?: string | null;
          ban_reason?: string | null;
          banned_at?: string | null;
          banned_by?: string | null;
          birthdate?: string | null;
          charte_accepted?: boolean;
          charte_accepted_at?: string | null;
          charte_version?: string | null;
          city?: string | null;
          created_at?: string;
          display_name?: string | null;
          followers_count?: number;
          id: string;
          is_banned?: boolean;
          is_online?: boolean;
          is_suspended?: boolean;
          is_verified?: boolean;
          last_seen?: string;
          notify_admin?: boolean;
          notify_email?: boolean;
          notify_followers?: boolean;
          notify_messages?: boolean;
          notify_push?: boolean;
          notify_reservations?: boolean;
          notify_sms?: boolean;
          phone?: string | null;
          phone_verified?: boolean;
          phone_visible?: boolean;
          suspended_until?: string | null;
          suspension_reason?: string | null;
          title?: string | null;
          unsubscribed_all?: boolean;
          updated_at?: string;
          verified?: boolean;
          warning_count?: number;
        };
        Update: {
          avatar_url?: string | null;
          ban_reason?: string | null;
          banned_at?: string | null;
          banned_by?: string | null;
          birthdate?: string | null;
          charte_accepted?: boolean;
          charte_accepted_at?: string | null;
          charte_version?: string | null;
          city?: string | null;
          created_at?: string;
          display_name?: string | null;
          followers_count?: number;
          id?: string;
          is_banned?: boolean;
          is_online?: boolean;
          is_suspended?: boolean;
          is_verified?: boolean;
          last_seen?: string;
          notify_admin?: boolean;
          notify_email?: boolean;
          notify_followers?: boolean;
          notify_messages?: boolean;
          notify_push?: boolean;
          notify_reservations?: boolean;
          notify_sms?: boolean;
          phone?: string | null;
          phone_verified?: boolean;
          phone_visible?: boolean;
          suspended_until?: string | null;
          suspension_reason?: string | null;
          title?: string | null;
          unsubscribed_all?: boolean;
          updated_at?: string;
          verified?: boolean;
          warning_count?: number;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          book_id: string | null;
          chat_id: string | null;
          created_at: string;
          description: string | null;
          id: string;
          raison: string;
          reported_id: string | null;
          reporter_id: string;
          statut: string;
          updated_at: string;
        };
        Insert: {
          book_id?: string | null;
          chat_id?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          raison: string;
          reported_id?: string | null;
          reporter_id: string;
          statut?: string;
          updated_at?: string;
        };
        Update: {
          book_id?: string | null;
          chat_id?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          raison?: string;
          reported_id?: string | null;
          reporter_id?: string;
          statut?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          chat_id: string | null;
          comment: string | null;
          created_at: string;
          id: string;
          rating: number;
          reviewer_id: string;
          reviewer_name: string;
          seller_id: string;
        };
        Insert: {
          chat_id?: string | null;
          comment?: string | null;
          created_at?: string;
          id?: string;
          rating: number;
          reviewer_id: string;
          reviewer_name: string;
          seller_id: string;
        };
        Update: {
          chat_id?: string | null;
          comment?: string | null;
          created_at?: string;
          id?: string;
          rating?: number;
          reviewer_id?: string;
          reviewer_name?: string;
          seller_id?: string;
        };
        Relationships: [];
      };
      search_history: {
        Row: {
          created_at: string;
          id: string;
          query: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          query: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          query?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      _is_target_admin: { Args: { _uid: string }; Returns: boolean };
      _require_admin: { Args: never; Returns: undefined };
      accept_charte: { Args: never; Returns: undefined };
      admin_ban_user: {
        Args: { _reason: string; _target: string };
        Returns: undefined;
      };
      admin_delete_user: {
        Args: { _confirm: string; _note: string; _target: string };
        Returns: undefined;
      };
      admin_send_message: {
        Args: { _target: string; _text: string };
        Returns: string;
      };
      admin_set_charte_version: {
        Args: { _version: string };
        Returns: undefined;
      };
      admin_set_verified: {
        Args: { _target: string; _value: boolean };
        Returns: undefined;
      };
      admin_suspend_user: {
        Args: { _days: number; _reason: string; _target: string };
        Returns: undefined;
      };
      admin_unban_user: {
        Args: { _note: string; _target: string };
        Returns: undefined;
      };
      admin_unsuspend_user: {
        Args: { _note: string; _target: string };
        Returns: undefined;
      };
      admin_warn_user: {
        Args: { _reason: string; _target: string };
        Returns: undefined;
      };
      is_blocked_by: {
        Args: { _blocked: string; _blocker: string };
        Returns: boolean;
      };
      is_user_sanctioned: { Args: { _uid: string }; Returns: boolean };
      notify_user_action: {
        Args: {
          _link?: string;
          _message: string;
          _type?: string;
          _user_id: string;
        };
        Returns: undefined;
      };
      send_global_notification: {
        Args: { _link?: string; _message: string };
        Returns: number;
      };
      verify_phone_code: { Args: { _code: string }; Returns: boolean };
    };
    Enums: {
      app_role: "admin" | "user";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const;

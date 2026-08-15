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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      additional_money_requests: {
        Row: {
          approved_amount: number | null
          category_id: string
          created_at: string
          id: string
          month: string
          parent_note: string | null
          reason: string
          requested_amount: number
          son_id: string
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
        }
        Insert: {
          approved_amount?: number | null
          category_id: string
          created_at?: string
          id?: string
          month: string
          parent_note?: string | null
          reason: string
          requested_amount: number
          son_id: string
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Update: {
          approved_amount?: number | null
          category_id?: string
          created_at?: string
          id?: string
          month?: string
          parent_note?: string | null
          reason?: string
          requested_amount?: number
          son_id?: string
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "additional_money_requests_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "additional_money_requests_son_id_fkey"
            columns: ["son_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string
          amount: number | null
          created_at: string
          details: Json
          entity: string
          entity_id: string | null
          id: string
          subject_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string
          amount?: number | null
          created_at?: string
          details?: Json
          entity: string
          entity_id?: string | null
          id?: string
          subject_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string
          amount?: number | null
          created_at?: string
          details?: Json
          entity?: string
          entity_id?: string | null
          id?: string
          subject_id?: string | null
        }
        Relationships: []
      }
      budget_items: {
        Row: {
          approved_amount: number | null
          category_id: string
          created_at: string
          description: string
          id: string
          parent_note: string | null
          plan_id: string
          requested_amount: number
          status: Database["public"]["Enums"]["item_status"]
          updated_at: string
        }
        Insert: {
          approved_amount?: number | null
          category_id: string
          created_at?: string
          description?: string
          id?: string
          parent_note?: string | null
          plan_id: string
          requested_amount: number
          status?: Database["public"]["Enums"]["item_status"]
          updated_at?: string
        }
        Update: {
          approved_amount?: number | null
          category_id?: string
          created_at?: string
          description?: string
          id?: string
          parent_note?: string | null
          plan_id?: string
          requested_amount?: number
          status?: Database["public"]["Enums"]["item_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "budget_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_plans: {
        Row: {
          created_at: string
          id: string
          month: string
          parent_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          son_id: string
          status: Database["public"]["Enums"]["plan_status"]
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          month: string
          parent_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          son_id: string
          status?: Database["public"]["Enums"]["plan_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          month?: string
          parent_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          son_id?: string
          status?: Database["public"]["Enums"]["plan_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_plans_son_id_fkey"
            columns: ["son_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      expense_revisions: {
        Row: {
          changed_by: string | null
          created_at: string
          expense_id: string
          id: string
          note: string | null
          snapshot: Json
          son_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          expense_id: string
          id?: string
          note?: string | null
          snapshot: Json
          son_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          expense_id?: string
          id?: string
          note?: string | null
          snapshot?: Json
          son_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_revisions_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          budget_at_submit: number
          category_id: string
          created_at: string
          description: string
          expense_date: string
          id: string
          month: string
          no_receipt_reason: string | null
          over_amount: number
          overspend_reason: string | null
          receipt_filename: string | null
          receipt_mime: string | null
          receipt_path: string | null
          receipt_size: number | null
          receipt_uploaded_at: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          son_id: string
          status: Database["public"]["Enums"]["expense_status"]
          submission_count: number
          updated_at: string
        }
        Insert: {
          amount: number
          budget_at_submit?: number
          category_id: string
          created_at?: string
          description: string
          expense_date?: string
          id?: string
          month?: string
          no_receipt_reason?: string | null
          over_amount?: number
          overspend_reason?: string | null
          receipt_filename?: string | null
          receipt_mime?: string | null
          receipt_path?: string | null
          receipt_size?: number | null
          receipt_uploaded_at?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          son_id: string
          status?: Database["public"]["Enums"]["expense_status"]
          submission_count?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          budget_at_submit?: number
          category_id?: string
          created_at?: string
          description?: string
          expense_date?: string
          id?: string
          month?: string
          no_receipt_reason?: string | null
          over_amount?: number
          overspend_reason?: string | null
          receipt_filename?: string | null
          receipt_mime?: string | null
          receipt_path?: string | null
          receipt_size?: number | null
          receipt_uploaded_at?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          son_id?: string
          status?: Database["public"]["Enums"]["expense_status"]
          submission_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_son_id_fkey"
            columns: ["son_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      money_transfers: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string
          month: string
          notes: string | null
          parent_id: string
          reference: string | null
          son_id: string
          transfer_date: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method?: string
          month: string
          notes?: string | null
          parent_id: string
          reference?: string | null
          son_id: string
          transfer_date?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string
          month?: string
          notes?: string | null
          parent_id?: string
          reference?: string | null
          son_id?: string
          transfer_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "money_transfers_son_id_fkey"
            columns: ["son_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          kind: string
          message: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          kind?: string
          message?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          kind?: string
          message?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          link_status: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string
          full_name?: string
          id: string
          link_status?: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          link_status?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      can_see_son: { Args: { _son_id: string }; Returns: boolean }
      category_budget: {
        Args: { _category: string; _month: string; _son: string }
        Returns: number
      }
      category_spent: {
        Args: {
          _category: string
          _exclude: string
          _month: string
          _son: string
        }
        Returns: number
      }
      expense_evaluate_row: {
        Args: { _row: Database["public"]["Tables"]["expenses"]["Row"] }
        Returns: {
          amount: number
          budget_at_submit: number
          category_id: string
          created_at: string
          description: string
          expense_date: string
          id: string
          month: string
          no_receipt_reason: string | null
          over_amount: number
          overspend_reason: string | null
          receipt_filename: string | null
          receipt_mime: string | null
          receipt_path: string | null
          receipt_size: number | null
          receipt_uploaded_at: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          son_id: string
          status: Database["public"]["Enums"]["expense_status"]
          submission_count: number
          updated_at: string
        }
        SetofOptions: {
          from: "expenses"
          to: "expenses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_my_son: { Args: { _son_id: string }; Returns: boolean }
      is_parent: { Args: never; Returns: boolean }
      log_audit: {
        Args: {
          _action: string
          _amount: number
          _details: Json
          _entity: string
          _entity_id: string
          _subject: string
        }
        Returns: undefined
      }
      notify: {
        Args: { _kind: string; _message: string; _title: string; _user: string }
        Returns: undefined
      }
      parent_of: { Args: { _son: string }; Returns: string }
      plan_owner: { Args: { _plan: string }; Returns: string }
      plan_state: {
        Args: { _plan: string }
        Returns: Database["public"]["Enums"]["plan_status"]
      }
    }
    Enums: {
      app_role: "parent" | "son"
      expense_status:
        | "pending_review"
        | "approved"
        | "rejected"
        | "pending_exception"
        | "exception_approved"
        | "exception_rejected"
      item_status: "pending" | "approved" | "reduced" | "rejected"
      plan_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "approved"
        | "partially_approved"
        | "rejected"
      request_status: "pending" | "approved" | "partially_approved" | "rejected"
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
      app_role: ["parent", "son"],
      expense_status: [
        "pending_review",
        "approved",
        "rejected",
        "pending_exception",
        "exception_approved",
        "exception_rejected",
      ],
      item_status: ["pending", "approved", "reduced", "rejected"],
      plan_status: [
        "draft",
        "submitted",
        "under_review",
        "approved",
        "partially_approved",
        "rejected",
      ],
      request_status: ["pending", "approved", "partially_approved", "rejected"],
    },
  },
} as const

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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      challenge_participants: {
        Row: {
          challenge_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          end_date: string
          group_id: string
          id: string
          start_date: string
          status: string
          target_value: number | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          end_date: string
          group_id: string
          id?: string
          start_date: string
          status?: string
          target_value?: number | null
          title: string
          type: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string
          group_id?: string
          id?: string
          start_date?: string
          status?: string
          target_value?: number | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenges_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      consumption_logs: {
        Row: {
          consumed_at: string
          group_id: string | null
          id: string
          item_id: string
          meal_type: string | null
          note: string | null
          quantity: number
          recipe_id: string | null
          unit: string | null
          user_id: string
        }
        Insert: {
          consumed_at?: string
          group_id?: string | null
          id?: string
          item_id: string
          meal_type?: string | null
          note?: string | null
          quantity?: number
          recipe_id?: string | null
          unit?: string | null
          user_id: string
        }
        Update: {
          consumed_at?: string
          group_id?: string | null
          id?: string
          item_id?: string
          meal_type?: string | null
          note?: string | null
          quantity?: number
          recipe_id?: string | null
          unit?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consumption_logs_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consumption_logs_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consumption_logs_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      group_invites: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          group_id: string
          id: string
          invite_token: string
          invited_by: string
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          group_id: string
          id?: string
          invite_token?: string
          invited_by: string
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          group_id?: string
          id?: string
          invite_token?: string
          invited_by?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_invites_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          type: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          type?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          type?: string | null
        }
        Relationships: []
      }
      insight_actions: {
        Row: {
          action_taken: string
          created_at: string
          id: string
          insight_id: string
          user_id: string
        }
        Insert: {
          action_taken: string
          created_at?: string
          id?: string
          insight_id: string
          user_id: string
        }
        Update: {
          action_taken?: string
          created_at?: string
          id?: string
          insight_id?: string
          user_id?: string
        }
        Relationships: []
      }
      insight_state: {
        Row: {
          created_at: string
          group_id: string | null
          id: string
          insight_id: string
          resolved_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id?: string | null
          id?: string
          insight_id: string
          resolved_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string | null
          id?: string
          insight_id?: string
          resolved_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "insight_state_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          added_at: string
          archive_reason: string | null
          archived_at: string | null
          cleanup_batch: string | null
          expiry_date: string | null
          group_id: string | null
          id: string
          item_id: string
          opened_date: string | null
          purchase_id: string | null
          quantity: number
          sealed_status: string | null
          status: string
          storage_location: string | null
          unit: string
          user_id: string
        }
        Insert: {
          added_at?: string
          archive_reason?: string | null
          archived_at?: string | null
          cleanup_batch?: string | null
          expiry_date?: string | null
          group_id?: string | null
          id?: string
          item_id: string
          opened_date?: string | null
          purchase_id?: string | null
          quantity?: number
          sealed_status?: string | null
          status?: string
          storage_location?: string | null
          unit?: string
          user_id: string
        }
        Update: {
          added_at?: string
          archive_reason?: string | null
          archived_at?: string | null
          cleanup_batch?: string | null
          expiry_date?: string | null
          group_id?: string | null
          id?: string
          item_id?: string
          opened_date?: string | null
          purchase_id?: string | null
          quantity?: number
          sealed_status?: string | null
          status?: string
          storage_location?: string | null
          unit?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          brand: string | null
          calories_per_unit: number | null
          carbs_g: number | null
          category: string | null
          created_at: string
          default_unit: string | null
          fat_g: number | null
          fiber_g: number | null
          id: string
          image_url: string | null
          name: string
          nutrition_basis: string | null
          protein_g: number | null
          serving_size: string | null
          sodium_mg: number | null
          sugar_g: number | null
          user_id: string
        }
        Insert: {
          brand?: string | null
          calories_per_unit?: number | null
          carbs_g?: number | null
          category?: string | null
          created_at?: string
          default_unit?: string | null
          fat_g?: number | null
          fiber_g?: number | null
          id?: string
          image_url?: string | null
          name: string
          nutrition_basis?: string | null
          protein_g?: number | null
          serving_size?: string | null
          sodium_mg?: number | null
          sugar_g?: number | null
          user_id: string
        }
        Update: {
          brand?: string | null
          calories_per_unit?: number | null
          carbs_g?: number | null
          category?: string | null
          created_at?: string
          default_unit?: string | null
          fat_g?: number | null
          fiber_g?: number | null
          id?: string
          image_url?: string | null
          name?: string
          nutrition_basis?: string | null
          protein_g?: number | null
          serving_size?: string | null
          sodium_mg?: number | null
          sugar_g?: number | null
          user_id?: string
        }
        Relationships: []
      }
      nutrition_goals: {
        Row: {
          calorie_goal: number
          carbs_goal: number
          created_at: string
          fat_goal: number
          id: string
          protein_goal: number
          updated_at: string
          user_id: string
          water_goal_ml: number
        }
        Insert: {
          calorie_goal?: number
          carbs_goal?: number
          created_at?: string
          fat_goal?: number
          id?: string
          protein_goal?: number
          updated_at?: string
          user_id: string
          water_goal_ml?: number
        }
        Update: {
          calorie_goal?: number
          carbs_goal?: number
          created_at?: string
          fat_goal?: number
          id?: string
          protein_goal?: number
          updated_at?: string
          user_id?: string
          water_goal_ml?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          cuisine_preferences: string[] | null
          full_name: string | null
          household_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          cuisine_preferences?: string[] | null
          full_name?: string | null
          household_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          cuisine_preferences?: string[] | null
          full_name?: string | null
          household_name?: string | null
          id?: string
        }
        Relationships: []
      }
      purchase_items: {
        Row: {
          expiry_date: string | null
          id: string
          item_id: string
          notes: string | null
          opened_date: string | null
          purchase_id: string
          quantity: number
          sealed_status: string | null
          unit: string
          unit_price: number | null
          user_id: string
          weight: number | null
          weight_unit: string | null
        }
        Insert: {
          expiry_date?: string | null
          id?: string
          item_id: string
          notes?: string | null
          opened_date?: string | null
          purchase_id: string
          quantity?: number
          sealed_status?: string | null
          unit?: string
          unit_price?: number | null
          user_id: string
          weight?: number | null
          weight_unit?: string | null
        }
        Update: {
          expiry_date?: string | null
          id?: string
          item_id?: string
          notes?: string | null
          opened_date?: string | null
          purchase_id?: string
          quantity?: number
          sealed_status?: string | null
          unit?: string
          unit_price?: number | null
          user_id?: string
          weight?: number | null
          weight_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          group_id: string | null
          id: string
          notes: string | null
          purchased_at: string
          store_name: string | null
          total_cost: number | null
          user_id: string
        }
        Insert: {
          group_id?: string | null
          id?: string
          notes?: string | null
          purchased_at?: string
          store_name?: string | null
          total_cost?: number | null
          user_id: string
        }
        Update: {
          group_id?: string | null
          id?: string
          notes?: string | null
          purchased_at?: string
          store_name?: string | null
          total_cost?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ingredients: {
        Row: {
          id: string
          item_id: string
          quantity: number
          recipe_id: string
          unit: string
          user_id: string
        }
        Insert: {
          id?: string
          item_id: string
          quantity?: number
          recipe_id: string
          unit?: string
          user_id: string
        }
        Update: {
          id?: string
          item_id?: string
          quantity?: number
          recipe_id?: string
          unit?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          calories_per_serving: number | null
          carbs_g_per_serving: number | null
          created_at: string
          fat_g_per_serving: number | null
          fiber_g_per_serving: number | null
          id: string
          image_url: string | null
          instructions: string | null
          name: string
          nutrition_calculated_at: string | null
          nutrition_notes: string | null
          protein_g_per_serving: number | null
          servings: number | null
          sodium_mg_per_serving: number | null
          sugar_g_per_serving: number | null
          tags: string[]
          user_id: string
        }
        Insert: {
          calories_per_serving?: number | null
          carbs_g_per_serving?: number | null
          created_at?: string
          fat_g_per_serving?: number | null
          fiber_g_per_serving?: number | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          name: string
          nutrition_calculated_at?: string | null
          nutrition_notes?: string | null
          protein_g_per_serving?: number | null
          servings?: number | null
          sodium_mg_per_serving?: number | null
          sugar_g_per_serving?: number | null
          tags?: string[]
          user_id: string
        }
        Update: {
          calories_per_serving?: number | null
          carbs_g_per_serving?: number | null
          created_at?: string
          fat_g_per_serving?: number | null
          fiber_g_per_serving?: number | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          name?: string
          nutrition_calculated_at?: string | null
          nutrition_notes?: string | null
          protein_g_per_serving?: number | null
          servings?: number | null
          sodium_mg_per_serving?: number | null
          sugar_g_per_serving?: number | null
          tags?: string[]
          user_id?: string
        }
        Relationships: []
      }
      shopping_list: {
        Row: {
          category: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          estimated_cost: number | null
          group_id: string | null
          id: string
          is_purchased: boolean
          item_id: string | null
          name: string
          quantity: number | null
          user_id: string
        }
        Insert: {
          category?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          estimated_cost?: number | null
          group_id?: string | null
          id?: string
          is_purchased?: boolean
          item_id?: string | null
          name: string
          quantity?: number | null
          user_id: string
        }
        Update: {
          category?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          estimated_cost?: number | null
          group_id?: string | null
          id?: string
          is_purchased?: boolean
          item_id?: string | null
          name?: string
          quantity?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_list_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_list_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      symptoms: {
        Row: {
          consumption_id: string | null
          created_at: string
          digestion: number | null
          energy: number | null
          id: string
          mood: number | null
          notes: string | null
          recorded_at: string
          user_id: string
        }
        Insert: {
          consumption_id?: string | null
          created_at?: string
          digestion?: number | null
          energy?: number | null
          id?: string
          mood?: number | null
          notes?: string | null
          recorded_at?: string
          user_id: string
        }
        Update: {
          consumption_id?: string | null
          created_at?: string
          digestion?: number | null
          energy?: number | null
          id?: string
          mood?: number | null
          notes?: string | null
          recorded_at?: string
          user_id?: string
        }
        Relationships: []
      }
      waste_logs: {
        Row: {
          discarded_at: string
          group_id: string | null
          id: string
          inventory_id: string | null
          item_id: string
          note: string | null
          purchase_id: string | null
          quantity: number
          reason: string | null
          unit: string
          user_id: string
        }
        Insert: {
          discarded_at?: string
          group_id?: string | null
          id?: string
          inventory_id?: string | null
          item_id: string
          note?: string | null
          purchase_id?: string | null
          quantity?: number
          reason?: string | null
          unit?: string
          user_id: string
        }
        Update: {
          discarded_at?: string
          group_id?: string | null
          id?: string
          inventory_id?: string | null
          item_id?: string
          note?: string | null
          purchase_id?: string | null
          quantity?: number
          reason?: string | null
          unit?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waste_logs_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waste_logs_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waste_logs_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waste_logs_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      water_logs: {
        Row: {
          amount_ml: number
          group_id: string | null
          id: string
          logged_at: string
          user_id: string
        }
        Insert: {
          amount_ml?: number
          group_id?: string | null
          id?: string
          logged_at?: string
          user_id: string
        }
        Update: {
          amount_ml?: number
          group_id?: string | null
          id?: string
          logged_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "water_logs_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      weigh_ins: {
        Row: {
          created_at: string
          id: string
          note: string | null
          recorded_at: string
          user_id: string
          weight_kg: number
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          recorded_at?: string
          user_id: string
          weight_kg: number
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          recorded_at?: string
          user_id?: string
          weight_kg?: number
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

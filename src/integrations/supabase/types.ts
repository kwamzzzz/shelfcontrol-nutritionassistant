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
      consumption_logs: {
        Row: {
          consumed_at: string
          id: string
          item_id: string
          quantity: number
          recipe_id: string | null
          user_id: string
        }
        Insert: {
          consumed_at?: string
          id?: string
          item_id: string
          quantity?: number
          recipe_id?: string | null
          user_id: string
        }
        Update: {
          consumed_at?: string
          id?: string
          item_id?: string
          quantity?: number
          recipe_id?: string | null
          user_id?: string
        }
        Relationships: [
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
      inventory: {
        Row: {
          added_at: string
          expiry_date: string | null
          id: string
          item_id: string
          quantity: number
          storage_location: string | null
          unit: string
          user_id: string
        }
        Insert: {
          added_at?: string
          expiry_date?: string | null
          id?: string
          item_id: string
          quantity?: number
          storage_location?: string | null
          unit?: string
          user_id: string
        }
        Update: {
          added_at?: string
          expiry_date?: string | null
          id?: string
          item_id?: string
          quantity?: number
          storage_location?: string | null
          unit?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          calories_per_unit: number | null
          carbs_g: number | null
          category: string | null
          created_at: string
          default_unit: string | null
          fat_g: number | null
          id: string
          name: string
          protein_g: number | null
          user_id: string
        }
        Insert: {
          calories_per_unit?: number | null
          carbs_g?: number | null
          category?: string | null
          created_at?: string
          default_unit?: string | null
          fat_g?: number | null
          id?: string
          name: string
          protein_g?: number | null
          user_id: string
        }
        Update: {
          calories_per_unit?: number | null
          carbs_g?: number | null
          category?: string | null
          created_at?: string
          default_unit?: string | null
          fat_g?: number | null
          id?: string
          name?: string
          protein_g?: number | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          household_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          household_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          household_name?: string | null
          id?: string
        }
        Relationships: []
      }
      purchase_items: {
        Row: {
          id: string
          item_id: string
          purchase_id: string
          quantity: number
          unit: string
          unit_price: number | null
          user_id: string
        }
        Insert: {
          id?: string
          item_id: string
          purchase_id: string
          quantity?: number
          unit?: string
          unit_price?: number | null
          user_id: string
        }
        Update: {
          id?: string
          item_id?: string
          purchase_id?: string
          quantity?: number
          unit?: string
          unit_price?: number | null
          user_id?: string
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
          id: string
          notes: string | null
          purchased_at: string
          store_name: string | null
          total_cost: number | null
          user_id: string
        }
        Insert: {
          id?: string
          notes?: string | null
          purchased_at?: string
          store_name?: string | null
          total_cost?: number | null
          user_id: string
        }
        Update: {
          id?: string
          notes?: string | null
          purchased_at?: string
          store_name?: string | null
          total_cost?: number | null
          user_id?: string
        }
        Relationships: []
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
          created_at: string
          id: string
          instructions: string | null
          name: string
          servings: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          instructions?: string | null
          name: string
          servings?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          instructions?: string | null
          name?: string
          servings?: number | null
          user_id?: string
        }
        Relationships: []
      }
      shopping_list: {
        Row: {
          category: string | null
          created_at: string
          estimated_cost: number | null
          id: string
          is_purchased: boolean
          item_id: string | null
          name: string
          quantity: number | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          estimated_cost?: number | null
          id?: string
          is_purchased?: boolean
          item_id?: string | null
          name: string
          quantity?: number | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          estimated_cost?: number | null
          id?: string
          is_purchased?: boolean
          item_id?: string | null
          name?: string
          quantity?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_list_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
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

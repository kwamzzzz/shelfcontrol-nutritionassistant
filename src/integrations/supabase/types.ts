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
      feedback: {
        Row: {
          admin_notes: string | null
          category: string
          created_at: string
          id: string
          message: string
          page_path: string | null
          rating: number | null
          screenshot_path: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          category?: string
          created_at?: string
          id?: string
          message: string
          page_path?: string | null
          rating?: number | null
          screenshot_path?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          admin_notes?: string | null
          category?: string
          created_at?: string
          id?: string
          message?: string
          page_path?: string | null
          rating?: number | null
          screenshot_path?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          additional_info: string | null
          brand: string | null
          calories_per_unit: number | null
          carbs_g: number | null
          category: string | null
          country_of_origin: string | null
          created_at: string
          default_unit: string | null
          fat_g: number | null
          fiber_g: number | null
          id: string
          image_url: string | null
          name: string
          nutrition_basis: string | null
          nutrition_confidence: string | null
          nutrition_estimated: boolean
          nutrition_grams_per_unit: number | null
          nutrition_ml_per_unit: number | null
          nutrition_source: string | null
          nutrition_source_id: string | null
          nutrition_source_url: string | null
          nutrition_updated_at: string | null
          protein_g: number | null
          serving_size: string | null
          sodium_mg: number | null
          sugar_g: number | null
          user_id: string
        }
        Insert: {
          additional_info?: string | null
          brand?: string | null
          calories_per_unit?: number | null
          carbs_g?: number | null
          category?: string | null
          country_of_origin?: string | null
          created_at?: string
          default_unit?: string | null
          fat_g?: number | null
          fiber_g?: number | null
          id?: string
          image_url?: string | null
          name: string
          nutrition_basis?: string | null
          nutrition_confidence?: string | null
          nutrition_estimated?: boolean
          nutrition_grams_per_unit?: number | null
          nutrition_ml_per_unit?: number | null
          nutrition_source?: string | null
          nutrition_source_id?: string | null
          nutrition_source_url?: string | null
          nutrition_updated_at?: string | null
          protein_g?: number | null
          serving_size?: string | null
          sodium_mg?: number | null
          sugar_g?: number | null
          user_id: string
        }
        Update: {
          additional_info?: string | null
          brand?: string | null
          calories_per_unit?: number | null
          carbs_g?: number | null
          category?: string | null
          country_of_origin?: string | null
          created_at?: string
          default_unit?: string | null
          fat_g?: number | null
          fiber_g?: number | null
          id?: string
          image_url?: string | null
          name?: string
          nutrition_basis?: string | null
          nutrition_confidence?: string | null
          nutrition_estimated?: boolean
          nutrition_grams_per_unit?: number | null
          nutrition_ml_per_unit?: number | null
          nutrition_source?: string | null
          nutrition_source_id?: string | null
          nutrition_source_url?: string | null
          nutrition_updated_at?: string | null
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
      price_observations: {
        Row: {
          created_at: string
          currency: string
          group_id: string | null
          id: string
          item_brand: string | null
          item_id: string
          item_name: string
          notes: string | null
          observed_at: string
          package_quantity: number
          package_unit: string
          price: number
          share_with_community: boolean
          store_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          group_id?: string | null
          id?: string
          item_brand?: string | null
          item_id: string
          item_name: string
          notes?: string | null
          observed_at?: string
          package_quantity?: number
          package_unit?: string
          price: number
          share_with_community?: boolean
          store_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          group_id?: string | null
          id?: string
          item_brand?: string | null
          item_id?: string
          item_name?: string
          notes?: string | null
          observed_at?: string
          package_quantity?: number
          package_unit?: string
          price?: number
          share_with_community?: boolean
          store_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_observations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_observations_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
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
          group_id: string | null
          id: string
          image_url: string | null
          instructions: string | null
          name: string
          nutrition_calculated_at: string | null
          nutrition_notes: string | null
          protein_g_per_serving: number | null
          servings: number | null
          sodium_mg_per_serving: number | null
          source_notes: string | null
          source_url: string | null
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
          group_id?: string | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          name: string
          nutrition_calculated_at?: string | null
          nutrition_notes?: string | null
          protein_g_per_serving?: number | null
          servings?: number | null
          sodium_mg_per_serving?: number | null
          source_notes?: string | null
          source_url?: string | null
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
          group_id?: string | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          name?: string
          nutrition_calculated_at?: string | null
          nutrition_notes?: string | null
          protein_g_per_serving?: number | null
          servings?: number | null
          sodium_mg_per_serving?: number | null
          source_notes?: string | null
          source_url?: string | null
          sugar_g_per_serving?: number | null
          tags?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipes_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_list: {
        Row: {
          basket: string | null
          category: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          estimated_cost: number | null
          group_id: string | null
          id: string
          image_url: string | null
          is_purchased: boolean
          item_id: string | null
          name: string
          notes: string | null
          quantity: number | null
          recipe_id: string | null
          unit: string | null
          user_id: string
        }
        Insert: {
          basket?: string | null
          category?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          estimated_cost?: number | null
          group_id?: string | null
          id?: string
          image_url?: string | null
          is_purchased?: boolean
          item_id?: string | null
          name: string
          notes?: string | null
          quantity?: number | null
          recipe_id?: string | null
          unit?: string | null
          user_id: string
        }
        Update: {
          basket?: string | null
          category?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          estimated_cost?: number | null
          group_id?: string | null
          id?: string
          image_url?: string | null
          is_purchased?: boolean
          item_id?: string | null
          name?: string
          notes?: string | null
          quantity?: number | null
          recipe_id?: string | null
          unit?: string | null
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
          {
            foreignKeyName: "shopping_list_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
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
      admin_list_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          inventory_count: number
          is_admin: boolean
          item_count: number
          last_sign_in_at: string
          recipe_count: number
        }[]
      }
      admin_set_role: {
        Args: {
          _grant: boolean
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      admin_usage_stats: { Args: never; Returns: Json }
      get_community_price_observations: {
        Args: { p_item_brand?: string; p_item_name: string }
        Returns: {
          currency: string
          id: string
          item_id: string
          observed_at: string
          package_quantity: number
          package_unit: string
          price: number
          store_name: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      share_inventory_to_group: {
        Args: { _group_id: string; _inventory_ids: string[]; _mode?: string }
        Returns: Json
      }
      share_purchase_to_group: {
        Args: { _group_id: string; _mode?: string; _purchase_id: string }
        Returns: Json
      }
      share_recipes_to_group: {
        Args: { _group_id: string; _mode?: string; _recipe_ids: string[] }
        Returns: Json
      }
      share_shopping_to_group: {
        Args: { _group_id: string; _shopping_ids: string[] }
        Returns: Json
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const

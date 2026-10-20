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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      attribute_values: {
        Row: {
          attribute_id: string
          color_hex: string | null
          created_at: string
          id: string
          slug: string
          sort_order: number
          value: string
        }
        Insert: {
          attribute_id: string
          color_hex?: string | null
          created_at?: string
          id?: string
          slug: string
          sort_order?: number
          value: string
        }
        Update: {
          attribute_id?: string
          color_hex?: string | null
          created_at?: string
          id?: string
          slug?: string
          sort_order?: number
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "attribute_values_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          },
        ]
      }
      attributes: {
        Row: {
          created_at: string
          id: string
          is_filterable: boolean
          is_option: boolean
          kind: Database["public"]["Enums"]["attribute_kind"]
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_filterable?: boolean
          is_option?: boolean
          kind?: Database["public"]["Enums"]["attribute_kind"]
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_filterable?: boolean
          is_option?: boolean
          kind?: Database["public"]["Enums"]["attribute_kind"]
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          created_at: string
          cta_label: string | null
          ends_at: string | null
          id: string
          image_url: string
          is_active: boolean
          layout: string
          link_url: string | null
          placement: string
          sort_order: number
          starts_at: string | null
          storage_path: string | null
          subtitle: string | null
          theme: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_label?: string | null
          ends_at?: string | null
          id?: string
          image_url: string
          is_active?: boolean
          layout?: string
          link_url?: string | null
          placement?: string
          sort_order?: number
          starts_at?: string | null
          storage_path?: string | null
          subtitle?: string | null
          theme?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_label?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          layout?: string
          link_url?: string | null
          placement?: string
          sort_order?: number
          starts_at?: string | null
          storage_path?: string | null
          subtitle?: string | null
          theme?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_zones: {
        Row: {
          created_at: string
          description: string | null
          estimated_days: string | null
          fee: number
          id: string
          is_active: boolean
          is_pickup: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          estimated_days?: string | null
          fee?: number
          id?: string
          is_active?: boolean
          is_pickup?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          estimated_days?: string | null
          fee?: number
          id?: string
          is_active?: boolean
          is_pickup?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      order_events: {
        Row: {
          actor_id: string | null
          created_at: string
          customer_notified: boolean
          id: number
          note: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"] | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          customer_notified?: boolean
          id?: never
          note?: string | null
          order_id: string
          status?: Database["public"]["Enums"]["order_status"] | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          customer_notified?: boolean
          id?: never
          note?: string | null
          order_id?: string
          status?: Database["public"]["Enums"]["order_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          image_url: string | null
          line_total: number
          options: Json
          order_id: string
          product_id: string | null
          quantity: number
          sku: string | null
          title: string
          unit_price: number
        }
        Insert: {
          id?: string
          image_url?: string | null
          line_total: number
          options?: Json
          order_id: string
          product_id?: string | null
          quantity: number
          sku?: string | null
          title: string
          unit_price: number
        }
        Update: {
          id?: string
          image_url?: string | null
          line_total?: number
          options?: Json
          order_id?: string
          product_id?: string | null
          quantity?: number
          sku?: string | null
          title?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          access_token: string
          address_line: string | null
          admin_notes: string | null
          city: string | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          delivery_fee: number
          delivery_notes: string | null
          delivery_zone_id: string | null
          delivery_zone_name: string
          id: string
          is_pickup: boolean
          item_count: number
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_reference: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          access_token?: string
          address_line?: string | null
          admin_notes?: string | null
          city?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          delivery_fee?: number
          delivery_notes?: string | null
          delivery_zone_id?: string | null
          delivery_zone_name: string
          id?: string
          is_pickup?: boolean
          item_count: number
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          status?: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          access_token?: string
          address_line?: string | null
          admin_notes?: string | null
          city?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          delivery_fee?: number
          delivery_notes?: string | null
          delivery_zone_id?: string | null
          delivery_zone_name?: string
          id?: string
          is_pickup?: boolean
          item_count?: number
          order_number?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_delivery_zone_id_fkey"
            columns: ["delivery_zone_id"]
            isOneToOne: false
            referencedRelation: "delivery_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_published: boolean
          show_in_footer: boolean
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          is_published?: boolean
          show_in_footer?: boolean
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_published?: boolean
          show_in_footer?: boolean
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_attribute_values: {
        Row: {
          attribute_value_id: string
          product_id: string
        }
        Insert: {
          attribute_value_id: string
          product_id: string
        }
        Update: {
          attribute_value_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_attribute_values_attribute_value_id_fkey"
            columns: ["attribute_value_id"]
            isOneToOne: false
            referencedRelation: "attribute_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_attribute_values_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt: string | null
          created_at: string
          height: number | null
          id: string
          product_id: string
          sort_order: number
          storage_path: string | null
          url: string
          width: number | null
        }
        Insert: {
          alt?: string | null
          created_at?: string
          height?: number | null
          id?: string
          product_id: string
          sort_order?: number
          storage_path?: string | null
          url: string
          width?: number | null
        }
        Update: {
          alt?: string | null
          created_at?: string
          height?: number | null
          id?: string
          product_id?: string
          sort_order?: number
          storage_path?: string | null
          url?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand_id: string | null
          category_id: string | null
          created_at: string
          description: string
          id: string
          is_featured: boolean
          price: number
          rating_avg: number
          rating_count: number
          sale_ends_at: string | null
          sale_price: number | null
          search_text: string
          search_vector: unknown
          sku: string
          slug: string
          sold_count: number
          specifications: Json
          status: Database["public"]["Enums"]["product_status"]
          stock: number
          title: string
          updated_at: string
        }
        Insert: {
          brand_id?: string | null
          category_id?: string | null
          created_at?: string
          description?: string
          id?: string
          is_featured?: boolean
          price: number
          rating_avg?: number
          rating_count?: number
          sale_ends_at?: string | null
          sale_price?: number | null
          search_text?: string
          search_vector?: unknown
          sku?: string
          slug: string
          sold_count?: number
          specifications?: Json
          status?: Database["public"]["Enums"]["product_status"]
          stock?: number
          title: string
          updated_at?: string
        }
        Update: {
          brand_id?: string | null
          category_id?: string | null
          created_at?: string
          description?: string
          id?: string
          is_featured?: boolean
          price?: number
          rating_avg?: number
          rating_count?: number
          sale_ends_at?: string | null
          sale_price?: number | null
          search_text?: string
          search_vector?: unknown
          sku?: string
          slug?: string
          sold_count?: number
          specifications?: Json
          status?: Database["public"]["Enums"]["product_status"]
          stock?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address_line: string | null
          city: string | null
          created_at: string
          delivery_zone_id: string | null
          email: string | null
          full_name: string | null
          id: string
          permissions: string[]
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          address_line?: string | null
          city?: string | null
          created_at?: string
          delivery_zone_id?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          permissions?: string[]
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          address_line?: string | null
          city?: string | null
          created_at?: string
          delivery_zone_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          permissions?: string[]
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_delivery_zone_id_fkey"
            columns: ["delivery_zone_id"]
            isOneToOne: false
            referencedRelation: "delivery_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          author_name: string
          body: string | null
          created_at: string
          id: string
          is_verified_purchase: boolean
          product_id: string
          rating: number
          status: Database["public"]["Enums"]["review_status"]
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          author_name: string
          body?: string | null
          created_at?: string
          id?: string
          is_verified_purchase?: boolean
          product_id: string
          rating: number
          status?: Database["public"]["Enums"]["review_status"]
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          author_name?: string
          body?: string | null
          created_at?: string
          id?: string
          is_verified_purchase?: boolean
          product_id?: string
          rating?: number
          status?: Database["public"]["Enums"]["review_status"]
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      store_settings: {
        Row: {
          address: string | null
          announcement: string | null
          bank_transfer_enabled: boolean
          bank_transfer_instructions: string | null
          business_hours: string | null
          cash_on_delivery_enabled: boolean
          contact_email: string | null
          contact_phone: string | null
          currency_code: string
          currency_symbol: string
          facebook_url: string | null
          free_delivery_threshold: number | null
          id: number
          instagram_url: string | null
          logo_url: string | null
          low_stock_threshold: number
          mmg_enabled: boolean
          mmg_instructions: string | null
          order_notification_emails: string[]
          order_prefix: string
          store_name: string
          tagline: string | null
          tiktok_url: string | null
          timezone: string
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          address?: string | null
          announcement?: string | null
          bank_transfer_enabled?: boolean
          bank_transfer_instructions?: string | null
          business_hours?: string | null
          cash_on_delivery_enabled?: boolean
          contact_email?: string | null
          contact_phone?: string | null
          currency_code?: string
          currency_symbol?: string
          facebook_url?: string | null
          free_delivery_threshold?: number | null
          id?: number
          instagram_url?: string | null
          logo_url?: string | null
          low_stock_threshold?: number
          mmg_enabled?: boolean
          mmg_instructions?: string | null
          order_notification_emails?: string[]
          order_prefix?: string
          store_name?: string
          tagline?: string | null
          tiktok_url?: string | null
          timezone?: string
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          address?: string | null
          announcement?: string | null
          bank_transfer_enabled?: boolean
          bank_transfer_instructions?: string | null
          business_hours?: string | null
          cash_on_delivery_enabled?: boolean
          contact_email?: string | null
          contact_phone?: string | null
          currency_code?: string
          currency_symbol?: string
          facebook_url?: string | null
          free_delivery_threshold?: number | null
          id?: number
          instagram_url?: string | null
          logo_url?: string | null
          low_stock_threshold?: number
          mmg_enabled?: boolean
          mmg_instructions?: string | null
          order_notification_emails?: string[]
          order_prefix?: string
          store_name?: string
          tagline?: string | null
          tiktok_url?: string | null
          timezone?: string
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      wishlist_items: {
        Row: {
          created_at: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_customers: {
        Args: { p_limit?: number; p_offset?: number; p_search?: string }
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          last_order_at: string
          order_count: number
          phone: string
          total_count: number
          total_spent: number
        }[]
      }
      admin_dashboard: { Args: { p_days?: number }; Returns: Json }
      admin_import_products: { Args: { p_rows: Json }; Returns: Json }
      admin_update_order: {
        Args: {
          p_customer_notified?: boolean
          p_note?: string
          p_order_id: string
          p_payment_status?: Database["public"]["Enums"]["payment_status"]
          p_status?: Database["public"]["Enums"]["order_status"]
        }
        Returns: Json
      }
      category_subtree: {
        Args: { p_category_id: string }
        Returns: {
          id: string
        }[]
      }
      find_or_create_attribute_value: {
        Args: { p_attribute: string; p_value: string }
        Returns: string
      }
      find_or_create_brand: { Args: { p_name: string }; Returns: string }
      find_or_create_category_path: {
        Args: { p_path: string }
        Returns: string
      }
      get_order: {
        Args: { p_access_token?: string; p_order_number: string }
        Returns: Json
      }
      has_permission: { Args: { p_permission: string }; Returns: boolean }
      is_owner: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      order_json: {
        Args: { p_include_private?: boolean; p_order_id: string }
        Returns: Json
      }
      owner_set_access: {
        Args: {
          p_permissions?: string[]
          p_role: Database["public"]["Enums"]["user_role"]
          p_user_id: string
        }
        Returns: undefined
      }
      place_order: { Args: { p_payload: Json }; Returns: Json }
      price_now: {
        Args: { p_price: number; p_sale_ends_at: string; p_sale_price: number }
        Returns: number
      }
      search_base: {
        Args: { p_category_slug?: string; p_query?: string }
        Returns: {
          is_fuzzy: boolean
          product_id: string
          score: number
        }[]
      }
      search_facets: {
        Args: { p_category_slug?: string; p_query?: string }
        Returns: Json
      }
      search_products: {
        Args: {
          p_attrs?: string[]
          p_brand_slugs?: string[]
          p_category_slug?: string
          p_featured?: boolean
          p_ids?: string[]
          p_in_stock?: boolean
          p_limit?: number
          p_max_price?: number
          p_min_price?: number
          p_offset?: number
          p_on_sale?: boolean
          p_query?: string
          p_sort?: string
        }
        Returns: {
          brand_name: string
          colors: Json
          current_price: number
          has_options: boolean
          hover_image_url: string
          id: string
          image_url: string
          is_fuzzy: boolean
          price: number
          rating_avg: number
          rating_count: number
          sale_ends_at: string
          slug: string
          stock: number
          title: string
          total_count: number
        }[]
      }
      search_suggestions: { Args: { p_query: string }; Returns: Json }
      search_tokens: { Args: { p_query: string }; Returns: string[] }
      slugify: { Args: { p_text: string }; Returns: string }
      submit_review: {
        Args: {
          p_body?: string
          p_product_id: string
          p_rating: number
          p_title?: string
        }
        Returns: string
      }
      sync_product_image_urls: {
        Args: { p_product_id: string; p_urls: string[] }
        Returns: undefined
      }
      track_order: {
        Args: { p_contact: string; p_order_number: string }
        Returns: Json
      }
    }
    Enums: {
      attribute_kind: "select" | "color"
      order_status:
        | "pending"
        | "confirmed"
        | "processing"
        | "ready_for_pickup"
        | "out_for_delivery"
        | "delivered"
        | "cancelled"
      payment_method: "cash_on_delivery" | "bank_transfer" | "mmg"
      payment_status: "unpaid" | "paid" | "refunded"
      product_status: "active" | "hidden"
      review_status: "pending" | "published" | "hidden"
      user_role: "customer" | "staff" | "owner"
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
      attribute_kind: ["select", "color"],
      order_status: [
        "pending",
        "confirmed",
        "processing",
        "ready_for_pickup",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
      payment_method: ["cash_on_delivery", "bank_transfer", "mmg"],
      payment_status: ["unpaid", "paid", "refunded"],
      product_status: ["active", "hidden"],
      review_status: ["pending", "published", "hidden"],
      user_role: ["customer", "staff", "owner"],
    },
  },
} as const

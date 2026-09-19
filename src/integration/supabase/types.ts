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
      academic_resources: {
        Row: {
          created_at: string
          department: string | null
          description: string | null
          download_count: number | null
          file_name: string
          file_type: string
          file_url: string
          id: string
          level: string | null
          semester: string | null
          title: string
          updated_at: string
          uploader_id: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          description?: string | null
          download_count?: number | null
          file_name: string
          file_type: string
          file_url: string
          id?: string
          level?: string | null
          semester?: string | null
          title: string
          updated_at?: string
          uploader_id: string
        }
        Update: {
          created_at?: string
          department?: string | null
          description?: string | null
          download_count?: number | null
          file_name?: string
          file_type?: string
          file_url?: string
          id?: string
          level?: string | null
          semester?: string | null
          title?: string
          updated_at?: string
          uploader_id?: string
        }
        Relationships: []
      }
      ad_clicks: {
        Row: {
          ad_id: string
          clicked_at: string
          id: string
          slide_index: number
          user_id: string | null
        }
        Insert: {
          ad_id: string
          clicked_at?: string
          id?: string
          slide_index?: number
          user_id?: string | null
        }
        Update: {
          ad_id?: string
          clicked_at?: string
          id?: string
          slide_index?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_clicks_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "feed_ads"
            referencedColumns: ["id"]
          },
        ]
      }
      airtime_codes: {
        Row: {
          added_by: string
          amount: number
          code: string
          created_at: string
          id: string
          is_used: boolean
          network: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          added_by: string
          amount?: number
          code: string
          created_at?: string
          id?: string
          is_used?: boolean
          network: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          added_by?: string
          amount?: number
          code?: string
          created_at?: string
          id?: string
          is_used?: boolean
          network?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      app_messages: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean | null
          target_department: string | null
          target_level: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean | null
          target_department?: string | null
          target_level?: string | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean | null
          target_department?: string | null
          target_level?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_update_reads: {
        Row: {
          read_at: string
          update_id: string
          user_id: string
        }
        Insert: {
          read_at?: string
          update_id: string
          user_id: string
        }
        Update: {
          read_at?: string
          update_id?: string
          user_id?: string
        }
        Relationships: []
      }
      app_updates: {
        Row: {
          created_at: string
          created_by: string
          id: string
          message: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          message: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          message?: string
          title?: string
        }
        Relationships: []
      }
      audio_clips: {
        Row: {
          audio_url: string
          created_at: string | null
          created_by: string
          id: string
          is_active: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          audio_url: string
          created_at?: string | null
          created_by: string
          id?: string
          is_active?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          audio_url?: string
          created_at?: string | null
          created_by?: string
          id?: string
          is_active?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      bot_post_history: {
        Row: {
          category: string
          created_at: string
          id: string
          post_id: string | null
          source: string | null
          title: string
          title_hash: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          post_id?: string | null
          source?: string | null
          title: string
          title_hash: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          post_id?: string | null
          source?: string | null
          title?: string
          title_hash?: string
        }
        Relationships: []
      }
      bot_post_queue: {
        Row: {
          category: string | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          post_id: string | null
          posted: boolean
          posted_at: string | null
          title: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          post_id?: string | null
          posted?: boolean
          posted_at?: string | null
          title: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          post_id?: string | null
          posted?: boolean
          posted_at?: string | null
          title?: string
        }
        Relationships: []
      }
      bot_settings: {
        Row: {
          bot_user_id: string | null
          enabled: boolean
          id: number
          interval_minutes: number
          last_run_at: string | null
          queue_only: boolean
          updated_at: string
        }
        Insert: {
          bot_user_id?: string | null
          enabled?: boolean
          id?: number
          interval_minutes?: number
          last_run_at?: string | null
          queue_only?: boolean
          updated_at?: string
        }
        Update: {
          bot_user_id?: string | null
          enabled?: boolean
          id?: number
          interval_minutes?: number
          last_run_at?: string | null
          queue_only?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          file_type: string | null
          file_url: string | null
          id: string
          room_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          file_type?: string | null
          file_url?: string | null
          id?: string
          room_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          file_type?: string | null
          file_url?: string | null
          id?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          created_at: string
          department: Database["public"]["Enums"]["department"] | null
          id: string
          name: string
          type: string
        }
        Insert: {
          created_at?: string
          department?: Database["public"]["Enums"]["department"] | null
          id?: string
          name: string
          type: string
        }
        Update: {
          created_at?: string
          department?: Database["public"]["Enums"]["department"] | null
          id?: string
          name?: string
          type?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          image_url: string | null
          is_anonymous: boolean | null
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_anonymous?: boolean | null
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_anonymous?: boolean | null
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_info: {
        Row: {
          content: string
          created_at: string
          duration: string | null
          id: string
          is_active: boolean | null
          purpose: string | null
          sort_order: number | null
          title: string
          type: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          content: string
          created_at?: string
          duration?: string | null
          id?: string
          is_active?: boolean | null
          purpose?: string | null
          sort_order?: number | null
          title: string
          type: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          content?: string
          created_at?: string
          duration?: string | null
          id?: string
          is_active?: boolean | null
          purpose?: string | null
          sort_order?: number | null
          title?: string
          type?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: []
      }
      content_views: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          admin_notes: string | null
          approval_status: Database["public"]["Enums"]["approval_status"] | null
          correct_option: number | null
          created_at: string
          creator_id: string | null
          description: string | null
          ends_at: string
          id: string
          is_resolved: boolean | null
          option_a: string | null
          option_b: string | null
          options: Json
          requires_payment: boolean | null
          short_id: string | null
          starts_at: string
          title: string
        }
        Insert: {
          admin_notes?: string | null
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          correct_option?: number | null
          created_at?: string
          creator_id?: string | null
          description?: string | null
          ends_at: string
          id?: string
          is_resolved?: boolean | null
          option_a?: string | null
          option_b?: string | null
          options?: Json
          requires_payment?: boolean | null
          short_id?: string | null
          starts_at: string
          title: string
        }
        Update: {
          admin_notes?: string | null
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          correct_option?: number | null
          created_at?: string
          creator_id?: string | null
          description?: string | null
          ends_at?: string
          id?: string
          is_resolved?: boolean | null
          option_a?: string | null
          option_b?: string | null
          options?: Json
          requires_payment?: boolean | null
          short_id?: string | null
          starts_at?: string
          title?: string
        }
        Relationships: []
      }
      feed_ads: {
        Row: {
          click_count: number
          created_at: string
          created_by: string
          id: string
          image_urls: string[]
          impression_count: number
          is_active: boolean
          link: string | null
          placement: string
          slide_links: string[] | null
          slide_titles: string[] | null
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          click_count?: number
          created_at?: string
          created_by: string
          id?: string
          image_urls?: string[]
          impression_count?: number
          is_active?: boolean
          link?: string | null
          placement?: string
          slide_links?: string[] | null
          slide_titles?: string[] | null
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          click_count?: number
          created_at?: string
          created_by?: string
          id?: string
          image_urls?: string[]
          impression_count?: number
          is_active?: boolean
          link?: string | null
          placement?: string
          slide_links?: string[] | null
          slide_titles?: string[] | null
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      food_pantries: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          location: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          location: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          location?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      game_scores: {
        Row: {
          created_at: string
          game_type: string
          id: string
          played_at: string | null
          score: number
          user_id: string
        }
        Insert: {
          created_at?: string
          game_type: string
          id?: string
          played_at?: string | null
          score: number
          user_id: string
        }
        Update: {
          created_at?: string
          game_type?: string
          id?: string
          played_at?: string | null
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          role: string
          status: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          role?: string
          status?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          role?: string
          status?: string
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
      group_posts: {
        Row: {
          comments_count: number | null
          content: string
          created_at: string
          file_type: string | null
          file_url: string | null
          group_id: string
          id: string
          image_url: string | null
          is_anonymous: boolean | null
          is_pinned: boolean | null
          likes_count: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          comments_count?: number | null
          content: string
          created_at?: string
          file_type?: string | null
          file_url?: string | null
          group_id: string
          id?: string
          image_url?: string | null
          is_anonymous?: boolean | null
          is_pinned?: boolean | null
          likes_count?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          comments_count?: number | null
          content?: string
          created_at?: string
          file_type?: string | null
          file_url?: string | null
          group_id?: string
          id?: string
          image_url?: string | null
          is_anonymous?: boolean | null
          is_pinned?: boolean | null
          likes_count?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_posts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          allow_anonymous_posts: boolean | null
          avatar_url: string | null
          created_at: string
          creator_id: string
          description: string | null
          group_type: Database["public"]["Enums"]["group_type"]
          id: string
          is_official: boolean | null
          name: string
          updated_at: string
          visibility: Database["public"]["Enums"]["group_visibility"]
        }
        Insert: {
          allow_anonymous_posts?: boolean | null
          avatar_url?: string | null
          created_at?: string
          creator_id: string
          description?: string | null
          group_type?: Database["public"]["Enums"]["group_type"]
          id?: string
          is_official?: boolean | null
          name: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["group_visibility"]
        }
        Update: {
          allow_anonymous_posts?: boolean | null
          avatar_url?: string | null
          created_at?: string
          creator_id?: string
          description?: string | null
          group_type?: Database["public"]["Enums"]["group_type"]
          id?: string
          is_official?: boolean | null
          name?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["group_visibility"]
        }
        Relationships: []
      }
      listing_likes: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_likes_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          admin_notes: string | null
          approval_status: Database["public"]["Enums"]["approval_status"] | null
          category: string | null
          created_at: string
          description: string
          discount_price: number | null
          id: string
          image_url: string | null
          is_pinned: boolean | null
          is_sold: boolean | null
          is_sponsored: boolean | null
          likes_count: number | null
          price: number
          seller_id: string
          short_id: string | null
          title: string
          updated_at: string
          view_count: number | null
          whatsapp_link: string | null
        }
        Insert: {
          admin_notes?: string | null
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          category?: string | null
          created_at?: string
          description: string
          discount_price?: number | null
          id?: string
          image_url?: string | null
          is_pinned?: boolean | null
          is_sold?: boolean | null
          is_sponsored?: boolean | null
          likes_count?: number | null
          price: number
          seller_id: string
          short_id?: string | null
          title: string
          updated_at?: string
          view_count?: number | null
          whatsapp_link?: string | null
        }
        Update: {
          admin_notes?: string | null
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          category?: string | null
          created_at?: string
          description?: string
          discount_price?: number | null
          id?: string
          image_url?: string | null
          is_pinned?: boolean | null
          is_sold?: boolean | null
          is_sponsored?: boolean | null
          likes_count?: number | null
          price?: number
          seller_id?: string
          short_id?: string | null
          title?: string
          updated_at?: string
          view_count?: number | null
          whatsapp_link?: string | null
        }
        Relationships: []
      }
      misplaced_items: {
        Row: {
          contact_info: string | null
          created_at: string | null
          description: string
          id: string
          image_url: string | null
          is_resolved: boolean | null
          item_name: string
          last_seen_location: string | null
          pickup_location: string | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          contact_info?: string | null
          created_at?: string | null
          description: string
          id?: string
          image_url?: string | null
          is_resolved?: boolean | null
          item_name: string
          last_seen_location?: string | null
          pickup_location?: string | null
          type?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          contact_info?: string | null
          created_at?: string | null
          description?: string
          id?: string
          image_url?: string | null
          is_resolved?: boolean | null
          item_name?: string
          last_seen_location?: string | null
          pickup_location?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      monetization_rewards: {
        Row: {
          amount: number
          created_at: string
          id: string
          network: string
          notes: string | null
          paid_at: string | null
          post_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          network?: string
          notes?: string | null
          paid_at?: string | null
          post_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          network?: string
          notes?: string | null
          paid_at?: string | null
          post_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      pinned_rules: {
        Row: {
          content: string
          created_at: string
          display_locations: string[] | null
          id: string
          is_active: boolean | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          display_locations?: string[] | null
          id?: string
          is_active?: boolean | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          display_locations?: string[] | null
          id?: string
          is_active?: boolean | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      point_awards: {
        Row: {
          award_day: string
          award_type: string
          created_at: string
          id: string
          points: number
          target_post_id: string | null
          user_id: string
        }
        Insert: {
          award_day?: string
          award_type: string
          created_at?: string
          id?: string
          points?: number
          target_post_id?: string | null
          user_id: string
        }
        Update: {
          award_day?: string
          award_type?: string
          created_at?: string
          id?: string
          points?: number
          target_post_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_private_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          post_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          post_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          post_id?: string
        }
        Relationships: []
      }
      post_votes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
          vote: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
          vote: boolean
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
          vote?: boolean
        }
        Relationships: []
      }
      posts: {
        Row: {
          admin_notes: string | null
          approval_status: Database["public"]["Enums"]["approval_status"] | null
          comments_count: number | null
          content: string
          created_at: string
          has_links: boolean | null
          id: string
          image_url: string | null
          image_urls: string[] | null
          is_anonymous: boolean | null
          is_bot_post: boolean
          is_important: boolean | null
          is_monetized: boolean
          is_sponsored: boolean | null
          likes_count: number | null
          payout_method: string | null
          points_status: string
          short_id: string | null
          title: string
          updated_at: string
          user_id: string
          view_count: number | null
          was_rewarded: boolean
        }
        Insert: {
          admin_notes?: string | null
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          comments_count?: number | null
          content: string
          created_at?: string
          has_links?: boolean | null
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          is_anonymous?: boolean | null
          is_bot_post?: boolean
          is_important?: boolean | null
          is_monetized?: boolean
          is_sponsored?: boolean | null
          likes_count?: number | null
          payout_method?: string | null
          points_status?: string
          short_id?: string | null
          title: string
          updated_at?: string
          user_id: string
          view_count?: number | null
          was_rewarded?: boolean
        }
        Update: {
          admin_notes?: string | null
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          comments_count?: number | null
          content?: string
          created_at?: string
          has_links?: boolean | null
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          is_anonymous?: boolean | null
          is_bot_post?: boolean
          is_important?: boolean | null
          is_monetized?: boolean
          is_sponsored?: boolean | null
          likes_count?: number | null
          payout_method?: string | null
          points_status?: string
          short_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          view_count?: number | null
          was_rewarded?: boolean
        }
        Relationships: []
      }
      predictions: {
        Row: {
          created_at: string
          event_id: string
          id: string
          is_correct: boolean | null
          selected_option: number
          terms_accepted: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          is_correct?: boolean | null
          selected_option: number
          terms_accepted?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          is_correct?: boolean | null
          selected_option?: number
          terms_accepted?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "predictions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      private_messages: {
        Row: {
          content: string
          created_at: string
          file_type: string | null
          file_url: string | null
          id: string
          is_read: boolean | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_read?: boolean | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_read?: boolean | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          department: string
          display_number: number | null
          faculty: string | null
          full_name: string
          gender: Database["public"]["Enums"]["gender"] | null
          id: string
          is_anonymous: boolean | null
          is_official: boolean | null
          level: Database["public"]["Enums"]["student_level"]
          monetization_override: boolean
          official_title: string | null
          payout_network: string | null
          payout_phone: string | null
          phone_number: string | null
          points: number | null
          reg_number: string | null
          system_id: string | null
          updated_at: string
          user_id: string
          user_role: Database["public"]["Enums"]["user_role_type"] | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          department?: string
          display_number?: number | null
          faculty?: string | null
          full_name: string
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          is_anonymous?: boolean | null
          is_official?: boolean | null
          level: Database["public"]["Enums"]["student_level"]
          monetization_override?: boolean
          official_title?: string | null
          payout_network?: string | null
          payout_phone?: string | null
          phone_number?: string | null
          points?: number | null
          reg_number?: string | null
          system_id?: string | null
          updated_at?: string
          user_id: string
          user_role?: Database["public"]["Enums"]["user_role_type"] | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          department?: string
          display_number?: number | null
          faculty?: string | null
          full_name?: string
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          is_anonymous?: boolean | null
          is_official?: boolean | null
          level?: Database["public"]["Enums"]["student_level"]
          monetization_override?: boolean
          official_title?: string | null
          payout_network?: string | null
          payout_phone?: string | null
          phone_number?: string | null
          points?: number | null
          reg_number?: string | null
          system_id?: string | null
          updated_at?: string
          user_id?: string
          user_role?: Database["public"]["Enums"]["user_role_type"] | null
          username?: string | null
        }
        Relationships: []
      }
      saved_posts: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      school_announcements: {
        Row: {
          content: string | null
          created_at: string
          created_by: string
          id: string
          image_url: string | null
          is_pinned: boolean | null
          short_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          created_by: string
          id?: string
          image_url?: string | null
          is_pinned?: boolean | null
          short_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          created_by?: string
          id?: string
          image_url?: string | null
          is_pinned?: boolean | null
          short_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      school_events: {
        Row: {
          admin_notes: string | null
          approval_status: Database["public"]["Enums"]["approval_status"] | null
          created_at: string
          creator_id: string
          description: string | null
          event_date: string
          id: string
          is_pinned: boolean | null
          location: string | null
          title: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          created_at?: string
          creator_id: string
          description?: string | null
          event_date: string
          id?: string
          is_pinned?: boolean | null
          location?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          created_at?: string
          creator_id?: string
          description?: string | null
          event_date?: string
          id?: string
          is_pinned?: boolean | null
          location?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      sponsored_post_privileges: {
        Row: {
          assigned_by: string
          created_at: string
          days_allowed: number
          expires_at: string | null
          id: string
          posts_allowed: number
          posts_used: number
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_by: string
          created_at?: string
          days_allowed?: number
          expires_at?: string | null
          id?: string
          posts_allowed?: number
          posts_used?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_by?: string
          created_at?: string
          days_allowed?: number
          expires_at?: string | null
          id?: string
          posts_allowed?: number
          posts_used?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      task_applications: {
        Row: {
          applicant_id: string
          created_at: string
          id: string
          status: string
          task_id: string
        }
        Insert: {
          applicant_id: string
          created_at?: string
          id?: string
          status?: string
          task_id: string
        }
        Update: {
          applicant_id?: string
          created_at?: string
          id?: string
          status?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_applications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          acceptor_id: string | null
          admin_notes: string | null
          approval_status: Database["public"]["Enums"]["approval_status"] | null
          created_at: string
          deadline: string | null
          description: string
          gender_restriction: Database["public"]["Enums"]["gender"] | null
          id: string
          image_url: string | null
          image_urls: string[] | null
          is_pinned: boolean | null
          payment_confirmed: boolean | null
          poster_id: string
          reward: string
          short_id: string | null
          status: Database["public"]["Enums"]["task_status"] | null
          title: string
          updated_at: string
          urgency: string | null
          view_count: number | null
          whatsapp_link: string | null
          worker_notes: string | null
          worker_submission_url: string | null
        }
        Insert: {
          acceptor_id?: string | null
          admin_notes?: string | null
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          created_at?: string
          deadline?: string | null
          description: string
          gender_restriction?: Database["public"]["Enums"]["gender"] | null
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          is_pinned?: boolean | null
          payment_confirmed?: boolean | null
          poster_id: string
          reward: string
          short_id?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          title: string
          updated_at?: string
          urgency?: string | null
          view_count?: number | null
          whatsapp_link?: string | null
          worker_notes?: string | null
          worker_submission_url?: string | null
        }
        Update: {
          acceptor_id?: string | null
          admin_notes?: string | null
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          created_at?: string
          deadline?: string | null
          description?: string
          gender_restriction?: Database["public"]["Enums"]["gender"] | null
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          is_pinned?: boolean | null
          payment_confirmed?: boolean | null
          poster_id?: string
          reward?: string
          short_id?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          title?: string
          updated_at?: string
          urgency?: string | null
          view_count?: number | null
          whatsapp_link?: string | null
          worker_notes?: string | null
          worker_submission_url?: string | null
        }
        Relationships: []
      }
      transport_drivers: {
        Row: {
          added_by: string
          created_at: string | null
          id: string
          is_active: boolean | null
          is_available: boolean
          name: string
          phone_number: string | null
          user_id: string | null
          vehicle_info: string | null
          vehicle_photo_url: string | null
        }
        Insert: {
          added_by: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_available?: boolean
          name: string
          phone_number?: string | null
          user_id?: string | null
          vehicle_info?: string | null
          vehicle_photo_url?: string | null
        }
        Update: {
          added_by?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_available?: boolean
          name?: string
          phone_number?: string | null
          user_id?: string | null
          vehicle_info?: string | null
          vehicle_photo_url?: string | null
        }
        Relationships: []
      }
      transport_pickup_points: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      transport_requests: {
        Row: {
          created_at: string | null
          destination: string
          driver_id: string | null
          expires_at: string | null
          group_key: string | null
          id: string
          is_urgent: boolean
          location_photo_url: string | null
          phone_number: string | null
          pickup_point_id: string | null
          ride_code: string | null
          ride_type: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          destination: string
          driver_id?: string | null
          expires_at?: string | null
          group_key?: string | null
          id?: string
          is_urgent?: boolean
          location_photo_url?: string | null
          phone_number?: string | null
          pickup_point_id?: string | null
          ride_code?: string | null
          ride_type?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          destination?: string
          driver_id?: string | null
          expires_at?: string | null
          group_key?: string | null
          id?: string
          is_urgent?: boolean
          location_photo_url?: string | null
          phone_number?: string | null
          pickup_point_id?: string | null
          ride_code?: string | null
          ride_type?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_requests_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "transport_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_requests_pickup_point_id_fkey"
            columns: ["pickup_point_id"]
            isOneToOne: false
            referencedRelation: "transport_pickup_points"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_ride_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          request_id: string | null
          ride_type: string
          used: boolean
          used_at: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          request_id?: string | null
          ride_type?: string
          used?: boolean
          used_at?: string | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          request_id?: string | null
          ride_type?: string
          used?: boolean
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      transport_settings: {
        Row: {
          id: string
          normal_fare: number
          normal_threshold: number
          updated_at: string
          urgent_fare: number
        }
        Insert: {
          id?: string
          normal_fare?: number
          normal_threshold?: number
          updated_at?: string
          urgent_fare?: number
        }
        Update: {
          id?: string
          normal_fare?: number
          normal_threshold?: number
          updated_at?: string
          urgent_fare?: number
        }
        Relationships: []
      }
      transport_verified_students: {
        Row: {
          added_by: string | null
          can_request_codes: boolean
          can_request_normal: boolean
          can_request_urgent: boolean
          created_at: string
          id: string
          is_driver: boolean
          quota_normal: number
          quota_urgent: number
          updated_at: string
          used_normal: number
          used_urgent: number
          user_id: string
        }
        Insert: {
          added_by?: string | null
          can_request_codes?: boolean
          can_request_normal?: boolean
          can_request_urgent?: boolean
          created_at?: string
          id?: string
          is_driver?: boolean
          quota_normal?: number
          quota_urgent?: number
          updated_at?: string
          used_normal?: number
          used_urgent?: number
          user_id: string
        }
        Update: {
          added_by?: string | null
          can_request_codes?: boolean
          can_request_normal?: boolean
          can_request_urgent?: boolean
          created_at?: string
          id?: string
          is_driver?: boolean
          quota_normal?: number
          quota_urgent?: number
          updated_at?: string
          used_normal?: number
          used_urgent?: number
          user_id?: string
        }
        Relationships: []
      }
      user_bans: {
        Row: {
          banned_by: string
          banned_from: string
          created_at: string
          expires_at: string | null
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          banned_by: string
          banned_from: string
          created_at?: string
          expires_at?: string | null
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          banned_by?: string
          banned_from?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          is_super_admin: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          is_super_admin?: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          is_super_admin?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_completions: {
        Row: {
          completed_at: string
          id: string
          points_awarded: number
          task_id: string
          user_id: string
          watch_seconds: number
        }
        Insert: {
          completed_at?: string
          id?: string
          points_awarded?: number
          task_id: string
          user_id: string
          watch_seconds?: number
        }
        Update: {
          completed_at?: string
          id?: string
          points_awarded?: number
          task_id?: string
          user_id?: string
          watch_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "video_completions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "video_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      video_tasks: {
        Row: {
          allow_rewatch: boolean
          completion_count: number
          created_at: string
          created_by: string
          embed_url: string
          id: string
          is_active: boolean
          original_url: string | null
          platform: string
          points_reward: number
          required_seconds: number
          title: string
          updated_at: string
          url: string
          view_count: number
        }
        Insert: {
          allow_rewatch?: boolean
          completion_count?: number
          created_at?: string
          created_by: string
          embed_url: string
          id?: string
          is_active?: boolean
          original_url?: string | null
          platform: string
          points_reward?: number
          required_seconds?: number
          title: string
          updated_at?: string
          url: string
          view_count?: number
        }
        Update: {
          allow_rewatch?: boolean
          completion_count?: number
          created_at?: string
          created_by?: string
          embed_url?: string
          id?: string
          is_active?: boolean
          original_url?: string | null
          platform?: string
          points_reward?: number
          required_seconds?: number
          title?: string
          updated_at?: string
          url?: string
          view_count?: number
        }
        Relationships: []
      }
      video_views: {
        Row: {
          id: string
          started_at: string
          task_id: string
          user_id: string | null
        }
        Insert: {
          id?: string
          started_at?: string
          task_id: string
          user_id?: string | null
        }
        Update: {
          id?: string
          started_at?: string
          task_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_views_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "video_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      welfare_claims: {
        Row: {
          claimed_at: string
          id: string
          user_id: string
        }
        Insert: {
          claimed_at?: string
          id?: string
          user_id: string
        }
        Update: {
          claimed_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      welfare_codes: {
        Row: {
          claimed_by: string | null
          code: string
          created_at: string | null
          id: string
          is_claimed: boolean | null
        }
        Insert: {
          claimed_by?: string | null
          code: string
          created_at?: string | null
          id?: string
          is_claimed?: boolean | null
        }
        Update: {
          claimed_by?: string | null
          code?: string
          created_at?: string | null
          id?: string
          is_claimed?: boolean | null
        }
        Relationships: []
      }
      welfare_items: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          item_type: string
          name: string
          quantity: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          item_type?: string
          name: string
          quantity?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          item_type?: string
          name?: string
          quantity?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          account_name: string
          account_number: string
          admin_notes: string | null
          bank_name: string
          created_at: string
          id: string
          points: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name: string
          account_number: string
          admin_notes?: string | null
          bank_name: string
          created_at?: string
          id?: string
          points: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string
          account_number?: string
          admin_notes?: string | null
          bank_name?: string
          created_at?: string
          id?: string
          points?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_decide_post_points: {
        Args: { _approve: boolean; _post_id: string }
        Returns: string
      }
      award_points: {
        Args: { _post_id: string; _type: string; _user_id: string }
        Returns: undefined
      }
      complete_video_task: {
        Args: { _task_id: string; _watched: number }
        Returns: string
      }
      generate_short_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_ad_click: {
        Args: { _ad_id: string; _slide: number }
        Returns: undefined
      }
      notify_admins_pending_approval: {
        Args: { _kind: string; _ref_id: string; _title: string }
        Returns: undefined
      }
      register_video_view: { Args: { _task_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      approval_status: "pending" | "approved" | "rejected"
      department:
        | "computer_science"
        | "engineering"
        | "business"
        | "medicine"
        | "law"
        | "arts"
        | "sciences"
        | "education"
      gender: "male" | "female"
      group_type: "social" | "academic" | "club" | "official"
      group_visibility: "public" | "private"
      student_level: "100" | "200" | "300" | "400" | "500"
      task_status: "open" | "in_progress" | "completed" | "cancelled"
      user_role_type:
        | "student"
        | "course_rep"
        | "sug_official"
        | "lecturer"
        | "staff"
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
      approval_status: ["pending", "approved", "rejected"],
      department: [
        "computer_science",
        "engineering",
        "business",
        "medicine",
        "law",
        "arts",
        "sciences",
        "education",
      ],
      gender: ["male", "female"],
      group_type: ["social", "academic", "club", "official"],
      group_visibility: ["public", "private"],
      student_level: ["100", "200", "300", "400", "500"],
      task_status: ["open", "in_progress", "completed", "cancelled"],
      user_role_type: [
        "student",
        "course_rep",
        "sug_official",
        "lecturer",
        "staff",
      ],
    },
  },
} as const

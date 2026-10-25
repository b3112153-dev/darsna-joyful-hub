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
      avatar_catalog: {
        Row: {
          active: boolean
          category: string
          gender: string
          id: string
          level_req: number
          name_ar: string
          name_en: string
          price: number
          sort: number
        }
        Insert: {
          active?: boolean
          category: string
          gender?: string
          id: string
          level_req?: number
          name_ar: string
          name_en: string
          price: number
          sort?: number
        }
        Update: {
          active?: boolean
          category?: string
          gender?: string
          id?: string
          level_req?: number
          name_ar?: string
          name_en?: string
          price?: number
          sort?: number
        }
        Relationships: []
      }
      avatar_images: {
        Row: {
          key: string
          url: string
        }
        Insert: {
          key: string
          url: string
        }
        Update: {
          key?: string
          url?: string
        }
        Relationships: []
      }
      banned_devices: {
        Row: {
          created_at: string
          device_id: string
          fingerprint: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device_id: string
          fingerprint?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string
          fingerprint?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      curriculum_units: {
        Row: {
          created_at: string
          created_by: string | null
          generation: string
          id: string
          lessons: number
          semester: number
          subject: string
          title: string
          track: string
          unit_no: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          generation: string
          id?: string
          lessons?: number
          semester: number
          subject: string
          title: string
          track?: string
          unit_no?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          generation?: string
          id?: string
          lessons?: number
          semester?: number
          subject?: string
          title?: string
          track?: string
          unit_no?: number
        }
        Relationships: []
      }
      dhikr_daily: {
        Row: {
          day: string
          items: Json
          user_id: string
        }
        Insert: {
          day: string
          items?: Json
          user_id?: string
        }
        Update: {
          day?: string
          items?: Json
          user_id?: string
        }
        Relationships: []
      }
      dhikr_stories: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string
          sort: number
          source: string | null
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          kind: string
          sort?: number
          source?: string | null
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          sort?: number
          source?: string | null
          title?: string
        }
        Relationships: []
      }
      dhikra_posts: {
        Row: {
          created_at: string
          created_by: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          kind: string
          note: string | null
          post_date: string
          title: string
          youtube_url: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          kind: string
          note?: string | null
          post_date?: string
          title: string
          youtube_url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          kind?: string
          note?: string | null
          post_date?: string
          title?: string
          youtube_url?: string | null
        }
        Relationships: []
      }
      focus_sessions: {
        Row: {
          duration_seconds: number
          ends_at: string | null
          finished_at: string | null
          id: string
          remaining_seconds: number
          room_id: string | null
          started_at: string
          status: string
          studied_seconds: number
          subject: string
          user_id: string
        }
        Insert: {
          duration_seconds: number
          ends_at?: string | null
          finished_at?: string | null
          id?: string
          remaining_seconds: number
          room_id?: string | null
          started_at?: string
          status?: string
          studied_seconds?: number
          subject?: string
          user_id: string
        }
        Update: {
          duration_seconds?: number
          ends_at?: string | null
          finished_at?: string | null
          id?: string
          remaining_seconds?: number
          room_id?: string | null
          started_at?: string
          status?: string
          studied_seconds?: number
          subject?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "focus_sessions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "focus_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jd_ledger: {
        Row: {
          amount: number
          created_at: string
          id: string
          reason: string
          ref: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          reason: string
          ref?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          reason?: string
          ref?: string | null
          user_id?: string
        }
        Relationships: []
      }
      library_files: {
        Row: {
          branch: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          file_name: string
          file_path: string
          file_size: number | null
          generation: string | null
          id: string
          reject_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          round_id: string | null
          status: string
          subject: string
          title: string
          unit: string | null
          uploaded_by: string | null
        }
        Insert: {
          branch?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          generation?: string | null
          id?: string
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          round_id?: string | null
          status?: string
          subject: string
          title: string
          unit?: string | null
          uploaded_by?: string | null
        }
        Update: {
          branch?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          generation?: string | null
          id?: string
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          round_id?: string | null
          status?: string
          subject?: string
          title?: string
          unit?: string | null
          uploaded_by?: string | null
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          edited_at: string | null
          from_admin: boolean
          id: string
          image_path: string | null
          reply_to: string | null
          room_id: string
          sender_role: string | null
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          edited_at?: string | null
          from_admin?: boolean
          id?: string
          image_path?: string | null
          reply_to?: string | null
          room_id: string
          sender_role?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          edited_at?: string | null
          from_admin?: boolean
          id?: string
          image_path?: string | null
          reply_to?: string | null
          room_id?: string
          sender_role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      motivation_posts: {
        Row: {
          content: string | null
          created_at: string
          from_admin: boolean
          id: string
          image_path: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          from_admin?: boolean
          id?: string
          image_path?: string | null
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          from_admin?: boolean
          id?: string
          image_path?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "motivation_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_items: {
        Row: {
          created_at: string
          day: string
          done: boolean
          id: string
          importance: number | null
          kind: string
          minutes: number
          quiz_id: string | null
          start_min: number
          subject: string
          title: string
          unit_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          day: string
          done?: boolean
          id?: string
          importance?: number | null
          kind: string
          minutes: number
          quiz_id?: string | null
          start_min?: number
          subject: string
          title: string
          unit_id?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          day?: string
          done?: boolean
          id?: string
          importance?: number | null
          kind?: string
          minutes?: number
          quiz_id?: string | null
          start_min?: number
          subject?: string
          title?: string
          unit_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar: Json
          avatar_url: string | null
          birth_date: string | null
          branch: Database["public"]["Enums"]["study_branch"] | null
          created_at: string
          display_name: string
          gender: string | null
          generation: string | null
          id: string
          nickname: string | null
          nickname_changed_at: string | null
          onboarded_v2: boolean
          terms_accepted_at: string | null
          terms_version: string | null
        }
        Insert: {
          avatar?: Json
          avatar_url?: string | null
          birth_date?: string | null
          branch?: Database["public"]["Enums"]["study_branch"] | null
          created_at?: string
          display_name?: string
          gender?: string | null
          generation?: string | null
          id: string
          nickname?: string | null
          nickname_changed_at?: string | null
          onboarded_v2?: boolean
          terms_accepted_at?: string | null
          terms_version?: string | null
        }
        Update: {
          avatar?: Json
          avatar_url?: string | null
          birth_date?: string | null
          branch?: Database["public"]["Enums"]["study_branch"] | null
          created_at?: string
          display_name?: string
          gender?: string | null
          generation?: string | null
          id?: string
          nickname?: string | null
          nickname_changed_at?: string | null
          onboarded_v2?: boolean
          terms_accepted_at?: string | null
          terms_version?: string | null
        }
        Relationships: []
      }
      quiz_answers: {
        Row: {
          correct_index: number
          question_id: string
        }
        Insert: {
          correct_index: number
          question_id: string
        }
        Update: {
          correct_index?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: true
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          created_at: string
          id: string
          quiz_id: string
          score: number
          total: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          quiz_id: string
          score: number
          total: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          quiz_id?: string
          score?: number
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          id: string
          options: Json
          position: number
          prompt: string
          quiz_id: string
        }
        Insert: {
          id?: string
          options: Json
          position?: number
          prompt: string
          quiz_id: string
        }
        Update: {
          id?: string
          options?: Json
          position?: number
          prompt?: string
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string
          created_by: string
          deleted_at: string | null
          deleted_by: string | null
          generation: string | null
          id: string
          minutes: number
          reject_reason: string | null
          required_from: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          subject: string
          title: string
          unit: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          deleted_by?: string | null
          generation?: string | null
          id?: string
          minutes?: number
          reject_reason?: string | null
          required_from?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          subject: string
          title: string
          unit?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          deleted_by?: string | null
          generation?: string | null
          id?: string
          minutes?: number
          reject_reason?: string | null
          required_from?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          subject?: string
          title?: string
          unit?: string | null
        }
        Relationships: []
      }
      room_notes: {
        Row: {
          content: string
          room_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          room_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          room_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_notes_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          audience: string
          branch: Database["public"]["Enums"]["study_branch"] | null
          created_at: string
          created_by: string | null
          description: string | null
          generation: string
          id: string
          kind: string
          max_members: number | null
          name: string
          scene: string | null
        }
        Insert: {
          audience?: string
          branch?: Database["public"]["Enums"]["study_branch"] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          generation?: string
          id?: string
          kind?: string
          max_members?: number | null
          name: string
          scene?: string | null
        }
        Update: {
          audience?: string
          branch?: Database["public"]["Enums"]["study_branch"] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          generation?: string
          id?: string
          kind?: string
          max_members?: number | null
          name?: string
          scene?: string | null
        }
        Relationships: []
      }
      session_participants: {
        Row: {
          joined_at: string
          session_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          session_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          id: number
          launch_date: string
          owner_id: string | null
          owner_name: string
        }
        Insert: {
          id?: number
          launch_date?: string
          owner_id?: string | null
          owner_name?: string
        }
        Update: {
          id?: number
          launch_date?: string
          owner_id?: string | null
          owner_name?: string
        }
        Relationships: []
      }
      study_plans: {
        Row: {
          answers: Json
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          answers?: Json
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          created_at: string
          created_by: string
          duration_minutes: number
          id: string
          room_id: string
          starts_at: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          duration_minutes: number
          id?: string
          room_id: string
          starts_at?: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          duration_minutes?: number
          id?: string
          room_id?: string
          starts_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_sessions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          edited_at: string | null
          id: string
          image_path: string | null
          reply_to: string | null
          sender_id: string
          student_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          edited_at?: string | null
          id?: string
          image_path?: string | null
          reply_to?: string | null
          sender_id: string
          student_id: string
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          edited_at?: string | null
          id?: string
          image_path?: string | null
          reply_to?: string | null
          sender_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "support_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_messages_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_reactions: {
        Row: {
          created_at: string
          emoji: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "support_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      todos: {
        Row: {
          created_at: string
          done: boolean
          done_at: string | null
          id: string
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          done_at?: string | null
          id?: string
          text: string
          user_id?: string
        }
        Update: {
          created_at?: string
          done?: boolean
          done_at?: string | null
          id?: string
          text?: string
          user_id?: string
        }
        Relationships: []
      }
      topic_comments: {
        Row: {
          content: string
          created_at: string
          from_admin: boolean
          id: string
          parent_id: string | null
          topic_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          from_admin?: boolean
          id?: string
          parent_id?: string | null
          topic_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          from_admin?: boolean
          id?: string
          parent_id?: string | null
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "topic_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_comments_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_reads: {
        Row: {
          created_at: string
          topic_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          topic_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_reads_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          allow_replies: boolean
          body: string
          created_at: string
          created_by: string
          id: string
          subject: string | null
          title: string
        }
        Insert: {
          allow_replies?: boolean
          body: string
          created_at?: string
          created_by: string
          id?: string
          subject?: string | null
          title: string
        }
        Update: {
          allow_replies?: boolean
          body?: string
          created_at?: string
          created_by?: string
          id?: string
          subject?: string | null
          title?: string
        }
        Relationships: []
      }
      user_bans: {
        Row: {
          banned_by: string | null
          created_at: string
          reason: string | null
          user_id: string
        }
        Insert: {
          banned_by?: string | null
          created_at?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          banned_by?: string | null
          created_at?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_devices: {
        Row: {
          device_id: string
          fingerprint: string | null
          last_seen: string
          user_id: string
        }
        Insert: {
          device_id: string
          fingerprint?: string | null
          last_seen?: string
          user_id: string
        }
        Update: {
          device_id?: string
          fingerprint?: string | null
          last_seen?: string
          user_id?: string
        }
        Relationships: []
      }
      user_items: {
        Row: {
          created_at: string
          item_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          item_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "avatar_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      user_mutes: {
        Row: {
          created_at: string
          muted_by: string | null
          muted_until: string
          user_id: string
        }
        Insert: {
          created_at?: string
          muted_by?: string | null
          muted_until: string
          user_id: string
        }
        Update: {
          created_at?: string
          muted_by?: string | null
          muted_until?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      buy_item: { Args: { _item: string }; Returns: Json }
      can_access_room: {
        Args: { _room_id: string; _user_id: string }
        Returns: boolean
      }
      can_see_quiz: { Args: { _qid: string; _uid: string }; Returns: boolean }
      can_support: { Args: { _user_id: string }; Returns: boolean }
      claim_last_week_prizes: { Args: never; Returns: undefined }
      close_study_room: { Args: { _id: string }; Returns: undefined }
      complete_onboarding: {
        Args: { _birth: string; _gender: string; _terms_version: string }
        Returns: undefined
      }
      create_study_room: {
        Args: { _name: string; _scene: string }
        Returns: string
      }
      device_is_banned: {
        Args: { _device_id: string; _fingerprint: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_banned: { Args: { _user_id: string }; Returns: boolean }
      is_focusing: { Args: { _user_id: string }; Returns: boolean }
      is_muted: { Args: { _user_id: string }; Returns: boolean }
      is_owner: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      level_of: { Args: { _uid: string }; Returns: number }
      my_wallet: { Args: never; Returns: Json }
      owner_list_emails: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
        }[]
      }
      penalize_missed_exams: { Args: never; Returns: number }
      register_device: {
        Args: { _device_id: string; _fingerprint: string }
        Returns: boolean
      }
      restore_deleted: {
        Args: { _id: string; _table: string }
        Returns: undefined
      }
      set_avatar: { Args: { _a: Json }; Returns: Json }
      set_nickname: { Args: { _n: string }; Returns: undefined }
      study_hours: { Args: { _uid: string }; Returns: number }
      submit_quiz: { Args: { _answers: Json; _quiz: string }; Returns: Json }
      submit_quiz_draft: {
        Args: {
          _minutes: number
          _questions: Json
          _subject: string
          _title: string
          _unit: string
        }
        Returns: string
      }
      weekly_board: {
        Args: { _offset?: number }
        Returns: {
          avatar: Json
          hours: number
          is_me: boolean
          nickname: string
          rank: number
          user_id: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "support"
      study_branch:
        | "scientific"
        | "literary"
        | "industrial"
        | "it"
        | "health"
        | "agricultural"
        | "home_economics"
        | "hospitality"
        | "health_engineering"
        | "business_languages"
        | "languages"
        | "business"
        | "engineering"
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
      app_role: ["admin", "moderator", "user", "support"],
      study_branch: [
        "scientific",
        "literary",
        "industrial",
        "it",
        "health",
        "agricultural",
        "home_economics",
        "hospitality",
        "health_engineering",
        "business_languages",
        "languages",
        "business",
        "engineering",
      ],
    },
  },
} as const

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
      achievements: {
        Row: {
          achieved_on: string | null
          created_at: string
          description: string | null
          id: string
          issuer: string | null
          proof_url: string | null
          title: string
          user_id: string
        }
        Insert: {
          achieved_on?: string | null
          created_at?: string
          description?: string | null
          id?: string
          issuer?: string | null
          proof_url?: string | null
          title: string
          user_id: string
        }
        Update: {
          achieved_on?: string | null
          created_at?: string
          description?: string | null
          id?: string
          issuer?: string | null
          proof_url?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          booking_url: string | null
          category: string | null
          confirmation_reference: string | null
          contact: string | null
          created_at: string
          id: string
          is_external: boolean
          location: string | null
          notes: string | null
          provider_id: string | null
          provider_name: string | null
          starts_at: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_url?: string | null
          category?: string | null
          confirmation_reference?: string | null
          contact?: string | null
          created_at?: string
          id?: string
          is_external?: boolean
          location?: string | null
          notes?: string | null
          provider_id?: string | null
          provider_name?: string | null
          starts_at?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_url?: string | null
          category?: string | null
          confirmation_reference?: string | null
          contact?: string | null
          created_at?: string
          id?: string
          is_external?: boolean
          location?: string | null
          notes?: string | null
          provider_id?: string | null
          provider_name?: string | null
          starts_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          created_at: string
          ends_at: string | null
          id: string
          kind: string
          location: string | null
          notes: string | null
          reminder_minutes: number | null
          starts_at: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          id?: string
          kind?: string
          location?: string | null
          notes?: string | null
          reminder_minutes?: number | null
          starts_at: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          id?: string
          kind?: string
          location?: string | null
          notes?: string | null
          reminder_minutes?: number | null
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          created_at: string
          id: string
          level: string | null
          notes: string | null
          pageant_name: string
          result: string | null
          user_id: string
          year: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          level?: string | null
          notes?: string | null
          pageant_name: string
          result?: string | null
          user_id: string
          year?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          level?: string | null
          notes?: string | null
          pageant_name?: string
          result?: string | null
          user_id?: string
          year?: number | null
        }
        Relationships: []
      }
      contestant_profiles: {
        Row: {
          activity_level: string | null
          avatar_url: string | null
          bio: string | null
          budget_band: string | null
          bust_cm: number | null
          city: string | null
          comp_card_url: string | null
          created_at: string
          daily_schedule: string | null
          date_of_birth: string | null
          dietary_preference: string | null
          dress_size: string | null
          education: string | null
          experience: string | null
          experience_level: string | null
          eye_color: string | null
          fitness_preferences: string | null
          food_allergies: string | null
          food_preferences: string | null
          full_name: string | null
          gender: string | null
          hair_color: string | null
          hair_concerns: string | null
          hair_type: string | null
          height_cm: number | null
          hips_cm: number | null
          improvement_areas: string[]
          is_public: boolean
          languages: string[]
          nationality: string | null
          onboarding_completed: boolean
          pageant_category: string | null
          preparation_level: string | null
          primary_goal: string | null
          public_slug: string | null
          resume_url: string | null
          shoe_size: string | null
          skills: string[]
          skin_concerns: string | null
          skin_type: string | null
          sleep_target_hours: number | null
          social_links: Json
          state: string | null
          step_target: number | null
          target_date: string | null
          target_pageant: string | null
          target_year: number | null
          training_minutes_per_day: number | null
          updated_at: string
          user_id: string
          waist_cm: number | null
          water_target_ml: number | null
          weight_kg: number | null
        }
        Insert: {
          activity_level?: string | null
          avatar_url?: string | null
          bio?: string | null
          budget_band?: string | null
          bust_cm?: number | null
          city?: string | null
          comp_card_url?: string | null
          created_at?: string
          daily_schedule?: string | null
          date_of_birth?: string | null
          dietary_preference?: string | null
          dress_size?: string | null
          education?: string | null
          experience?: string | null
          experience_level?: string | null
          eye_color?: string | null
          fitness_preferences?: string | null
          food_allergies?: string | null
          food_preferences?: string | null
          full_name?: string | null
          gender?: string | null
          hair_color?: string | null
          hair_concerns?: string | null
          hair_type?: string | null
          height_cm?: number | null
          hips_cm?: number | null
          improvement_areas?: string[]
          is_public?: boolean
          languages?: string[]
          nationality?: string | null
          onboarding_completed?: boolean
          pageant_category?: string | null
          preparation_level?: string | null
          primary_goal?: string | null
          public_slug?: string | null
          resume_url?: string | null
          shoe_size?: string | null
          skills?: string[]
          skin_concerns?: string | null
          skin_type?: string | null
          sleep_target_hours?: number | null
          social_links?: Json
          state?: string | null
          step_target?: number | null
          target_date?: string | null
          target_pageant?: string | null
          target_year?: number | null
          training_minutes_per_day?: number | null
          updated_at?: string
          user_id: string
          waist_cm?: number | null
          water_target_ml?: number | null
          weight_kg?: number | null
        }
        Update: {
          activity_level?: string | null
          avatar_url?: string | null
          bio?: string | null
          budget_band?: string | null
          bust_cm?: number | null
          city?: string | null
          comp_card_url?: string | null
          created_at?: string
          daily_schedule?: string | null
          date_of_birth?: string | null
          dietary_preference?: string | null
          dress_size?: string | null
          education?: string | null
          experience?: string | null
          experience_level?: string | null
          eye_color?: string | null
          fitness_preferences?: string | null
          food_allergies?: string | null
          food_preferences?: string | null
          full_name?: string | null
          gender?: string | null
          hair_color?: string | null
          hair_concerns?: string | null
          hair_type?: string | null
          height_cm?: number | null
          hips_cm?: number | null
          improvement_areas?: string[]
          is_public?: boolean
          languages?: string[]
          nationality?: string | null
          onboarding_completed?: boolean
          pageant_category?: string | null
          preparation_level?: string | null
          primary_goal?: string | null
          public_slug?: string | null
          resume_url?: string | null
          shoe_size?: string | null
          skills?: string[]
          skin_concerns?: string | null
          skin_type?: string | null
          sleep_target_hours?: number | null
          social_links?: Json
          state?: string | null
          step_target?: number | null
          target_date?: string | null
          target_pageant?: string | null
          target_year?: number | null
          training_minutes_per_day?: number | null
          updated_at?: string
          user_id?: string
          waist_cm?: number | null
          water_target_ml?: number | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      data_verification_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          source_url: string | null
          updated_by: string | null
          verification_status: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          source_url?: string | null
          updated_by?: string | null
          verification_status?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          source_url?: string | null
          updated_by?: string | null
          verification_status?: string | null
        }
        Relationships: []
      }
      diet_logs: {
        Row: {
          calories: number | null
          created_at: string
          description: string
          id: string
          logged_on: string
          meal: string
          notes: string | null
          user_id: string
        }
        Insert: {
          calories?: number | null
          created_at?: string
          description: string
          id?: string
          logged_on?: string
          meal?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          calories?: number | null
          created_at?: string
          description?: string
          id?: string
          logged_on?: string
          meal?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      digital_twin_snapshots: {
        Row: {
          components: Json
          created_at: string
          data_points: number
          id: string
          notes: string | null
          readiness: number | null
          user_id: string
        }
        Insert: {
          components?: Json
          created_at?: string
          data_points?: number
          id?: string
          notes?: string | null
          readiness?: number | null
          user_id: string
        }
        Update: {
          components?: Json
          created_at?: string
          data_points?: number
          id?: string
          notes?: string | null
          readiness?: number | null
          user_id?: string
        }
        Relationships: []
      }
      fitness_logs: {
        Row: {
          activity: string
          created_at: string
          duration_minutes: number | null
          id: string
          intensity: string | null
          logged_on: string
          notes: string | null
          user_id: string
        }
        Insert: {
          activity: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          intensity?: string | null
          logged_on?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          activity?: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          intensity?: string | null
          logged_on?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      interview_answers: {
        Row: {
          answer: string | null
          created_at: string
          feedback: string | null
          id: string
          overall_score: number | null
          question: string
          question_index: number
          scores: Json | null
          session_id: string
          user_id: string
        }
        Insert: {
          answer?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          overall_score?: number | null
          question: string
          question_index: number
          scores?: Json | null
          session_id: string
          user_id: string
        }
        Update: {
          answer?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          overall_score?: number | null
          question?: string
          question_index?: number
          scores?: Json | null
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_sessions: {
        Row: {
          completed_at: string | null
          final_score: number | null
          id: string
          mode: string
          panel_evaluations: Json | null
          question_count: number
          started_at: string
          status: string
          strengths: string[] | null
          summary: string | null
          user_id: string
          weaknesses: string[] | null
        }
        Insert: {
          completed_at?: string | null
          final_score?: number | null
          id?: string
          mode: string
          panel_evaluations?: Json | null
          question_count?: number
          started_at?: string
          status?: string
          strengths?: string[] | null
          summary?: string | null
          user_id: string
          weaknesses?: string[] | null
        }
        Update: {
          completed_at?: string | null
          final_score?: number | null
          id?: string
          mode?: string
          panel_evaluations?: Json | null
          question_count?: number
          started_at?: string
          status?: string
          strengths?: string[] | null
          summary?: string | null
          user_id?: string
          weaknesses?: string[] | null
        }
        Relationships: []
      }
      ml_predictions: {
        Row: {
          created_at: string
          feature_importance: Json | null
          features: Json | null
          id: string
          metrics: Json | null
          model_name: string
          model_version: string | null
          prediction: number | null
          target: string
          trained_at: string | null
          training_samples: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          feature_importance?: Json | null
          features?: Json | null
          id?: string
          metrics?: Json | null
          model_name: string
          model_version?: string | null
          prediction?: number | null
          target: string
          trained_at?: string | null
          training_samples?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          feature_importance?: Json | null
          features?: Json | null
          id?: string
          metrics?: Json | null
          model_name?: string
          model_version?: string | null
          prediction?: number | null
          target?: string
          trained_at?: string | null
          training_samples?: number | null
          user_id?: string
        }
        Relationships: []
      }
      mood_records: {
        Row: {
          confidence: number | null
          created_at: string
          energy: number | null
          estimated_state: string | null
          id: string
          journal_text: string | null
          positivity: number | null
          self_reported_mood: string | null
          source: string
          stress: number | null
          suggestions: string | null
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          energy?: number | null
          estimated_state?: string | null
          id?: string
          journal_text?: string | null
          positivity?: number | null
          self_reported_mood?: string | null
          source?: string
          stress?: number | null
          suggestions?: string | null
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          energy?: number | null
          estimated_state?: string | null
          id?: string
          journal_text?: string | null
          positivity?: number | null
          self_reported_mood?: string | null
          source?: string
          stress?: number | null
          suggestions?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          category: string
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          category?: string
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          category?: string
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      pageants: {
        Row: {
          application_fee: string | null
          application_url: string | null
          audition_date: string | null
          category: string | null
          city: string | null
          country: string | null
          created_at: string
          education_requirement: string | null
          eligibility: string | null
          finale_date: string | null
          id: string
          last_verified: string | null
          marital_requirement: string | null
          max_age: number | null
          min_age: number | null
          min_height_cm: number | null
          name: string
          nationality_requirement: string | null
          official_url: string | null
          organizer: string | null
          registration_close: string | null
          registration_open: string | null
          required_documents: string[] | null
          source_url: string | null
          state: string | null
          status: string
          updated_at: string
          verification_status: string
          verified: boolean
          verified_by: string | null
        }
        Insert: {
          application_fee?: string | null
          application_url?: string | null
          audition_date?: string | null
          category?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          education_requirement?: string | null
          eligibility?: string | null
          finale_date?: string | null
          id?: string
          last_verified?: string | null
          marital_requirement?: string | null
          max_age?: number | null
          min_age?: number | null
          min_height_cm?: number | null
          name: string
          nationality_requirement?: string | null
          official_url?: string | null
          organizer?: string | null
          registration_close?: string | null
          registration_open?: string | null
          required_documents?: string[] | null
          source_url?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          verification_status?: string
          verified?: boolean
          verified_by?: string | null
        }
        Update: {
          application_fee?: string | null
          application_url?: string | null
          audition_date?: string | null
          category?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          education_requirement?: string | null
          eligibility?: string | null
          finale_date?: string | null
          id?: string
          last_verified?: string | null
          marital_requirement?: string | null
          max_age?: number | null
          min_age?: number | null
          min_height_cm?: number | null
          name?: string
          nationality_requirement?: string | null
          official_url?: string | null
          organizer?: string | null
          registration_close?: string | null
          registration_open?: string | null
          required_documents?: string[] | null
          source_url?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          verification_status?: string
          verified?: boolean
          verified_by?: string | null
        }
        Relationships: []
      }
      portfolio_items: {
        Row: {
          caption: string | null
          category: string | null
          created_at: string
          credits: string | null
          description: string | null
          external_url: string | null
          id: string
          kind: string
          sort_order: number
          storage_path: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          caption?: string | null
          category?: string | null
          created_at?: string
          credits?: string | null
          description?: string | null
          external_url?: string | null
          id?: string
          kind: string
          sort_order?: number
          storage_path?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          caption?: string | null
          category?: string | null
          created_at?: string
          credits?: string | null
          description?: string | null
          external_url?: string | null
          id?: string
          kind?: string
          sort_order?: number
          storage_path?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      posture_records: {
        Row: {
          body_alignment: number | null
          created_at: string
          feedback: string | null
          head_position: number | null
          id: string
          metrics: Json
          posture_score: number | null
          shoulder_alignment: number | null
          user_id: string
        }
        Insert: {
          body_alignment?: number | null
          created_at?: string
          feedback?: string | null
          head_position?: number | null
          id?: string
          metrics?: Json
          posture_score?: number | null
          shoulder_alignment?: number | null
          user_id: string
        }
        Update: {
          body_alignment?: number | null
          created_at?: string
          feedback?: string | null
          head_position?: number | null
          id?: string
          metrics?: Json
          posture_score?: number | null
          shoulder_alignment?: number | null
          user_id?: string
        }
        Relationships: []
      }
      preparation_plans: {
        Row: {
          created_at: string
          focus_areas: string[]
          horizon_weeks: number | null
          id: string
          is_active: boolean
          summary: string | null
          target_date: string | null
          target_pageant: string | null
          updated_at: string
          user_id: string
          weeks: Json
        }
        Insert: {
          created_at?: string
          focus_areas?: string[]
          horizon_weeks?: number | null
          id?: string
          is_active?: boolean
          summary?: string | null
          target_date?: string | null
          target_pageant?: string | null
          updated_at?: string
          user_id: string
          weeks?: Json
        }
        Update: {
          created_at?: string
          focus_areas?: string[]
          horizon_weeks?: number | null
          id?: string
          is_active?: boolean
          summary?: string | null
          target_date?: string | null
          target_pageant?: string | null
          updated_at?: string
          user_id?: string
          weeks?: Json
        }
        Relationships: []
      }
      preparation_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          details: string | null
          due_date: string | null
          id: string
          stage: string
          title: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          details?: string | null
          due_date?: string | null
          id?: string
          stage: string
          title: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          details?: string | null
          due_date?: string | null
          id?: string
          stage?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      providers: {
        Row: {
          address: string | null
          booking_url: string | null
          category: string
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          instagram: string | null
          last_verified: string | null
          latitude: number | null
          longitude: number | null
          maps_url: string | null
          name: string
          opening_hours: Json | null
          phone: string | null
          photo_url: string | null
          place_id: string | null
          price_band: string | null
          rating: number | null
          review_count: number | null
          source: string | null
          source_url: string | null
          state: string | null
          subcategories: string[] | null
          updated_at: string
          verification_status: string
          verified: boolean
          verified_by: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          booking_url?: string | null
          category: string
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          instagram?: string | null
          last_verified?: string | null
          latitude?: number | null
          longitude?: number | null
          maps_url?: string | null
          name: string
          opening_hours?: Json | null
          phone?: string | null
          photo_url?: string | null
          place_id?: string | null
          price_band?: string | null
          rating?: number | null
          review_count?: number | null
          source?: string | null
          source_url?: string | null
          state?: string | null
          subcategories?: string[] | null
          updated_at?: string
          verification_status?: string
          verified?: boolean
          verified_by?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          booking_url?: string | null
          category?: string
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          instagram?: string | null
          last_verified?: string | null
          latitude?: number | null
          longitude?: number | null
          maps_url?: string | null
          name?: string
          opening_hours?: Json | null
          phone?: string | null
          photo_url?: string | null
          place_id?: string | null
          price_band?: string | null
          rating?: number | null
          review_count?: number | null
          source?: string | null
          source_url?: string | null
          state?: string | null
          subcategories?: string[] | null
          updated_at?: string
          verification_status?: string
          verified?: boolean
          verified_by?: string | null
          website?: string | null
        }
        Relationships: []
      }
      readiness_records: {
        Row: {
          components: Json
          confidence: number | null
          consistency: number | null
          created_at: string
          data_points: number
          id: string
          readiness: number | null
          stage: string | null
          user_id: string
        }
        Insert: {
          components?: Json
          confidence?: number | null
          consistency?: number | null
          created_at?: string
          data_points?: number
          id?: string
          readiness?: number | null
          stage?: string | null
          user_id: string
        }
        Update: {
          components?: Json
          confidence?: number | null
          consistency?: number | null
          created_at?: string
          data_points?: number
          id?: string
          readiness?: number | null
          stage?: string | null
          user_id?: string
        }
        Relationships: []
      }
      saved_items: {
        Row: {
          created_at: string
          id: string
          item_id: string | null
          item_type: string
          label: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id?: string | null
          item_type: string
          label?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string | null
          item_type?: string
          label?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sleep_logs: {
        Row: {
          bedtime: string | null
          created_at: string
          duration_hours: number | null
          id: string
          logged_on: string
          notes: string | null
          quality: number | null
          user_id: string
          wake_time: string | null
        }
        Insert: {
          bedtime?: string | null
          created_at?: string
          duration_hours?: number | null
          id?: string
          logged_on?: string
          notes?: string | null
          quality?: number | null
          user_id: string
          wake_time?: string | null
        }
        Update: {
          bedtime?: string | null
          created_at?: string
          duration_hours?: number | null
          id?: string
          logged_on?: string
          notes?: string | null
          quality?: number | null
          user_id?: string
          wake_time?: string | null
        }
        Relationships: []
      }
      step_logs: {
        Row: {
          created_at: string
          id: string
          logged_on: string
          source: string
          steps: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          logged_on?: string
          source?: string
          steps: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          logged_on?: string
          source?: string
          steps?: number
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
      voice_records: {
        Row: {
          clarity: number | null
          created_at: string
          duration_seconds: number | null
          feedback: string | null
          filler_word_count: number | null
          id: string
          modulation: number | null
          pause_count: number | null
          transcript: string | null
          user_id: string
          words_per_minute: number | null
        }
        Insert: {
          clarity?: number | null
          created_at?: string
          duration_seconds?: number | null
          feedback?: string | null
          filler_word_count?: number | null
          id?: string
          modulation?: number | null
          pause_count?: number | null
          transcript?: string | null
          user_id: string
          words_per_minute?: number | null
        }
        Update: {
          clarity?: number | null
          created_at?: string
          duration_seconds?: number | null
          feedback?: string | null
          filler_word_count?: number | null
          id?: string
          modulation?: number | null
          pause_count?: number | null
          transcript?: string | null
          user_id?: string
          words_per_minute?: number | null
        }
        Relationships: []
      }
      water_logs: {
        Row: {
          amount_ml: number
          created_at: string
          id: string
          logged_on: string
          user_id: string
        }
        Insert: {
          amount_ml: number
          created_at?: string
          id?: string
          logged_on?: string
          user_id: string
        }
        Update: {
          amount_ml?: number
          created_at?: string
          id?: string
          logged_on?: string
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

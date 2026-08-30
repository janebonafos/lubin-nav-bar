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
      ai_suggestion_runs: {
        Row: {
          allowed_medication_ids: string[]
          created_at: string
          draft_id: string | null
          encounter_id: string
          id: string
          model: string | null
          option_count: number
          outcome: string
          provider_user_id: string
          rejected_reason: string | null
        }
        Insert: {
          allowed_medication_ids?: string[]
          created_at?: string
          draft_id?: string | null
          encounter_id: string
          id?: string
          model?: string | null
          option_count?: number
          outcome?: string
          provider_user_id: string
          rejected_reason?: string | null
        }
        Update: {
          allowed_medication_ids?: string[]
          created_at?: string
          draft_id?: string | null
          encounter_id?: string
          id?: string
          model?: string | null
          option_count?: number
          outcome?: string
          provider_user_id?: string
          rejected_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_suggestion_runs_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "prescription_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_suggestion_runs_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "encounters"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_type: string | null
          created_at: string
          duration_minutes: number | null
          id: string
          jurisdiction_code: Database["public"]["Enums"]["jurisdiction_code"]
          mode: string | null
          patient_location_country: string | null
          patient_user_id: string | null
          provider_user_id: string
          scheduled_at: string | null
          session_format: string | null
          status: string
          timezone: string | null
          updated_at: string
        }
        Insert: {
          appointment_type?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          jurisdiction_code?: Database["public"]["Enums"]["jurisdiction_code"]
          mode?: string | null
          patient_location_country?: string | null
          patient_user_id?: string | null
          provider_user_id: string
          scheduled_at?: string | null
          session_format?: string | null
          status?: string
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          appointment_type?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          jurisdiction_code?: Database["public"]["Enums"]["jurisdiction_code"]
          mode?: string | null
          patient_location_country?: string | null
          patient_user_id?: string | null
          provider_user_id?: string
          scheduled_at?: string | null
          session_format?: string | null
          status?: string
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      assessments: {
        Row: {
          answers: Json
          created_at: string
          encounter_id: string | null
          id: string
          instrument: string
          patient_provided: boolean
          patient_user_id: string
          provider_reviewed_at: string | null
          provider_reviewed_by: string | null
          score: number | null
          status_label: string | null
          taken_at: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          encounter_id?: string | null
          id?: string
          instrument: string
          patient_provided?: boolean
          patient_user_id: string
          provider_reviewed_at?: string | null
          provider_reviewed_by?: string | null
          score?: number | null
          status_label?: string | null
          taken_at?: string
        }
        Update: {
          answers?: Json
          created_at?: string
          encounter_id?: string | null
          id?: string
          instrument?: string
          patient_provided?: boolean
          patient_user_id?: string
          provider_reviewed_at?: string | null
          provider_reviewed_by?: string | null
          score?: number | null
          status_label?: string | null
          taken_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "encounters"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_notes: {
        Row: {
          assessment: string | null
          author_user_id: string
          cosigned_at: string | null
          cosigned_by: string | null
          created_at: string
          encounter_id: string
          id: string
          note_type: string
          objective: string | null
          plan: string | null
          subjective: string | null
          updated_at: string
          version: number
        }
        Insert: {
          assessment?: string | null
          author_user_id: string
          cosigned_at?: string | null
          cosigned_by?: string | null
          created_at?: string
          encounter_id: string
          id?: string
          note_type?: string
          objective?: string | null
          plan?: string | null
          subjective?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          assessment?: string | null
          author_user_id?: string
          cosigned_at?: string | null
          cosigned_by?: string | null
          created_at?: string
          encounter_id?: string
          id?: string
          note_type?: string
          objective?: string | null
          plan?: string | null
          subjective?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "clinical_notes_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "encounters"
            referencedColumns: ["id"]
          },
        ]
      }
      encounters: {
        Row: {
          appointment_id: string
          created_at: string
          id: string
          jurisdiction_code: Database["public"]["Enums"]["jurisdiction_code"]
          monitoring_plan: string | null
          patient_location_country: string | null
          patient_user_id: string | null
          presenting_symptoms: string | null
          provider_user_id: string
          symptom_duration: string | null
          symptom_severity: string | null
          updated_at: string
          version: number
          working_diagnosis: string | null
        }
        Insert: {
          appointment_id: string
          created_at?: string
          id?: string
          jurisdiction_code?: Database["public"]["Enums"]["jurisdiction_code"]
          monitoring_plan?: string | null
          patient_location_country?: string | null
          patient_user_id?: string | null
          presenting_symptoms?: string | null
          provider_user_id: string
          symptom_duration?: string | null
          symptom_severity?: string | null
          updated_at?: string
          version?: number
          working_diagnosis?: string | null
        }
        Update: {
          appointment_id?: string
          created_at?: string
          id?: string
          jurisdiction_code?: Database["public"]["Enums"]["jurisdiction_code"]
          monitoring_plan?: string | null
          patient_location_country?: string | null
          patient_user_id?: string | null
          presenting_symptoms?: string | null
          provider_user_id?: string
          symptom_duration?: string | null
          symptom_severity?: string | null
          updated_at?: string
          version?: number
          working_diagnosis?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "encounters_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_concepts: {
        Row: {
          active: boolean
          active_ingredient: string | null
          approval_status: Database["public"]["Enums"]["catalog_approval"]
          approved_at: string | null
          approved_by: string | null
          catalog_version: string
          created_at: string
          generic_name: string
          id: string
          inn_name: string | null
          last_verified_at: string | null
          medication_class: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          active_ingredient?: string | null
          approval_status?: Database["public"]["Enums"]["catalog_approval"]
          approved_at?: string | null
          approved_by?: string | null
          catalog_version?: string
          created_at?: string
          generic_name: string
          id?: string
          inn_name?: string | null
          last_verified_at?: string | null
          medication_class?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          active_ingredient?: string | null
          approval_status?: Database["public"]["Enums"]["catalog_approval"]
          approved_at?: string | null
          approved_by?: string | null
          catalog_version?: string
          created_at?: string
          generic_name?: string
          id?: string
          inn_name?: string | null
          last_verified_at?: string | null
          medication_class?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      medication_products_ph: {
        Row: {
          active: boolean
          approval_status: Database["public"]["Enums"]["catalog_approval"]
          approved_at: string | null
          approved_by: string | null
          brand_names: string[]
          catalog_version: string
          country_code: string
          created_at: string
          dangerous_drug: boolean
          dosage_form: string | null
          id: string
          jurisdiction_code: Database["public"]["Enums"]["jurisdiction_code"]
          last_verified_at: string | null
          manufacturer: string | null
          medication_concept_id: string
          ph_registration_id: string | null
          prescription_classification: string | null
          registration_status: string | null
          requires_s2: boolean
          route: string | null
          strength_unit: string | null
          strength_value: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          approval_status?: Database["public"]["Enums"]["catalog_approval"]
          approved_at?: string | null
          approved_by?: string | null
          brand_names?: string[]
          catalog_version?: string
          country_code?: string
          created_at?: string
          dangerous_drug?: boolean
          dosage_form?: string | null
          id?: string
          jurisdiction_code?: Database["public"]["Enums"]["jurisdiction_code"]
          last_verified_at?: string | null
          manufacturer?: string | null
          medication_concept_id: string
          ph_registration_id?: string | null
          prescription_classification?: string | null
          registration_status?: string | null
          requires_s2?: boolean
          route?: string | null
          strength_unit?: string | null
          strength_value?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          approval_status?: Database["public"]["Enums"]["catalog_approval"]
          approved_at?: string | null
          approved_by?: string | null
          brand_names?: string[]
          catalog_version?: string
          country_code?: string
          created_at?: string
          dangerous_drug?: boolean
          dosage_form?: string | null
          id?: string
          jurisdiction_code?: Database["public"]["Enums"]["jurisdiction_code"]
          last_verified_at?: string | null
          manufacturer?: string | null
          medication_concept_id?: string
          ph_registration_id?: string | null
          prescription_classification?: string | null
          registration_status?: string | null
          requires_s2?: boolean
          route?: string | null
          strength_unit?: string | null
          strength_value?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medication_products_ph_medication_concept_id_fkey"
            columns: ["medication_concept_id"]
            isOneToOne: false
            referencedRelation: "medication_concepts"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_sources: {
        Row: {
          created_at: string
          id: string
          medication_concept_id: string | null
          medication_product_id: string | null
          source_date: string | null
          source_document_id: string | null
          source_url: string | null
          source_version: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          medication_concept_id?: string | null
          medication_product_id?: string | null
          source_date?: string | null
          source_document_id?: string | null
          source_url?: string | null
          source_version?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          medication_concept_id?: string | null
          medication_product_id?: string | null
          source_date?: string | null
          source_document_id?: string | null
          source_url?: string | null
          source_version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medication_sources_medication_concept_id_fkey"
            columns: ["medication_concept_id"]
            isOneToOne: false
            referencedRelation: "medication_concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_sources_medication_product_id_fkey"
            columns: ["medication_product_id"]
            isOneToOne: false
            referencedRelation: "medication_products_ph"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_allergies: {
        Row: {
          created_at: string
          encounter_id: string | null
          id: string
          is_intolerance: boolean
          patient_provided: boolean
          patient_user_id: string
          provider_reviewed_at: string | null
          provider_reviewed_by: string | null
          reaction: string | null
          severity: string | null
          source: string
          source_date: string | null
          state: Database["public"]["Enums"]["clinical_state"]
          substance: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          encounter_id?: string | null
          id?: string
          is_intolerance?: boolean
          patient_provided?: boolean
          patient_user_id: string
          provider_reviewed_at?: string | null
          provider_reviewed_by?: string | null
          reaction?: string | null
          severity?: string | null
          source?: string
          source_date?: string | null
          state?: Database["public"]["Enums"]["clinical_state"]
          substance?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          encounter_id?: string | null
          id?: string
          is_intolerance?: boolean
          patient_provided?: boolean
          patient_user_id?: string
          provider_reviewed_at?: string | null
          provider_reviewed_by?: string | null
          reaction?: string | null
          severity?: string | null
          source?: string
          source_date?: string | null
          state?: Database["public"]["Enums"]["clinical_state"]
          substance?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_allergies_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "encounters"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_conditions: {
        Row: {
          created_at: string
          detail: string | null
          encounter_id: string | null
          id: string
          name: string | null
          patient_provided: boolean
          patient_user_id: string
          provider_reviewed_at: string | null
          provider_reviewed_by: string | null
          source: string
          source_date: string | null
          state: Database["public"]["Enums"]["clinical_state"]
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          encounter_id?: string | null
          id?: string
          name?: string | null
          patient_provided?: boolean
          patient_user_id: string
          provider_reviewed_at?: string | null
          provider_reviewed_by?: string | null
          source?: string
          source_date?: string | null
          state?: Database["public"]["Enums"]["clinical_state"]
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          encounter_id?: string | null
          id?: string
          name?: string | null
          patient_provided?: boolean
          patient_user_id?: string
          provider_reviewed_at?: string | null
          provider_reviewed_by?: string | null
          source?: string
          source_date?: string | null
          state?: Database["public"]["Enums"]["clinical_state"]
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_conditions_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "encounters"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_medications: {
        Row: {
          adherence: string | null
          adverse_effects: string | null
          category: string
          created_at: string
          dose: string | null
          encounter_id: string | null
          frequency: string | null
          id: string
          medication_concept_id: string | null
          name: string | null
          patient_provided: boolean
          patient_user_id: string
          previous_benefit: string | null
          previous_trial: boolean
          provider_reviewed_at: string | null
          provider_reviewed_by: string | null
          reason_discontinued: string | null
          route: string | null
          source: string
          source_date: string | null
          state: Database["public"]["Enums"]["clinical_state"]
          strength: string | null
          updated_at: string
        }
        Insert: {
          adherence?: string | null
          adverse_effects?: string | null
          category?: string
          created_at?: string
          dose?: string | null
          encounter_id?: string | null
          frequency?: string | null
          id?: string
          medication_concept_id?: string | null
          name?: string | null
          patient_provided?: boolean
          patient_user_id: string
          previous_benefit?: string | null
          previous_trial?: boolean
          provider_reviewed_at?: string | null
          provider_reviewed_by?: string | null
          reason_discontinued?: string | null
          route?: string | null
          source?: string
          source_date?: string | null
          state?: Database["public"]["Enums"]["clinical_state"]
          strength?: string | null
          updated_at?: string
        }
        Update: {
          adherence?: string | null
          adverse_effects?: string | null
          category?: string
          created_at?: string
          dose?: string | null
          encounter_id?: string | null
          frequency?: string | null
          id?: string
          medication_concept_id?: string | null
          name?: string | null
          patient_provided?: boolean
          patient_user_id?: string
          previous_benefit?: string | null
          previous_trial?: boolean
          provider_reviewed_at?: string | null
          provider_reviewed_by?: string | null
          reason_discontinued?: string | null
          route?: string | null
          source?: string
          source_date?: string | null
          state?: Database["public"]["Enums"]["clinical_state"]
          strength?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_medications_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "encounters"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_observations_labs: {
        Row: {
          created_at: string
          encounter_id: string | null
          id: string
          kind: string
          observed_at: string | null
          patient_provided: boolean
          patient_user_id: string
          provider_reviewed_at: string | null
          provider_reviewed_by: string | null
          source: string
          state: Database["public"]["Enums"]["clinical_state"]
          unit: string | null
          updated_at: string
          value_number: number | null
          value_text: string | null
        }
        Insert: {
          created_at?: string
          encounter_id?: string | null
          id?: string
          kind: string
          observed_at?: string | null
          patient_provided?: boolean
          patient_user_id: string
          provider_reviewed_at?: string | null
          provider_reviewed_by?: string | null
          source?: string
          state?: Database["public"]["Enums"]["clinical_state"]
          unit?: string | null
          updated_at?: string
          value_number?: number | null
          value_text?: string | null
        }
        Update: {
          created_at?: string
          encounter_id?: string | null
          id?: string
          kind?: string
          observed_at?: string | null
          patient_provided?: boolean
          patient_user_id?: string
          provider_reviewed_at?: string | null
          provider_reviewed_by?: string | null
          source?: string
          state?: Database["public"]["Enums"]["clinical_state"]
          unit?: string | null
          updated_at?: string
          value_number?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_observations_labs_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "encounters"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_audit_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          detail: Json
          draft_id: string | null
          encounter_id: string | null
          event_type: string
          id: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          detail?: Json
          draft_id?: string | null
          encounter_id?: string | null
          event_type: string
          id?: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          detail?: Json
          draft_id?: string | null
          encounter_id?: string | null
          event_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescription_audit_events_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "prescription_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_audit_events_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "encounters"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_delivery_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          detail: Json
          document_version: number
          event_type: string
          id: string
          signed_version_id: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          detail?: Json
          document_version?: number
          event_type: string
          id?: string
          signed_version_id: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          detail?: Json
          document_version?: number
          event_type?: string
          id?: string
          signed_version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescription_delivery_events_signed_version_id_fkey"
            columns: ["signed_version_id"]
            isOneToOne: false
            referencedRelation: "signed_prescription_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_drafts: {
        Row: {
          clinical_confirmation_at: string | null
          clinical_confirmation_by: string | null
          clinical_confirmation_statement: string | null
          country_code: string
          created_at: string
          encounter_id: string
          id: string
          jurisdiction_code: Database["public"]["Enums"]["jurisdiction_code"]
          no_prescription_reason: string | null
          patient_user_id: string | null
          provider_user_id: string
          status: Database["public"]["Enums"]["rx_draft_status"]
          unsigned_document_hash: string | null
          updated_at: string
          version: number
        }
        Insert: {
          clinical_confirmation_at?: string | null
          clinical_confirmation_by?: string | null
          clinical_confirmation_statement?: string | null
          country_code?: string
          created_at?: string
          encounter_id: string
          id?: string
          jurisdiction_code?: Database["public"]["Enums"]["jurisdiction_code"]
          no_prescription_reason?: string | null
          patient_user_id?: string | null
          provider_user_id: string
          status?: Database["public"]["Enums"]["rx_draft_status"]
          unsigned_document_hash?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          clinical_confirmation_at?: string | null
          clinical_confirmation_by?: string | null
          clinical_confirmation_statement?: string | null
          country_code?: string
          created_at?: string
          encounter_id?: string
          id?: string
          jurisdiction_code?: Database["public"]["Enums"]["jurisdiction_code"]
          no_prescription_reason?: string | null
          patient_user_id?: string | null
          provider_user_id?: string
          status?: Database["public"]["Enums"]["rx_draft_status"]
          unsigned_document_hash?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "prescription_drafts_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "encounters"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_items: {
        Row: {
          brand_name: string | null
          created_at: string
          dosage_form: string | null
          dose_amount: string | null
          dose_unit: string | null
          draft_id: string
          duration: string | null
          follow_up_plan: string | null
          frequency: string | null
          generated_sig: string | null
          generic_name: string
          id: string
          indication: string | null
          max_daily_dose: string | null
          medication_concept_id: string | null
          medication_product_id: string | null
          patient_instructions: string | null
          prn: boolean
          prn_reason: string | null
          quantity: string | null
          quantity_unit: string | null
          refills: string | null
          route: string | null
          sig_override: string | null
          special_administration: string | null
          stop_or_review_date: string | null
          strength: string | null
          taper_instructions: string | null
          timing: string | null
          titration_instructions: string | null
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          brand_name?: string | null
          created_at?: string
          dosage_form?: string | null
          dose_amount?: string | null
          dose_unit?: string | null
          draft_id: string
          duration?: string | null
          follow_up_plan?: string | null
          frequency?: string | null
          generated_sig?: string | null
          generic_name: string
          id?: string
          indication?: string | null
          max_daily_dose?: string | null
          medication_concept_id?: string | null
          medication_product_id?: string | null
          patient_instructions?: string | null
          prn?: boolean
          prn_reason?: string | null
          quantity?: string | null
          quantity_unit?: string | null
          refills?: string | null
          route?: string | null
          sig_override?: string | null
          special_administration?: string | null
          stop_or_review_date?: string | null
          strength?: string | null
          taper_instructions?: string | null
          timing?: string | null
          titration_instructions?: string | null
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          brand_name?: string | null
          created_at?: string
          dosage_form?: string | null
          dose_amount?: string | null
          dose_unit?: string | null
          draft_id?: string
          duration?: string | null
          follow_up_plan?: string | null
          frequency?: string | null
          generated_sig?: string | null
          generic_name?: string
          id?: string
          indication?: string | null
          max_daily_dose?: string | null
          medication_concept_id?: string | null
          medication_product_id?: string | null
          patient_instructions?: string | null
          prn?: boolean
          prn_reason?: string | null
          quantity?: string | null
          quantity_unit?: string | null
          refills?: string | null
          route?: string | null
          sig_override?: string | null
          special_administration?: string | null
          stop_or_review_date?: string | null
          strength?: string | null
          taper_instructions?: string | null
          timing?: string | null
          titration_instructions?: string | null
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescription_items_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "prescription_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_items_medication_concept_id_fkey"
            columns: ["medication_concept_id"]
            isOneToOne: false
            referencedRelation: "medication_concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_items_medication_product_id_fkey"
            columns: ["medication_product_id"]
            isOneToOne: false
            referencedRelation: "medication_products_ph"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_safety_findings: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          code: string
          created_at: string
          detail: string | null
          id: string
          prescription_item_id: string | null
          requires_acknowledgement: boolean
          review_id: string
          severity: Database["public"]["Enums"]["finding_severity"]
          source: string | null
          title: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          code: string
          created_at?: string
          detail?: string | null
          id?: string
          prescription_item_id?: string | null
          requires_acknowledgement?: boolean
          review_id: string
          severity?: Database["public"]["Enums"]["finding_severity"]
          source?: string | null
          title: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          code?: string
          created_at?: string
          detail?: string | null
          id?: string
          prescription_item_id?: string | null
          requires_acknowledgement?: boolean
          review_id?: string
          severity?: Database["public"]["Enums"]["finding_severity"]
          source?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescription_safety_findings_prescription_item_id_fkey"
            columns: ["prescription_item_id"]
            isOneToOne: false
            referencedRelation: "prescription_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_safety_findings_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "prescription_safety_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_safety_reviews: {
        Row: {
          created_at: string
          draft_id: string
          id: string
          information_used: Json
          limited_screening: boolean
          reviewed_at: string
          service_name: string
          service_version: string
          stale_at: string | null
          stale_reason: string | null
        }
        Insert: {
          created_at?: string
          draft_id: string
          id?: string
          information_used?: Json
          limited_screening?: boolean
          reviewed_at?: string
          service_name?: string
          service_version?: string
          stale_at?: string | null
          stale_reason?: string | null
        }
        Update: {
          created_at?: string
          draft_id?: string
          id?: string
          information_used?: Json
          limited_screening?: boolean
          reviewed_at?: string
          service_name?: string
          service_version?: string
          stale_at?: string | null
          stale_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescription_safety_reviews_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "prescription_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          clinically_relevant_sex: string | null
          contact_email: string | null
          contact_phone: string | null
          country_code: string | null
          created_at: string
          date_of_birth: string | null
          display_name: string | null
          full_legal_name: string | null
          id: string
          residential_address: string | null
          updated_at: string
        }
        Insert: {
          clinically_relevant_sex?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country_code?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          full_legal_name?: string | null
          id: string
          residential_address?: string | null
          updated_at?: string
        }
        Update: {
          clinically_relevant_sex?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country_code?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          full_legal_name?: string | null
          id?: string
          residential_address?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      provider_authorities: {
        Row: {
          active: boolean
          authority: string
          created_at: string
          id: string
          jurisdiction_code: Database["public"]["Enums"]["jurisdiction_code"]
          provider_user_id: string
          revoked_at: string | null
          suspended_at: string | null
        }
        Insert: {
          active?: boolean
          authority: string
          created_at?: string
          id?: string
          jurisdiction_code?: Database["public"]["Enums"]["jurisdiction_code"]
          provider_user_id: string
          revoked_at?: string | null
          suspended_at?: string | null
        }
        Update: {
          active?: boolean
          authority?: string
          created_at?: string
          id?: string
          jurisdiction_code?: Database["public"]["Enums"]["jurisdiction_code"]
          provider_user_id?: string
          revoked_at?: string | null
          suspended_at?: string | null
        }
        Relationships: []
      }
      provider_profiles: {
        Row: {
          can_diagnose: boolean
          can_document: boolean
          created_at: string
          full_legal_name: string
          id: string
          practice_address: string | null
          practice_name: string | null
          profession: string | null
          professional_contact: string | null
          professional_designation: string | null
          qualifications: string | null
          requires_cosign: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          can_diagnose?: boolean
          can_document?: boolean
          created_at?: string
          full_legal_name: string
          id?: string
          practice_address?: string | null
          practice_name?: string | null
          profession?: string | null
          professional_contact?: string | null
          professional_designation?: string | null
          qualifications?: string | null
          requires_cosign?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          can_diagnose?: boolean
          can_document?: boolean
          created_at?: string
          full_legal_name?: string
          id?: string
          practice_address?: string | null
          practice_name?: string | null
          profession?: string | null
          professional_contact?: string | null
          professional_designation?: string | null
          qualifications?: string | null
          requires_cosign?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      provider_verifications: {
        Row: {
          created_at: string
          id: string
          jurisdiction_code: Database["public"]["Enums"]["jurisdiction_code"]
          license_expires_at: string | null
          outstanding: Json
          prc_number: string | null
          provider_user_id: string
          ptr_number: string | null
          ptr_year: number | null
          signing_email: string | null
          signing_email_verified_at: string | null
          snapshot: Json
          status: Database["public"]["Enums"]["verification_status"]
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          jurisdiction_code?: Database["public"]["Enums"]["jurisdiction_code"]
          license_expires_at?: string | null
          outstanding?: Json
          prc_number?: string | null
          provider_user_id: string
          ptr_number?: string | null
          ptr_year?: number | null
          signing_email?: string | null
          signing_email_verified_at?: string | null
          snapshot?: Json
          status?: Database["public"]["Enums"]["verification_status"]
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          jurisdiction_code?: Database["public"]["Enums"]["jurisdiction_code"]
          license_expires_at?: string | null
          outstanding?: Json
          prc_number?: string | null
          provider_user_id?: string
          ptr_number?: string | null
          ptr_year?: number | null
          signing_email?: string | null
          signing_email_verified_at?: string | null
          snapshot?: Json
          status?: Database["public"]["Enums"]["verification_status"]
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      signature_events: {
        Row: {
          attestation_statement: string
          document_sha256: string
          draft_id: string
          id: string
          identity_snapshot: Json
          prescription_version: number
          provider_user_id: string
          session_id: string | null
          signed_at: string
          signed_version_id: string | null
          signing_challenge_id: string | null
          signing_method: string
          verified_email: string
        }
        Insert: {
          attestation_statement: string
          document_sha256: string
          draft_id: string
          id?: string
          identity_snapshot: Json
          prescription_version: number
          provider_user_id: string
          session_id?: string | null
          signed_at?: string
          signed_version_id?: string | null
          signing_challenge_id?: string | null
          signing_method?: string
          verified_email: string
        }
        Update: {
          attestation_statement?: string
          document_sha256?: string
          draft_id?: string
          id?: string
          identity_snapshot?: Json
          prescription_version?: number
          provider_user_id?: string
          session_id?: string | null
          signed_at?: string
          signed_version_id?: string | null
          signing_challenge_id?: string | null
          signing_method?: string
          verified_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "signature_events_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "prescription_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_events_signed_version_id_fkey"
            columns: ["signed_version_id"]
            isOneToOne: false
            referencedRelation: "signed_prescription_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      signed_prescription_versions: {
        Row: {
          canonical_json: Json
          created_at: string
          document_sha256: string
          draft_id: string
          encounter_id: string
          first_viewed_at: string | null
          id: string
          jurisdiction_code: Database["public"]["Enums"]["jurisdiction_code"]
          patient_user_id: string | null
          prescriber_snapshot: Json
          prescription_number: string
          prescription_version: number
          provider_user_id: string
          released_at: string | null
          released_by: string | null
          signed_at: string
          superseded_by: string | null
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          canonical_json: Json
          created_at?: string
          document_sha256: string
          draft_id: string
          encounter_id: string
          first_viewed_at?: string | null
          id?: string
          jurisdiction_code?: Database["public"]["Enums"]["jurisdiction_code"]
          patient_user_id?: string | null
          prescriber_snapshot: Json
          prescription_number: string
          prescription_version: number
          provider_user_id: string
          released_at?: string | null
          released_by?: string | null
          signed_at?: string
          superseded_by?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          canonical_json?: Json
          created_at?: string
          document_sha256?: string
          draft_id?: string
          encounter_id?: string
          first_viewed_at?: string | null
          id?: string
          jurisdiction_code?: Database["public"]["Enums"]["jurisdiction_code"]
          patient_user_id?: string | null
          prescriber_snapshot?: Json
          prescription_number?: string
          prescription_version?: number
          provider_user_id?: string
          released_at?: string | null
          released_by?: string | null
          signed_at?: string
          superseded_by?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signed_prescription_versions_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "prescription_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signed_prescription_versions_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signed_prescription_versions_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "signed_prescription_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      signing_challenges: {
        Row: {
          attempt_count: number
          consumed_at: string | null
          created_at: string
          document_sha256: string
          draft_id: string
          expires_at: string
          id: string
          invalidated_at: string | null
          invalidated_reason: string | null
          otp_hash: string
          prescription_version: number
          provider_user_id: string
          session_id: string | null
        }
        Insert: {
          attempt_count?: number
          consumed_at?: string | null
          created_at?: string
          document_sha256: string
          draft_id: string
          expires_at: string
          id?: string
          invalidated_at?: string | null
          invalidated_reason?: string | null
          otp_hash: string
          prescription_version: number
          provider_user_id: string
          session_id?: string | null
        }
        Update: {
          attempt_count?: number
          consumed_at?: string | null
          created_at?: string
          document_sha256?: string
          draft_id?: string
          expires_at?: string
          id?: string
          invalidated_at?: string | null
          invalidated_reason?: string | null
          otp_hash?: string
          prescription_version?: number
          provider_user_id?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signing_challenges_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "prescription_drafts"
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
      can_prescribe_ph: {
        Args: { _encounter_id: string; _provider_user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_draft_provider: { Args: { _draft_id: string }; Returns: boolean }
      is_encounter_patient: {
        Args: { _encounter_id: string }
        Returns: boolean
      }
      is_encounter_provider: {
        Args: { _encounter_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "catalog_admin" | "provider" | "patient"
      catalog_approval: "draft" | "in_review" | "approved" | "rejected"
      clinical_state:
        | "documented"
        | "none_known"
        | "not_applicable"
        | "not_assessed"
      finding_severity: "info" | "caution" | "warning" | "critical"
      jurisdiction_code: "PH" | "US"
      rx_draft_status:
        | "draft"
        | "ready_for_review"
        | "signed"
        | "voided"
        | "superseded"
        | "no_prescription_needed"
      verification_status:
        | "verified"
        | "in_review"
        | "action_required"
        | "not_submitted"
        | "expired"
        | "suspended"
        | "revoked"
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
      app_role: ["admin", "catalog_admin", "provider", "patient"],
      catalog_approval: ["draft", "in_review", "approved", "rejected"],
      clinical_state: [
        "documented",
        "none_known",
        "not_applicable",
        "not_assessed",
      ],
      finding_severity: ["info", "caution", "warning", "critical"],
      jurisdiction_code: ["PH", "US"],
      rx_draft_status: [
        "draft",
        "ready_for_review",
        "signed",
        "voided",
        "superseded",
        "no_prescription_needed",
      ],
      verification_status: [
        "verified",
        "in_review",
        "action_required",
        "not_submitted",
        "expired",
        "suspended",
        "revoked",
      ],
    },
  },
} as const

// Placeholder Supabase types
// In production, this should be generated from Supabase CLI: supabase gen types typescript --local

export interface Database {
  public: {
    Tables: {
      appointments: {
        Row: {
          id: string;
          patient_id: string;
          start_time: string;
          end_time: string;
          patient_name: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id?: string;
          start_time: string;
          end_time: string;
          patient_name: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          start_time?: string;
          end_time?: string;
          patient_name?: string;
          status?: string;
          created_at?: string;
        };
      };
      staff_profiles: {
        Row: {
          id: string;
          role: string;
          first_name: string;
          last_name: string;
          created_at: string;
        };
        Insert: {
          id: string;
          role: string;
          first_name?: string;
          last_name?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          role?: string;
          first_name?: string;
          last_name?: string;
          created_at?: string;
        };
      };
      patients: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          date_of_birth: string;
          email: string;
          phone: string | null;
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          medical_history: string | null;
          insurance_provider: string | null;
          insurance_policy_number: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name: string;
          date_of_birth: string;
          email: string;
          phone?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          medical_history?: string | null;
          insurance_provider?: string | null;
          insurance_policy_number?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          first_name?: string;
          last_name?: string;
          date_of_birth?: string;
          email?: string;
          phone?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          medical_history?: string | null;
          insurance_provider?: string | null;
          insurance_policy_number?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      patient_intake_submissions: {
        Row: {
          id: string;
          patient_id: string | null;
          raw_data: Record<string, unknown>;
          submitted_at: string;
          reviewed_by: string | null;
          reviewed_at: string | null;
        };
        Insert: {
          id?: string;
          patient_id?: string | null;
          raw_data: Record<string, unknown>;
          submitted_at?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
        };
        Update: {
          id?: string;
          patient_id?: string | null;
          raw_data?: Record<string, unknown>;
          submitted_at?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string;
          action: string;
          resource_type: string | null;
          resource_id: string | null;
          metadata: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          action: string;
          resource_type?: string | null;
          resource_id?: string | null;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          action?: string;
          resource_type?: string | null;
          resource_id?: string | null;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
        };
      };
    };
    Views: Record<string, unknown>;
    Functions: Record<string, unknown>;
    Enums: Record<string, unknown>;
  };
}

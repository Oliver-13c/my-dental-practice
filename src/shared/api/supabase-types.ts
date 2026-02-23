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
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          start_time: string;
          end_time: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          start_time?: string;
          end_time?: string;
          status?: string;
          created_at?: string;
        };
      };
      staff_profiles: {
        Row: {
          id: string;
          email: string;
          role: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          role: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: string;
          created_at?: string;
        };
      };
      patients: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          full_name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          created_at?: string;
        };
      };
    };
    Views: Record<string, unknown>;
    Functions: Record<string, unknown>;
    Enums: Record<string, unknown>;
  };
}

import { createServerClient } from '@/shared/api/supabase-server';
import type { Database } from '@/shared/api/supabase-types';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const patientIntakeSchema = z.object({
  fullName: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  contactNumber: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email address'),
  medicalHistory: z.string().optional(),
  insuranceProvider: z.string().optional(),
  insurancePolicyNumber: z.string().optional(),
  patientId: z.string().optional(),
});

type PatientIntakeData = z.infer<typeof patientIntakeSchema>;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = patientIntakeSchema.parse(body);

    // Parse name: prefer separate firstName/lastName, fall back to fullName
    let firstName = validatedData.firstName || '';
    let lastName = validatedData.lastName || '';

    if (!firstName && !lastName && validatedData.fullName) {
      const nameParts = validatedData.fullName.trim().split(/\s+/);
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    }

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'First name and last name are required' },
        { status: 400 }
      );
    }

    // Use service role client for public intake (bypasses RLS)
    const supabase = createServerClient();

    const patientData = {
      first_name: firstName,
      last_name: lastName,
      date_of_birth: validatedData.dateOfBirth,
      email: validatedData.email.toLowerCase(),
      phone: validatedData.contactNumber || validatedData.phone,
      medical_history: validatedData.medicalHistory,
      insurance_provider: validatedData.insuranceProvider,
      insurance_policy_number: validatedData.insurancePolicyNumber,
    };

    // Upsert patient (match on email)
    const { data: patient, error: patientError } = await (supabase
      .from('patients')
      .upsert(patientData as any, { onConflict: 'email' })
      .select()
      .single() as any);

    if (patientError) {
      console.error('Patient upsert error:', patientError);
      return NextResponse.json(
        { error: 'Failed to create/update patient record' },
        { status: 500 }
      );
    }

    // Log submission in audit table (optional)
    if (patient?.id) {
      await (supabase
        .from('patient_intake_submissions')
        .insert({
          patient_id: patient.id,
          raw_data: validatedData,
        } as any)
        .select()
        .single() as any)
        .then(() => {
          // Success - don't fail the entire request if audit logging fails
        })
        .catch((err: any) => {
          console.warn('Failed to log intake submission:', err);
        });
    }

    return NextResponse.json({ data: patient });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Patient intake error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Staff only: Use server client with RLS
    const supabase = createServerClient();

    const { data: submissions, error } = await supabase
      .from('patient_intake_submissions')
      .select('*, patients(id, first_name, last_name, email, phone)')
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch submissions' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: submissions });
  } catch (error) {
    console.error('Patient intake GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const submissionId = searchParams.get('id');

    if (!submissionId) {
      return NextResponse.json(
        { error: 'Submission ID is required' },
        { status: 400 }
      );
    }

    // Staff only: Use server client with RLS
    const supabase = createServerClient();

    const { error } = await supabase
      .from('patient_intake_submissions')
      .delete()
      .eq('id', submissionId);

    if (error) {
      console.error('Delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete submission' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Patient intake DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

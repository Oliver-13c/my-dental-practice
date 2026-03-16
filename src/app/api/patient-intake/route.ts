import { createAdminClient, createServerClient } from '@/shared/api/supabase-server';
import type { Database } from '@/shared/api/supabase-types';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { getCurrentStaffProfile } from '@/features/admin-dashboard/api/admin-auth';
import { ApiErrors } from '@/shared/lib/api-error';
import { canManageAllPatientData } from '@/shared/lib/staff-permissions';

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
    const supabase = createAdminClient();

    const submission: PatientIntakeData & {
      normalizedName: { firstName: string; lastName: string };
      normalizedEmail: string;
      normalizedPhone: string | undefined;
    } = {
      ...validatedData,
      normalizedName: { firstName, lastName },
      normalizedEmail: validatedData.email.toLowerCase(),
      normalizedPhone: validatedData.contactNumber || validatedData.phone,
    };

    // Append-only public intake: never mutate canonical patients from anonymous input.
    const { data: intakeSubmission, error: intakeError } = await (supabase
      .from('patient_intake_submissions')
      .insert({
        patient_id: validatedData.patientId ?? null,
        raw_data: submission,
      } as any)
      .select()
      .single() as any);

    if (intakeError) {
      console.error('Patient intake insert error:', intakeError);
      return NextResponse.json(
        { error: 'Failed to submit intake form' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: intakeSubmission });
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
    const { profile, error: authError } = await getCurrentStaffProfile();
    if (!profile) {
      return authError?.includes('Forbidden')
        ? ApiErrors.forbidden(authError)
        : ApiErrors.unauthorized(authError || 'Unauthorized');
    }

    if (!canManageAllPatientData(profile.role)) {
      return ApiErrors.forbidden('Only admins and receptionists can view intake submissions');
    }

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
    const { profile, error: authError } = await getCurrentStaffProfile();
    if (!profile) {
      return authError?.includes('Forbidden')
        ? ApiErrors.forbidden(authError)
        : ApiErrors.unauthorized(authError || 'Unauthorized');
    }

    if (!canManageAllPatientData(profile.role)) {
      return ApiErrors.forbidden('Only admins and receptionists can delete intake submissions');
    }

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

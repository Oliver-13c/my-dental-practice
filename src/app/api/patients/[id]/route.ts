import { createServerClient } from '@/shared/api/supabase-server';
import type { Database } from '@/shared/api/supabase-types';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const updatePatientSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  dateOfBirth: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  medicalHistory: z.string().optional(),
  insuranceProvider: z.string().optional(),
  insurancePolicyNumber: z.string().optional(),
});

type UpdatePatientInput = z.infer<typeof updatePatientSchema>;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Staff only: Use server client with RLS
    const supabase = createServerClient();

    const { data: patient, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: patient });
  } catch (error) {
    console.error('Get patient error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate input
    const validatedData = updatePatientSchema.parse(body);

    // Build update object with snake_case keys
    const updateData: Record<string, any> = {};
    if (validatedData.firstName !== undefined) updateData.first_name = validatedData.firstName;
    if (validatedData.lastName !== undefined) updateData.last_name = validatedData.lastName;
    if (validatedData.dateOfBirth !== undefined) updateData.date_of_birth = validatedData.dateOfBirth;
    if (validatedData.email !== undefined) updateData.email = validatedData.email.toLowerCase();
    if (validatedData.phone !== undefined) updateData.phone = validatedData.phone;
    if (validatedData.emergencyContactName !== undefined) updateData.emergency_contact_name = validatedData.emergencyContactName;
    if (validatedData.emergencyContactPhone !== undefined) updateData.emergency_contact_phone = validatedData.emergencyContactPhone;
    if (validatedData.medicalHistory !== undefined) updateData.medical_history = validatedData.medicalHistory;
    if (validatedData.insuranceProvider !== undefined) updateData.insurance_provider = validatedData.insuranceProvider;
    if (validatedData.insurancePolicyNumber !== undefined) updateData.insurance_policy_number = validatedData.insurancePolicyNumber;

    // Use server client (staff only via RLS)
    const supabase = createServerClient();

    const { data: patient, error } = await (supabase as any)
      .from('patients')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update patient error:', error);
      // Check if it's a unique constraint violation (duplicate email)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A patient with this email already exists' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to update patient' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: patient });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Update patient error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Use server client (staff only via RLS)
    const supabase = createServerClient();

    // Soft delete: set is_active = false
    const { data: patient, error } = await (supabase as any)
      .from('patients')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Delete patient error:', error);
      return NextResponse.json(
        { error: 'Failed to delete patient' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: patient });
  } catch (error) {
    console.error('Delete patient error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

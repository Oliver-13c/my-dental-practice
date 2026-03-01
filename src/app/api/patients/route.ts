import { createServerClient } from '@/shared/api/supabase-server';
import type { Database } from '@/shared/api/supabase-types';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createPatientSchema } from '@/entities/patient/model/patient';

export async function GET(request: NextRequest) {
  try {
    // Staff only: Use server client with RLS
    const supabase = createServerClient();

    const { data: patients, error } = await supabase
      .from('patients')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch patients error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch patients' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: patients });
  } catch (error) {
    console.error('Patients GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = createPatientSchema.parse(body);

    // Use server client (staff only via RLS)
    const supabase = createServerClient();

    const patientData = {
      first_name: validatedData.firstName,
      last_name: validatedData.lastName,
      date_of_birth: validatedData.dateOfBirth,
      email: validatedData.email.toLowerCase(),
      phone: validatedData.phone,
      emergency_contact_name: validatedData.emergencyContactName,
      emergency_contact_phone: validatedData.emergencyContactPhone,
      medical_history: validatedData.medicalHistory,
      insurance_provider: validatedData.insuranceProvider,
      insurance_policy_number: validatedData.insurancePolicyNumber,
    };

    const { data: patient, error } = await (supabase
      .from('patients')
      .insert(patientData as any)
      .select()
      .single() as any);

    if (error) {
      console.error('Create patient error:', error);
      // Check if it's a unique constraint violation (duplicate email)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A patient with this email already exists' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to create patient' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: patient }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Patients POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

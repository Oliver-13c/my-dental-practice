import { NextRequest, NextResponse } from 'next/server';
import { getPatientAppointments } from '@/entities/appointment/api/queries';

// GET /api/patient/appointments?patientName=<name> — list appointments for a patient
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientName = searchParams.get('patientName');

    if (!patientName) {
      return NextResponse.json({ error: 'patientName query parameter is required' }, { status: 400 });
    }

    const appointments = await getPatientAppointments(patientName);
    return NextResponse.json(appointments);
  } catch (err) {
    console.error('Patient appointments API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

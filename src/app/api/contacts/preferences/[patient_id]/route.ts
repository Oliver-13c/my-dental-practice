/**
 * GET /api/contacts/preferences/:patient_id
 * PUT /api/contacts/preferences/:patient_id
 * 
 * Fetch and update patient contact preferences
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/shared/api/supabase-server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ patient_id: string }> }
) {
  try {
    const { patient_id } = await params;
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('contact_preferences')
      .select('*')
      .eq('patient_id', patient_id)
      .single();

    if (error) {
      // Return default preferences if not found
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          {
            data: {
              patient_id,
              preferred_contact_method: 'email',
              appointment_emails: true,
              appointment_sms: true,
              reminder_emails: true,
              reminder_sms: true,
              marketing_emails: true,
              marketing_sms: true,
              preferred_language: 'en',
              do_not_contact: false,
            },
          },
          { status: 200 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (err) {
    console.error('[api/contacts/preferences] GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ patient_id: string }> }
) {
  try {
    const { patient_id } = await params;
    const body = await req.json();
    const supabase = createServerClient();

    // Allowed fields to update
    const allowedFields = [
      'preferred_contact_method',
      'appointment_emails',
      'appointment_sms',
      'reminder_emails',
      'reminder_sms',
      'marketing_emails',
      'marketing_sms',
      'preferred_language',
      'do_not_contact',
      'contact_notes',
    ];

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    // Only allow specified fields
    Object.keys(body).forEach(key => {
      if (allowedFields.includes(key)) {
        updateData[key] = body[key];
      }
    });

    // Check if preferences exist
    const { data: existing } = (await supabase
      .from('contact_preferences')
      .select('id')
      .eq('patient_id', patient_id)
      .single()) as any;

    let result;

    if (existing) {
      // Update
      result = await (supabase as any)
        .from('contact_preferences')
        .update(updateData)
        .eq('patient_id', patient_id)
        .select()
        .single();
    } else {
      // Create if doesn't exist
      result = await (supabase as any)
        .from('contact_preferences')
        .insert({
          patient_id,
          ...updateData,
        })
        .select()
        .single();
    }

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ data: result.data }, { status: 200 });
  } catch (err) {
    console.error('[api/contacts/preferences] PUT error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

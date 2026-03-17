/**
 * PATCH /api/messages/{id}/read
 * 
 * Mark a message as read by the current staff member
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/shared/api/supabase-server';
import { markMessageAsRead } from '@/services/message-service';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerClient();
    const user = await supabase.auth.getUser();

    if (!user.data.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get staff profile to find staff_id
    const { data: staffProfile }: { data: { id: string } | null } = await supabase
      .from('staff_profiles')
      .select('id')
      .eq('auth_user_id', user.data.user.id)
      .single();

    if (!staffProfile) {
      return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 });
    }

    const { id } = await params;
    const messageId = id;
    const success = await markMessageAsRead(supabase, messageId, staffProfile.id);

    if (!success) {
      return NextResponse.json({ error: 'Failed to mark message as read' }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, message_id: messageId },
      { status: 200 }
    );
  } catch (err) {
    console.error('[api/messages/[id]/read] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

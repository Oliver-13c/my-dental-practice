import { createServerClient } from '@/shared/api/supabase-server';
import type { Database } from '@/shared/api/supabase-types';
import { getCurrentUser, getCurrentAdminProfile } from './admin-auth';
import { ApiErrors } from '@/shared/lib/api-error';

/**
 * Get all staff members (admin only)
 */
export async function getStaffMembers(filters?: {
  active?: boolean;
  role?: string;
  search?: string;
}) {
  const { profile, error: authError } = await getCurrentAdminProfile();
  if (!profile) {
    return { error: authError || 'Unauthorized', data: null };
  }

  // Get staff members
  const supabase = createServerClient<Database>();
  let query = (supabase as any).from('staff_profiles').select('*');

  if (filters?.active !== undefined) {
    query = query.eq('is_active', filters.active);
  }

  if (filters?.role) {
    query = query.eq('role', filters.role);
  }

  if (filters?.search) {
    query = query.or(
      `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    return { error: error.message, data: null };
  }

  return { data, error: null };
}

/**
 * Get single staff member
 */
export async function getStaffMember(staffId: string) {
  const { profile, error: authError } = await getCurrentAdminProfile();
  if (!profile) {
    return { error: authError || 'Unauthorized', data: null };
  }

  const supabase = createServerClient<Database>();

  const { data, error } = await (supabase as any)
    .from('staff_profiles')
    .select('*')
    .eq('id', staffId)
    .single();

  if (error) {
    return { error: error.message, data: null };
  }

  return { data, error: null };
}

/**
 * Create new staff member
 */
export async function createStaffMember(
  userData: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    role: 'receptionist' | 'hygienist' | 'dentist' | 'admin';
    sendWelcomeEmail?: boolean;
  }
) {
  const { profile: adminProfile, error: authError } = await getCurrentAdminProfile();
  if (!adminProfile) {
    return { error: authError || 'Unauthorized', data: null };
  }

  const supabase = createServerClient<Database>();

  // Create user in auth
  const { data: authData, error: createAuthError } = await (supabase as any).auth.admin
    .createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
    });

  if (createAuthError) {
    return { error: `Failed to create auth user: ${createAuthError.message}`, data: null };
  }

  // Create staff profile
  const { data: staffData, error: staffError } = await (supabase as any)
    .from('staff_profiles')
    .insert({
      id: authData.user.id,
      email: userData.email,
      first_name: userData.first_name,
      last_name: userData.last_name,
      role: userData.role,
      is_active: true,
      is_admin: userData.role === 'admin',
    })
    .select()
    .single();

  if (staffError) {
    // Rollback auth user if staff profile creation fails
    await (supabase as any).auth.admin.deleteUser(authData.user.id);
    return { error: `Failed to create staff profile: ${staffError.message}`, data: null };
  }

  // Log admin action
  await (supabase as any).rpc('log_admin_action', {
    p_admin_id: adminProfile.id,
    p_action: 'create_user',
    p_target_type: 'staff',
    p_target_id: staffData.id,
    p_target_name: `${userData.first_name} ${userData.last_name}`,
    p_changes: {
      email: userData.email,
      role: userData.role,
      first_name: userData.first_name,
      last_name: userData.last_name,
    },
  });

  // Send welcome email with password reset link if requested
  if (userData.sendWelcomeEmail) {
    const { error: emailError } = await (supabase as any).auth.resetPasswordForEmail(
      userData.email,
      {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
      }
    );

    if (emailError) {
      console.warn(`[createStaffMember] Warning: Failed to send welcome email to ${userData.email}:`, emailError.message);
      // Don't fail the entire operation—user is created, email just didn't send
    } else {
      // Log that welcome email was sent
      await (supabase as any).rpc('log_admin_action', {
        p_admin_id: adminProfile.id,
        p_action: 'send_welcome_email',
        p_target_type: 'staff',
        p_target_id: staffData.id,
        p_target_name: `${userData.first_name} ${userData.last_name}`,
        p_changes: { action: 'welcome_email_sent' },
      });
    }
  }

  return { data: staffData, error: null };
}

/**
 * Update staff member
 */
export async function updateStaffMember(
  staffId: string,
  updates: {
    first_name?: string;
    last_name?: string;
    role?: 'receptionist' | 'hygienist' | 'dentist' | 'admin';
    is_active?: boolean;
    is_admin?: boolean;
  }
) {
  const { profile: adminProfile, error: authError } = await getCurrentAdminProfile();
  if (!adminProfile) {
    return { error: authError || 'Unauthorized', data: null };
  }

  const supabase = createServerClient<Database>();

  // Get current staff data for audit trail
  const { data: currentData } = await (supabase as any)
    .from('staff_profiles')
    .select('*')
    .eq('id', staffId)
    .single();

  // Update staff profile
  const { data, error } = await (supabase as any)
    .from('staff_profiles')
    .update(updates)
    .eq('id', staffId)
    .select()
    .single();

  if (error) {
    return { error: error.message, data: null };
  }

  // Log admin action
  const changes: Record<string, unknown> = {};
  Object.entries(updates).forEach(([key, value]) => {
    if (currentData && currentData[key as keyof typeof currentData] !== value) {
      changes[key] = {
        from: currentData[key as keyof typeof currentData],
        to: value,
      };
    }
  });

  if (Object.keys(changes).length > 0) {
    await (supabase as any).rpc('log_admin_action', {
      p_admin_id: adminProfile.id,
      p_action: 'update_user',
      p_target_type: 'staff',
      p_target_id: staffId,
      p_target_name: `${data.first_name} ${data.last_name}`,
      p_changes: changes,
    });
  }

  return { data, error: null };
}

/**
 * Delete (deactivate) staff member
 */
export async function deleteStaffMember(staffId: string) {
  const { profile: adminProfile, error: authError } = await getCurrentAdminProfile();
  if (!adminProfile) {
    return { error: authError || 'Unauthorized', data: null };
  }

  const supabase = createServerClient<Database>();

  // Get staff data for audit trail
  const { data: staffData } = await (supabase as any)
    .from('staff_profiles')
    .select('*')
    .eq('id', staffId)
    .single();

  // Soft delete: deactivate instead of hard delete
  const { data, error } = await (supabase as any)
    .from('staff_profiles')
    .update({ is_active: false })
    .eq('id', staffId)
    .select()
    .single();

  if (error) {
    return { error: error.message, data: null };
  }

  // Log admin action
  await (supabase as any).rpc('log_admin_action', {
    p_admin_id: adminProfile.id,
    p_action: 'delete_user',
    p_target_type: 'staff',
    p_target_id: staffId,
    p_target_name: `${staffData.first_name} ${staffData.last_name}`,
    p_changes: { is_active: { from: true, to: false } },
  });

  return { data, error: null };
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(staffId: string) {
  const { profile: adminProfile, error: authError } = await getCurrentAdminProfile();
  if (!adminProfile) {
    return { error: authError || 'Unauthorized', data: null };
  }

  const supabase = createServerClient<Database>();

  // Get staff email
  const { data: staffData } = await (supabase as any)
    .from('staff_profiles')
    .select('email')
    .eq('id', staffId)
    .single();

  if (!staffData) {
    return { error: 'Staff member not found', data: null };
  }

  // Send reset email via Supabase auth
  const { error } = await (supabase as any).auth.resetPasswordForEmail(
    staffData.email,
    {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
    }
  );

  if (error) {
    return { error: error.message, data: null };
  }

  // Log admin action
  await (supabase as any).rpc('log_admin_action', {
    p_admin_id: adminProfile.id,
    p_action: 'reset_password',
    p_target_type: 'staff',
    p_target_id: staffId,
    p_target_name: `${staffData.email}`,
    p_changes: { action: 'password_reset_sent' },
  });

  return {
    data: { message: `Password reset email sent to ${staffData.email}` },
    error: null,
  };
}

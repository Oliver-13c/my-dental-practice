/**
 * Run with: node db/scripts/seed-staff-users.mjs
 * 
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
 * Get it from: Supabase Dashboard → Project Settings → API → service_role key
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read .env.local manually (no dotenv dependency needed)
const envFile = readFileSync('.env.local', 'utf-8');
const env = Object.fromEntries(
    envFile.split('\n')
        .filter(line => line.includes('='))
        .map(line => line.split('=').map(s => s.trim()))
);

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'];
const SERVICE_ROLE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!SERVICE_ROLE_KEY) {
    console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env.local');
    console.error('   Get it from: Supabase Dashboard → Project Settings → API → service_role secret');
    process.exit(1);
}

// Admin client uses service_role key — bypasses RLS, can create auth users
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

const staffUsers = [
    { email: 'admin@practice.com', password: 'password123', role: 'admin', first_name: 'System', last_name: 'Admin' },
    { email: 'frontdesk@practice.com', password: 'password123', role: 'receptionist', first_name: 'Jane', last_name: 'Doe' },
    { email: 'doctor@practice.com', password: 'password123', role: 'dentist', first_name: 'John', last_name: 'Smith' },
];

async function seedStaffUsers() {
    console.log('🌱 Seeding staff users...\n');

    for (const user of staffUsers) {
        // 1. Create or update auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: user.email,
            password: user.password,
            email_confirm: true,  // skip email verification
        });

        if (authError) {
            if (authError.message.includes('already registered')) {
                console.log(`⚠️  ${user.email} already exists — resetting password...`);
                // Find existing user and update password
                const { data: listData } = await supabase.auth.admin.listUsers();
                const existing = listData?.users?.find(u => u.email === user.email);
                if (existing) {
                    await supabase.auth.admin.updateUserById(existing.id, { password: user.password });
                    console.log(`   ✅ Password reset for ${user.email}`);
                    // Upsert profile
                    await supabase.from('staff_profiles').upsert({
                        id: existing.id,
                        role: user.role,
                        first_name: user.first_name,
                        last_name: user.last_name,
                    });
                    console.log(`   ✅ Profile upserted for ${user.email} (role: ${user.role})\n`);
                }
                continue;
            }
            console.error(`❌ Failed to create ${user.email}:`, authError.message);
            continue;
        }

        console.log(`✅ Created auth user: ${user.email} (id: ${authData.user.id})`);

        // 2. Insert staff_profile
        const { error: profileError } = await supabase.from('staff_profiles').upsert({
            id: authData.user.id,
            role: user.role,
            first_name: user.first_name,
            last_name: user.last_name,
        });

        if (profileError) {
            console.error(`❌ Failed to create profile for ${user.email}:`, profileError.message);
        } else {
            console.log(`✅ Created staff_profile: ${user.email} (role: ${user.role})\n`);
        }
    }

    console.log('✅ Done!');
}

seedStaffUsers().catch(console.error);

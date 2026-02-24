# My Dental Practice

A bilingual (ES/EN) dental scheduling and staff management system built with Next.js, TypeScript, Tailwind CSS, and Supabase.

**Note**: The current focus of this project is strictly on the internal **Staff Management Portal (B2B)**. The patient-facing registration/portal is temporarily paused.

## Local development

- Install: `npm install`
- Dev: `npm run dev`
- Build: `npm run build`
- Start: `npm run start`

### Environment variables

Copy `.env.example` to `.env.local` and fill in your values (see `.env.example` for details).

### Seeding development staff accounts

Run the seed script to create default staff users in Supabase:

```bash
node db/scripts/seed-staff-users.mjs
```

Default development credentials (created by the seed script):

| Role        | Email                    | Password      |
|-------------|--------------------------|---------------|
| Admin       | admin@practice.com       | password123   |
| Receptionist| frontdesk@practice.com   | password123   |
| Dentist     | doctor@practice.com      | password123   |

> **Note:** These are for local/development use only. Change all passwords before deploying to any shared or production environment.

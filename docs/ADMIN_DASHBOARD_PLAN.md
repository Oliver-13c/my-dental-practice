# Admin Dashboard Implementation Plan

## Overview
Complete admin dashboard for managing users, appointments, staff, and system data.

---

## Phase 1: User Management (Foundation)

### 1.1 Database Schema Updates
- [ ] Add `is_admin` flag to `staff` table
- [ ] Add `is_active` boolean to users
- [ ] Add `last_login` timestamp
- [ ] Create `admin_actions` table for admin audit trail
- [ ] Add `password_reset_token` + `password_reset_expires` to auth

### 1.2 Backend API Endpoints

**User Management:**
- [ ] `POST /api/admin/users/create` - Create new user (patient/staff)
- [ ] `GET /api/admin/users` - List all users with filtering/pagination
- [ ] `GET /api/admin/users/:id` - Get user details
- [ ] `PATCH /api/admin/users/:id` - Update user info
- [ ] `DELETE /api/admin/users/:id` - Deactivate/delete user
- [ ] `POST /api/admin/users/:id/reset-password` - Send password reset
- [ ] `POST /api/admin/users/bulk-action` - Bulk operations

**Authentication:**
- [ ] Verify only admins can access `/api/admin/*`
- [ ] Apply RLS policies for admin routes
- [ ] Log all admin actions in audit trail

### 1.3 Frontend Components

**Pages:**
- [ ] `src/app/admin/page.tsx` - Admin dashboard home
- [ ] `src/app/admin/users/page.tsx` - Users list
- [ ] `src/app/admin/users/[id]/page.tsx` - User details
- [ ] `src/app/admin/users/create/page.tsx` - Create user form

**Components:**
- [ ] `UsersTable` - Display users with sorting/filtering
- [ ] `UserForm` - Create/edit user
- [ ] `PasswordResetModal` - Send reset email
- [ ] `AdminLayout` - Sidebar navigation
- [ ] `ActionConfirmation` - Confirm dangerous actions

### 1.4 RLS Policies
- [ ] Only admins can view/edit all users
- [ ] Staff can only view patients assigned to them
- [ ] Audit log is read-only to admins

---

## Phase 2: Appointment Management

### 2.1 Backend API Endpoints
- [ ] `GET /api/admin/appointments` - List all appointments
- [ ] `POST /api/admin/appointments` - Create appointment (admin override)
- [ ] `PATCH /api/admin/appointments/:id` - Reschedule/update
- [ ] `DELETE /api/admin/appointments/:id` - Cancel appointment
- [ ] `GET /api/admin/appointments/stats` - Analytics

### 2.2 Frontend
- [ ] `src/app/admin/appointments/page.tsx` - Appointments calendar/list
- [ ] `AppointmentTable` component
- [ ] `RescheduleForm` component
- [ ] Appointment details modal

---

## Phase 3: Staff Management

### 3.1 Backend API Endpoints
- [ ] `GET /api/admin/staff` - List all staff
- [ ] `PATCH /api/admin/staff/:id` - Update staff details
- [ ] `POST /api/admin/staff/:id/assign-appointments` - Assign appointments
- [ ] `GET /api/admin/staff/:id/schedule` - View staff schedule

### 3.2 Frontend
- [ ] `src/app/admin/staff/page.tsx` - Staff list
- [ ] `StaffScheduleCalendar` component

---

## Phase 4: Audit & Analytics

### 4.1 Backend API Endpoints
- [ ] `GET /api/admin/audit-logs` - Get audit logs with filters
- [ ] `GET /api/admin/analytics/appointments` - Appointment stats
- [ ] `GET /api/admin/analytics/staff` - Staff performance metrics
- [ ] `GET /api/admin/analytics/patients` - Patient analytics

### 4.2 Frontend
- [ ] `src/app/admin/audit-logs/page.tsx` - Audit log viewer
- [ ] `src/app/admin/analytics/page.tsx` - Analytics dashboard
- [ ] Charts & graphs for data visualization
- [ ] Export functionality (CSV/PDF)

---

## Phase 5: System Administration

### 5.1 Backend API Endpoints
- [ ] `GET /api/admin/settings` - Get system settings
- [ ] `PATCH /api/admin/settings` - Update settings
- [ ] `DELETE /api/admin/data/:type` - Bulk data operations

### 5.2 Frontend
- [ ] `src/app/admin/settings/page.tsx` - Settings page
- [ ] Configuration forms

---

## Implementation Details

### Authentication & Authorization

**Middleware:**
```typescript
// src/features/role-middleware/admin-middleware.ts
- Check if user is admin
- Apply RLS filter
- Audit log the action
```

**Admin Check:**
```typescript
// Add to NextAuth config
roles: {
  ADMIN: 'admin',
  STAFF: 'staff',
  PATIENT: 'patient'
}
```

### Database Changes

**New Table: admin_actions**
```sql
CREATE TABLE admin_actions (
  id UUID PRIMARY KEY,
  admin_id UUID REFERENCES staff(id),
  action VARCHAR (e.g., 'create_user', 'delete_user'),
  target_type VARCHAR (e.g., 'user', 'appointment'),
  target_id UUID,
  changes JSONB (what changed),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP
)
```

**Modified Columns:**
- `staff.is_admin` BOOLEAN DEFAULT false
- `patients.is_active` BOOLEAN DEFAULT true

### API Response Format

```typescript
// All admin endpoints return:
{
  success: boolean,
  data: T | null,
  error?: string,
  audit_id?: string // For tracking admin action
}
```

### Security Considerations

- ✅ RLS policies enforce admin-only access
- ✅ All admin actions logged with IP & user agent
- ✅ Rate limit admin endpoints
- ✅ Require re-authentication for sensitive actions
- ✅ CSRF protection on all forms
- ✅ Validate all inputs server-side

---

## Task Breakdown

### Quick Wins (Week 1)
1. Update DB schema (admin flag, is_active)
2. Create admin middleware
3. Build user list page with basic filtering
4. Create user creation form
5. Implement password reset endpoint

### Medium Tasks (Week 2-3)
6. Complete CRUD for users
7. Build appointment management
8. Add staff management
9. Create audit log viewer

### Long-term (Week 4+)
10. Analytics dashboard
11. Bulk operations
12. Export functionality
13. Advanced filtering & search

---

## Files to Create/Modify

### New Files
```
src/
  app/
    admin/
      page.tsx                    # Dashboard home
      layout.tsx                  # Admin layout
      users/
        page.tsx                  # Users list
        [id]/page.tsx            # User details
        create/page.tsx          # Create user
      appointments/
        page.tsx                 # Appointments
      staff/
        page.tsx                 # Staff management
      audit-logs/
        page.tsx                 # Audit log viewer
      analytics/
        page.tsx                 # Analytics
      settings/
        page.tsx                 # Settings
  
  features/
    admin-dashboard/
      ui/
        UsersTable.tsx
        UserForm.tsx
        AdminLayout.tsx
        PasswordResetModal.tsx
      api/
        admin-users.ts
        admin-appointments.ts
        admin-staff.ts
        admin-analytics.ts

db/
  migrations/
    add_admin_tools.sql

docs/
  admin-dashboard-plan.md (this file)
```

### Modified Files
```
src/auth.ts                        # Add admin role verification
src/middleware.ts                  # Add admin route protection
src/features/role-middleware/     # Add admin checks
db/schema/                         # Add admin tables & columns
```

---

## Success Criteria

- [ ] Admins can create users with temporary passwords
- [ ] Admins can send password reset links
- [ ] All admin actions are logged
- [ ] RLS prevents unauthorized access
- [ ] Admin pages are restricted to admins only
- [ ] Build passes with no errors
- [ ] E2E tests for admin workflows

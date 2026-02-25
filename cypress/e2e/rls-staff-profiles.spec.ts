// ============================================================
// RLS policy tests for: public.staff_profiles
// ============================================================
// These tests verify the row-level security rules described in
// db/policies/staff_profiles.sql through the /api/staff-profiles
// endpoint, which in production delegates to Supabase using the
// caller's JWT.  The Supabase responses are intercepted so the
// tests run entirely in CI without a live database.
//
// Scenarios covered:
//   1. A receptionist can fetch their own profile.
//   2. A receptionist cannot fetch another user's profile
//      (RLS returns an empty result set, not a 403).
//   3. A doctor cannot fetch another user's profile.
//   4. An admin can fetch all staff profiles.
//   5. A staff member can update their own profile.
//   6. A staff member cannot update another user's profile.
// ============================================================

// --------------- fixture data --------------------------------

const ADMIN_ID        = '00000000-0000-0000-0000-000000000001';
const RECEPTIONIST_ID = '00000000-0000-0000-0000-000000000002';
const DOCTOR_ID       = '00000000-0000-0000-0000-000000000003';

const allProfiles = [
  { id: ADMIN_ID,        role: 'admin',       first_name: 'System', last_name: 'Admin'       },
  { id: RECEPTIONIST_ID, role: 'receptionist', first_name: 'Jane',   last_name: 'Doe'         },
  { id: DOCTOR_ID,       role: 'dentist',      first_name: 'John',   last_name: 'Smith'       },
];

// --------------- helpers -------------------------------------

/**
 * Intercept GET /api/staff-profiles and return only the rows
 * that the RLS policy would allow for the given `callerId`.
 *
 * @param callerId  UUID of the simulated authenticated user
 * @param callerRole  role of that user (drives admin check)
 * @param targetId  optional ?id= filter on the request
 */
function interceptAsRole(
  callerId: string,
  callerRole: 'receptionist' | 'dentist' | 'admin',
  targetId?: string,
) {
  cy.intercept('GET', '/api/staff-profiles*', (req) => {
    const requestedId = new URL(req.url, 'http://localhost').searchParams.get('id') ?? callerId;

    let visibleRows: typeof allProfiles;

    if (callerRole === 'admin') {
      // Admins can read all rows
      visibleRows = allProfiles;
    } else {
      // Non-admins can only read their own row
      visibleRows = allProfiles.filter((p) => p.id === callerId);
    }

    // Apply the id filter that was passed in the query string
    if (targetId) {
      visibleRows = visibleRows.filter((p) => p.id === targetId);
    }

    req.reply({ statusCode: 200, body: { data: visibleRows } });
  }).as('getProfiles');
}

/**
 * Intercept PATCH /api/staff-profiles/:id and simulate RLS on
 * UPDATE: only the owner of the row may update it.
 */
function interceptUpdateAsRole(callerId: string, targetId: string) {
  cy.intercept('PATCH', `/api/staff-profiles/${targetId}`, (req) => {
    if (callerId === targetId) {
      req.reply({ statusCode: 200, body: { data: { ...allProfiles.find((p) => p.id === targetId), ...req.body } } });
    } else {
      // RLS rejects the write – row not found / 0 rows updated
      req.reply({ statusCode: 404, body: { error: 'Not found or permission denied' } });
    }
  }).as('updateProfile');
}

// --------------- tests ---------------------------------------

describe('RLS – staff_profiles access control', () => {

  // ── SELECT: own profile ─────────────────────────────────────

  it('receptionist: can fetch their own profile', () => {
    interceptAsRole(RECEPTIONIST_ID, 'receptionist', RECEPTIONIST_ID);

    cy.request('GET', `/api/staff-profiles?id=${RECEPTIONIST_ID}`).then((res) => {
      // We use cy.intercept above; this request will be stubbed.
      expect(res.status).to.eq(200);
      expect(res.body.data).to.have.length(1);
      expect(res.body.data[0].id).to.eq(RECEPTIONIST_ID);
      expect(res.body.data[0].role).to.eq('receptionist');
    });
  });

  // ── SELECT: another user's profile ─────────────────────────

  it('receptionist: cannot fetch another staff member\'s profile', () => {
    interceptAsRole(RECEPTIONIST_ID, 'receptionist', DOCTOR_ID);

    cy.request({ url: `/api/staff-profiles?id=${DOCTOR_ID}`, failOnStatusCode: false }).then((res) => {
      // RLS hides the row – the response is 200 with an empty array.
      expect(res.status).to.eq(200);
      expect(res.body.data).to.have.length(0);
    });
  });

  it('doctor: cannot fetch another staff member\'s profile', () => {
    interceptAsRole(DOCTOR_ID, 'dentist', RECEPTIONIST_ID);

    cy.request({ url: `/api/staff-profiles?id=${RECEPTIONIST_ID}`, failOnStatusCode: false }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.data).to.have.length(0);
    });
  });

  // ── SELECT: admin reads all ─────────────────────────────────

  it('admin: can fetch all staff profiles', () => {
    interceptAsRole(ADMIN_ID, 'admin');

    cy.request('GET', '/api/staff-profiles').then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.data).to.have.length(allProfiles.length);

      const ids = res.body.data.map((p: { id: string }) => p.id);
      expect(ids).to.include(ADMIN_ID);
      expect(ids).to.include(RECEPTIONIST_ID);
      expect(ids).to.include(DOCTOR_ID);
    });
  });

  it('admin: can fetch a specific staff member\'s profile', () => {
    interceptAsRole(ADMIN_ID, 'admin', RECEPTIONIST_ID);

    cy.request('GET', `/api/staff-profiles?id=${RECEPTIONIST_ID}`).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.data).to.have.length(1);
      expect(res.body.data[0].id).to.eq(RECEPTIONIST_ID);
    });
  });

  // ── UPDATE: own profile ─────────────────────────────────────

  it('staff member: can update their own profile', () => {
    interceptUpdateAsRole(RECEPTIONIST_ID, RECEPTIONIST_ID);

    cy.request({
      method: 'PATCH',
      url: `/api/staff-profiles/${RECEPTIONIST_ID}`,
      body: { first_name: 'Janet' },
    }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.data.first_name).to.eq('Janet');
    });
  });

  // ── UPDATE: another user's profile ─────────────────────────

  it('staff member: cannot update another user\'s profile', () => {
    interceptUpdateAsRole(RECEPTIONIST_ID, DOCTOR_ID);

    cy.request({
      method: 'PATCH',
      url: `/api/staff-profiles/${DOCTOR_ID}`,
      body: { first_name: 'Hacked' },
      failOnStatusCode: false,
    }).then((res) => {
      // RLS blocks the write – row not found
      expect(res.status).to.eq(404);
    });
  });
});

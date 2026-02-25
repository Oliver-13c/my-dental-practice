/**
 * Pre-deploy Smoke Tests
 *
 * Quick checks that verify the application is alive and the most critical
 * pages/endpoints are reachable.  These tests run on every CI build (see
 * .github/workflows/ci.yml smoke job) and block the deploy if they fail.
 *
 * Checks:
 *  1. GET /api/health → HTTP 200 with { status: "ok" }
 *  2. Login page (/staff/login) loads and renders the sign-in form.
 *  3. Dashboard (/staff/dashboard) is accessible when a session is active.
 */

const HEALTH_URL = '/api/health';
const LOGIN_URL = '/staff/login';
const DASHBOARD_URL = '/staff/dashboard';

describe('Smoke – /api/health', () => {
  it('returns HTTP 200 with status ok', () => {
    cy.request(HEALTH_URL).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.have.property('status', 'ok');
    });
  });
});

describe('Smoke – login page', () => {
  it('loads and renders the sign-in form', () => {
    cy.visit(LOGIN_URL);
    cy.get('input#email').should('exist');
    cy.get('input#password').should('exist');
    cy.get('button[type="submit"]').should('exist');
  });
});

describe('Smoke – dashboard', () => {
  it('is accessible when a session stub is active', () => {
    // Stub session so the dashboard does not redirect to login
    cy.intercept('GET', '/api/auth/session', {
      statusCode: 200,
      body: {
        user: {
          email: 'receptionist@practice.com',
          name: 'receptionist',
          role: 'receptionist',
        },
        expires: '2099-01-01T00:00:00.000Z',
      },
    }).as('getSession');

    cy.visit(DASHBOARD_URL);
    cy.url({ timeout: 10_000 }).should('include', DASHBOARD_URL);
  });
});

/**
 * Login Flow E2E Tests
 *
 * Verifies that:
 *  1. A receptionist can log in, sees the correct dashboard, and can log out.
 *  2. A doctor (dentist) can log in, sees the correct dashboard, and can log out.
 *  3. Invalid credentials show an error and do not redirect.
 *
 * NextAuth session and sign-in endpoints are intercepted so the tests run
 * without a live backend or real credentials.
 */

const LOGIN_URL = '/staff/login';

/** Helper – stub NextAuth CSRF + session + credentials callback */
function stubAuthSession(role: 'receptionist' | 'dentist') {
  // Stub the CSRF token endpoint used internally by NextAuth
  cy.intercept('GET', '/api/auth/csrf', {
    statusCode: 200,
    body: { csrfToken: 'test-csrf-token' },
  }).as('getCsrf');

  // Stub the credentials sign-in callback
  cy.intercept('POST', '/api/auth/callback/credentials*', {
    statusCode: 200,
    body: {},
  }).as('signIn');

  // Stub the session endpoint to return an authenticated user with the given role
  cy.intercept('GET', '/api/auth/session', {
    statusCode: 200,
    body: {
      user: { email: `${role}@practice.com`, name: role, role },
      expires: '2099-01-01T00:00:00.000Z',
    },
  }).as('getSession');
}

describe('Login flow – receptionist', () => {
  it('logs in, verifies dashboard loads, and logs out', () => {
    stubAuthSession('receptionist');

    cy.visit(LOGIN_URL);
    cy.get('input#email').type('receptionist@practice.com');
    cy.get('input#password').type('password123');
    cy.get('button[type="submit"]').click();

    // After sign-in the page navigates to the dashboard
    cy.url({ timeout: 10000 }).should('include', '/staff/dashboard');

    // The session stub returns the receptionist role so the header should show "Front Desk"
    cy.contains('Front Desk').should('exist');

    // Sign out – intercept the signout endpoint
    cy.intercept('POST', '/api/auth/signout*', { statusCode: 200, body: {} }).as('signOut');
    cy.intercept('GET', '/api/auth/session', { statusCode: 200, body: {} }).as('sessionCleared');

    cy.contains('Sign Out').click();

    // After sign-out the app redirects back to the login page
    cy.url({ timeout: 10000 }).should('include', LOGIN_URL);
  });
});

describe('Login flow – doctor (dentist)', () => {
  it('logs in, verifies dashboard loads, and logs out', () => {
    stubAuthSession('dentist');

    cy.visit(LOGIN_URL);
    cy.get('input#email').type('dentist@practice.com');
    cy.get('input#password').type('password123');
    cy.get('button[type="submit"]').click();

    cy.url({ timeout: 10000 }).should('include', '/staff/dashboard');

    // The session stub returns the dentist role so the header should show "Doctor Portal"
    cy.contains('Doctor Portal').should('exist');

    cy.intercept('POST', '/api/auth/signout*', { statusCode: 200, body: {} }).as('signOut');
    cy.intercept('GET', '/api/auth/session', { statusCode: 200, body: {} }).as('sessionCleared');

    cy.contains('Sign Out').click();

    cy.url({ timeout: 10000 }).should('include', LOGIN_URL);
  });
});

describe('Login flow – invalid credentials', () => {
  it('shows an error and does not navigate away from the login page', () => {
    // Stub CSRF as usual
    cy.intercept('GET', '/api/auth/csrf', {
      statusCode: 200,
      body: { csrfToken: 'test-csrf-token' },
    }).as('getCsrf');

    // Return an error from the credentials callback
    cy.intercept('POST', '/api/auth/callback/credentials*', {
      statusCode: 401,
      body: { error: 'CredentialsSignin' },
    }).as('signInFailed');

    // Session remains empty (unauthenticated)
    cy.intercept('GET', '/api/auth/session', {
      statusCode: 200,
      body: {},
    }).as('getSession');

    cy.visit(LOGIN_URL);
    cy.get('input#email').type('wrong@practice.com');
    cy.get('input#password').type('wrongpassword');
    cy.get('button[type="submit"]').click();

    // Error message should be visible
    cy.contains('Invalid email or password').should('exist');

    // URL must remain on the login page
    cy.url().should('include', LOGIN_URL);
  });
});

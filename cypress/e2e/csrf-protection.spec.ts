/**
 * CSRF Protection Smoke Tests
 *
 * Demonstrates that:
 *  1. State-changing requests to custom API routes without a valid CSRF token
 *     are rejected with HTTP 403.
 *  2. The same request succeeds (is not rejected with 403) once a valid token
 *     obtained from GET /api/csrf is included in the X-CSRF-Token header.
 *
 * The registration endpoint is used as the representative mutation target
 * because it is the only custom POST route in the application.
 */

const REGISTER_API = '/register/api';
const CSRF_API = '/api/csrf';

describe('CSRF Protection', () => {
  it('rejects POST without a CSRF token with 403', () => {
    cy.clearCookies();

    cy.request({
      method: 'POST',
      url: REGISTER_API,
      body: { fullName: 'Test User' },
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.equal(403);
    });
  });

  it('rejects POST with a mismatched CSRF token with 403', () => {
    cy.clearCookies();

    // Set a cookie but send a different value in the header
    cy.setCookie('__csrf', 'real-token-value');

    cy.request({
      method: 'POST',
      url: REGISTER_API,
      headers: { 'x-csrf-token': 'tampered-token-value' },
      body: { fullName: 'Test User' },
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.equal(403);
    });
  });

  it('accepts POST with a valid CSRF token from GET /api/csrf', () => {
    cy.clearCookies();

    // Obtain a fresh CSRF token; the endpoint also sets the cookie
    cy.request('GET', CSRF_API).then((csrfResponse) => {
      expect(csrfResponse.status).to.equal(200);
      const { csrfToken } = csrfResponse.body;
      expect(csrfToken).to.be.a('string').and.have.length.greaterThan(0);

      cy.request({
        method: 'POST',
        url: REGISTER_API,
        headers: { 'x-csrf-token': csrfToken },
        body: { fullName: 'Test User' },
        failOnStatusCode: false,
      }).then((response) => {
        // The CSRF check passes – the response must not be 403
        expect(response.status).not.to.equal(403);
      });
    });
  });
});

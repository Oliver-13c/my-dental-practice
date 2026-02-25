/**
 * Rate-Limiting Integration Tests – /staff/login
 *
 * These tests verify that the NextAuth credentials callback endpoint
 * (/api/auth/callback/credentials) enforces the configured rate limit:
 *   - Up to 5 login attempts per IP (and per account) are allowed within 5 minutes.
 *   - The 6th attempt within the window receives HTTP 429.
 *   - The 429 response includes a Retry-After header.
 *
 * The tests call the NextAuth credentials endpoint directly so they exercise
 * the middleware without needing a real database.
 */

const LOGIN_API = '/api/auth/callback/credentials';
const VALID_BODY = { email: 'rate-limit-test@example.com', password: 'wrong', csrfToken: 'test' };

describe('Rate Limiting – /api/auth/callback/credentials', () => {
  it('returns a non-429 status for the first 5 attempts', () => {
    // Each iteration should not be blocked (may be 200, 401, or a redirect)
    for (let i = 0; i < 5; i++) {
      cy.request({
        method: 'POST',
        url: LOGIN_API,
        body: VALID_BODY,
        failOnStatusCode: false,
        headers: { 'Content-Type': 'application/json' },
      }).then((response) => {
        expect(response.status).not.to.eq(429);
      });
    }
  });

  it('returns 429 with Retry-After header after exceeding the limit', () => {
    // Exhaust the remaining quota (we may already have used some above, but
    // each describe-block shares the same IP within the test runner, so we
    // send enough requests to definitely trigger the limit).
    for (let i = 0; i < 10; i++) {
      cy.request({
        method: 'POST',
        url: LOGIN_API,
        body: VALID_BODY,
        failOnStatusCode: false,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    cy.request({
      method: 'POST',
      url: LOGIN_API,
      body: VALID_BODY,
      failOnStatusCode: false,
      headers: { 'Content-Type': 'application/json' },
    }).then((response) => {
      expect(response.status).to.eq(429);
      expect(response.headers).to.have.property('retry-after');
      const retryAfter = parseInt(response.headers['retry-after'] as string, 10);
      expect(retryAfter).to.be.greaterThan(0);
    });
  });
});

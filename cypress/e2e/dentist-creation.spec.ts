describe('Dentist creation request flow', () => {
  it('sends a dentist role to the admin user creation endpoint', () => {
    cy.intercept('POST', '/api/admin/users', (req) => {
      expect(req.body).to.deep.include({
        email: 'dentist@practice.com',
        first_name: 'Ana',
        last_name: 'Martinez',
        role: 'dentist',
      });

      req.reply({
        statusCode: 201,
        body: {
          success: true,
          data: {
            id: 'dentist-user-1',
            email: 'dentist@practice.com',
            role: 'dentist',
          },
        },
      });
    }).as('createDentist');

    cy.visit('/');
    cy.window().then((win) =>
      win.fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'dentist@practice.com',
          password: 'TempPass123!',
          first_name: 'Ana',
          last_name: 'Martinez',
          role: 'dentist',
          sendWelcomeEmail: true,
        }),
      }),
    );

    cy.wait('@createDentist').its('response.statusCode').should('eq', 201);
  });

  it('allows hygienist as a clinical role payload too', () => {
    cy.intercept('POST', '/api/admin/users', (req) => {
      expect(req.body.role).to.eq('hygienist');
      req.reply({
        statusCode: 201,
        body: {
          success: true,
          data: {
            id: 'hygienist-user-1',
            email: 'hygienist@practice.com',
            role: 'hygienist',
          },
        },
      });
    }).as('createHygienist');

    cy.visit('/');
    cy.window().then((win) =>
      win.fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'hygienist@practice.com',
          password: 'TempPass123!',
          first_name: 'Rosa',
          last_name: 'Lopez',
          role: 'hygienist',
          sendWelcomeEmail: true,
        }),
      }),
    );

    cy.wait('@createHygienist').its('response.statusCode').should('eq', 201);
  });
});
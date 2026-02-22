import { mount } from 'cypress/react18';
import { IntlProvider } from 'next-intl';
import { PatientIntakeForm } from '../../src/features/patient-intake/ui/patient-intake-form';

const patientId = 'test-patient-123';

function mountForm(locale: string) {
  cy.intercept('POST', '/api/patient-intake', (req) => {
    if (!req.body.fullName) {
      req.reply({ statusCode: 400, body: { error: 'Missing required fields' } });
    } else {
      req.reply({ statusCode: 200, body: { message: 'Intake form saved' } });
    }
  }).as('submitForm');

  mount(
    <IntlProvider locale={locale} messages={require(`../../src/locales/${locale}/patient-intake.json`)}>
      <PatientIntakeForm patientId={patientId} />
    </IntlProvider>,
  );
}

describe('Patient Intake Form', () => {
  it('renders bilingual UI and toggles language', () => {
    mountForm('en');
    cy.contains('Patient Intake Form').should('exist');

    cy.unmount();

    mountForm('es');
    cy.contains('Formulario de Ingreso del Paciente').should('exist');
  });

  it('validates required fields and shows errors', () => {
    mountForm('en');
    cy.contains('Submit').click();

    cy.contains('Full Name is required').should('exist');
    cy.contains('Date of Birth is required').should('exist');
    cy.contains('Contact Number is required').should('exist');

    cy.get('input#email').type('invalid-email');
    cy.contains('Invalid email address').should('exist');
  });

  it('submits form successfully', () => {
    mountForm('en');
    cy.get('input#fullName').type('John Doe');
    cy.get('input#dateOfBirth').type('1990-01-01');
    cy.get('input#contactNumber').type('555-1234');
    cy.get('input#email').type('john@example.com');
    cy.get('textarea#medicalHistory').type('No allergies');
    cy.get('input#insuranceProvider').type('Best Insurance');
    cy.get('input#insurancePolicyNumber').type('123456789');

    cy.contains('Submit').click();
    cy.wait('@submitForm');

    cy.on('window:alert', (txt) => {
      expect(txt).to.contains('Patient intake form submitted successfully');
    });
  });

  it('handles server errors gracefully', () => {
    cy.intercept('POST', '/api/patient-intake', {
      statusCode: 500,
      body: { error: 'Database error' },
    }).as('submitFormError');

    mountForm('en');
    cy.get('input#fullName').type('John Doe');
    cy.get('input#dateOfBirth').type('1990-01-01');
    cy.get('input#contactNumber').type('555-1234');
    cy.get('input#email').type('john@example.com');

    cy.contains('Submit').click();
    cy.wait('@submitFormError');

    cy.on('window:alert', (txt) => {
      expect(txt).to.contains('Failed to submit');
    });
  });
});

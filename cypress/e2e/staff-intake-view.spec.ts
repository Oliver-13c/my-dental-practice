import { mount } from 'cypress/react18';
import { IntlProvider } from 'next-intl';
import { StaffIntakeView } from '../../src/features/patient-intake/ui/staff-intake-view';

function mountView(locale: string, data = []) {
  cy.intercept('GET', '/api/patient-intake', { statusCode: 200, body: { data } }).as('fetchData');

  mount(
    <IntlProvider locale={locale} messages={require(`../../src/locales/${locale}/patient-intake.json`)}>
      <StaffIntakeView />
    </IntlProvider>,
  );
}

describe('Staff Intake View', () => {
  const sampleData = [
    {
      patient_id: '123',
      full_name: 'Jane Smith',
      date_of_birth: '1985-05-15',
      contact_number: '555-6789',
      email: 'jane@example.com',
      medical_history: 'Asthma',
      insurance_provider: 'Insurance Co',
      insurance_policy_number: '987654321',
    },
  ];

  it('renders bilingual UI and toggles language', () => {
    mountView('en', sampleData);
    cy.contains('Patient Intake Data').should('exist');

    cy.unmount();

    mountView('es', sampleData);
    cy.contains('Datos de Ingreso del Paciente').should('exist');
  });

  it('displays fetched data correctly', () => {
    mountView('en', sampleData);
    cy.wait('@fetchData');
    cy.contains('Jane Smith').should('exist');
    cy.contains('Asthma').should('exist');
  });

  it('shows loading state initially', () => {
    cy.intercept('GET', '/api/patient-intake', (req) => {
      req.reply((res) => {
        res.delay(2000);
        res.send({ statusCode: 200, body: { data: [] } });
      });
    }).as('fetchDelayed');

    mount(
      <IntlProvider locale="en" messages={require('../../src/locales/en/patient-intake.json')}>
        <StaffIntakeView />
      </IntlProvider>,
    );

    cy.contains('Loading data...').should('exist');
  });

  it('handles fetch errors gracefully', () => {
    cy.intercept('GET', '/api/patient-intake', { statusCode: 500, body: { error: 'Failed to load' } }).as('fetchError');

    mount(
      <IntlProvider locale="en" messages={require('../../src/locales/en/patient-intake.json')}>
        <StaffIntakeView />
      </IntlProvider>,
    );

    cy.contains('Failed to load patient intake data.').should('exist');
  });

  it('can delete an entry', () => {
    mountView('en', sampleData);
    cy.wait('@fetchData');
    cy.on('window:confirm', () => true);
    cy.intercept('DELETE', `/api/patient-intake?patientId=123`, { statusCode: 200 }).as('deleteEntry');

    cy.contains('Delete').click();
    cy.wait('@deleteEntry');

    cy.contains('Jane Smith').should('not.exist');
  });
});

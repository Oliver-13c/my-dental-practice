import React from 'react';
import { useTranslations } from 'next-intl';

export const dynamic = 'force-dynamic';

export default function PatientRegistrationPage() {
  const t = useTranslations('patient.registration');
  return (
    <main className="mx-auto max-w-2xl p-4">
      <h1 className="text-2xl font-bold mb-4">{t('patient_registration_title')}</h1>
      <p>{t('form_placeholder')}</p>
      {/* Registration form will be implemented here */}
    </main>
  );
}

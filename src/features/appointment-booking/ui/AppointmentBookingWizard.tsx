import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { EnterPatientInfo } from './steps/EnterPatientInfo';
import { Confirmation } from './steps/Confirmation';

// Step 1 placeholder component
function SelectDateTimeStep({ onNext, onDataChange, selectedDate, selectedTime }: { onNext: () => void; onDataChange: (data: { date: string; time: string }) => void; selectedDate: string; selectedTime: string }) {
  const t = useTranslations('AppointmentBooking');

  const isNextDisabled = !selectedDate || !selectedTime;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">{t('step1Title')}</h2>

      <div className="mb-4">
        <label htmlFor="date" className="block font-semibold text-text_primary mb-1">
          {t('step1Title')}
        </label>
        <input
          type="date"
          id="date"
          value={selectedDate}
          onChange={(e) => onDataChange({ date: e.target.value, time: selectedTime })}
          className="block w-full rounded border border-gray-300 p-2 focus:border-primary focus:ring-primary"
          aria-required="true"
        />
      </div>

      <div className="mb-6">
        <label htmlFor="time" className="block font-semibold text-text_primary mb-1">
          {t('step1Title')}
        </label>
        <input
          type="time"
          id="time"
          value={selectedTime}
          onChange={(e) => onDataChange({ date: selectedDate, time: e.target.value })}
          className="block w-full rounded border border-gray-300 p-2 focus:border-primary focus:ring-primary"
          aria-required="true"
        />
      </div>

      <button
        disabled={isNextDisabled}
        onClick={onNext}
        className={`rounded px-4 py-2 text-white hover:bg-secondary ${
          isNextDisabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary'
        }`}
      >
        {t('nextButton')}
      </button>
    </div>
  );
}

// Types for collected data
interface PatientInfo {
  id?: string; // patient id optionally
  fullName: string;
  dateOfBirth: string;
  contactNumber: string;
  email: string;
}
interface BookingData {
  date: string;
  time: string;
  patientInfo: PatientInfo | null;
}

export function AppointmentBookingWizard() {
  const t = useTranslations('AppointmentBooking');
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [bookingData, setBookingData] = React.useState<BookingData>({
    date: '',
    time: '',
    patientInfo: null,
  });

  const [isLoading, setIsLoading] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function handleNext() {
    if (step === 3) {
      // Final step: send appointment to backend
      if (!bookingData.patientInfo?.id) {
        setError(t('patientInfoMissing'));
        return;
      }

      const payload = {
        patient_id: bookingData.patientInfo.id,
        appointment_date: bookingData.date,
        appointment_time: bookingData.time,
      };

      setIsLoading(true);
      setError(null);
      fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(async (res) => {
          setIsLoading(false);
          if (res.ok) {
            setIsSuccess(true);
          } else {
            const data = await res.json();
            setError(data?.error || t('appointmentSaveError'));
          }
        })
        .catch(() => {
          setIsLoading(false);
          setError(t('appointmentSaveError'));
        });

      return;
    }
    setStep((prev) => (prev + 1) as 1 | 2 | 3);
  }

  function handleBack() {
    if (step > 1) {
      setStep((prev) => (prev - 1) as 1 | 2 | 3);
    }
  }

  function updateDateTime(data: { date: string; time: string }) {
    setBookingData((prev) => ({ ...prev, date: data.date, time: data.time }));
  }

  function savePatientInfo(data: PatientInfo) {
    setBookingData((prev) => ({ ...prev, patientInfo: data }));
  }

  if (isSuccess) {
    return (
      <div className="max-w-3xl mx-auto p-6 bg-surface rounded shadow text-center">
        <h2 className="text-2xl font-bold mb-4">{t('confirmationSuccessTitle')}</h2>
        <p className="mb-4">{t('confirmationSuccessMessage')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-surface rounded shadow">
      {step === 1 && (
        <SelectDateTimeStep
          onNext={handleNext}
          onDataChange={updateDateTime}
          selectedDate={bookingData.date}
          selectedTime={bookingData.time}
        />
      )}
      {step === 2 && (
        <EnterPatientInfo
          onBack={handleBack}
          onNext={(data) => {
            savePatientInfo(data);
            handleNext();
          }}
        />
      )}
      {step === 3 && bookingData.patientInfo && (
        <Confirmation
          onBack={handleBack}
          onNext={handleNext}
          isLoading={isLoading}
          error={error}
        />
      )}
      {step === 3 && !bookingData.patientInfo && (
        <div className="text-red-600">{t('patientInfoMissing')}</div>
      )}
    </div>
  );
}

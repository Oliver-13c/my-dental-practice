import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { EnterPatientInfo } from './steps/EnterPatientInfo';
import { Confirmation } from './steps/Confirmation';
import { useAuth } from '@/shared/hooks/useAuth';

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

interface PatientInfo {
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
  const { user, isLoading } = useAuth();

  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [bookingData, setBookingData] = React.useState<BookingData>({ date: '', time: '', patientInfo: null });
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (isLoading) {
    return <p>Loading...</p>;
  }

  if (!user) {
    return <p>{t('auth.login.loginFirst')}</p>;
  }

  function handleNext() {
    if (step === 3) {
      submitBooking();
    } else {
      setStep((prev) => (prev + 1) as 1 | 2 | 3);
    }
  }

  function handleBack() {
    if (step > 1) {
      setStep((prev) => (prev - 1) as 1 | 2 | 3);
      setError(null);
      setSuccess(false);
    }
  }

  function updateDateTime(data: { date: string; time: string }) {
    setBookingData((prev) => ({ ...prev, date: data.date, time: data.time }));
  }

  function savePatientInfo(data: PatientInfo) {
    setBookingData((prev) => ({ ...prev, patientInfo: data }));
  }

  async function submitBooking() {
    if (!bookingData.patientInfo) {
      setError(t('AppointmentBooking.patientInfoMissing'));
      return;
    }
    if (!user) {
      setError('User not authenticated');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: user.id,
          appointment_date: bookingData.date,
          appointment_time: bookingData.time,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Booking failed');
      }

      // send confirmation email
      await fetch('/api/send-confirmation-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: bookingData.patientInfo.email,
          patientInfo: bookingData.patientInfo,
          appointmentDate: bookingData.date,
          appointmentTime: bookingData.time,
          lang: 'en', // TODO: dynamic lang from user or context
        }),
      });

      setSuccess(true);
    } catch (e: any) {
      setError(e.message || 'Error during booking');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="text-center p-6">
        <h2 className="text-xl font-bold mb-4">{t('AppointmentBooking.bookingSuccessMessage')}</h2>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-surface rounded shadow">
      {error && <div className="mb-4 text-red-600">{error}</div>}
      {loading && <div className="mb-4">{t('AppointmentBooking.loading')}</div>}
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
          onNext={() => {
            savePatientInfo(bookingData.patientInfo!);
            handleNext();
          }}
          onDataChange={(data) => setBookingData({ ...bookingData, patientInfo: data })}
          patientInfo={bookingData.patientInfo}
        />
      )}
      {step === 3 && bookingData.patientInfo && (
        <Confirmation
          onConfirm={submitBooking}
          onEdit={handleBack}
          data={bookingData}
          loading={loading}
          error={error}
        />
      )}
      {step === 3 && !bookingData.patientInfo && (
        <div className="text-red-600">{t('AppointmentBooking.patientInfoMissing')}</div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { SelectAppointmentSlot } from './select-appointment-slot';
import { createBooking } from '../api/create-booking';
import { AppointmentSlotType } from '@/entities/appointment/model/appointment.types';

export default function BookingForm() {
  const t = useTranslations('booking.form');
  const router = useRouter();

  const [selectedSlot, setSelectedSlot] = useState<AppointmentSlotType | null>(null);
  const [patientName, setPatientName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot) {
      setError(t('error.noSlotSelected'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await createBooking({
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        patientName,
      });
      router.push('/appointments');
    } catch (err) {
      setError(t('error.bookingFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md p-4 bg-surface rounded shadow">
      <h1 className="text-2xl font-bold mb-4">{t('title')}</h1>
      <div className="mb-4">
        <label htmlFor="patientName" className="block mb-1">
          {t('patientName')}
        </label>
        <input
          id="patientName"
          type="text"
          className="w-full border border-gray-300 rounded p-2"
          value={patientName}
          onChange={(e) => setPatientName(e.target.value)}
          required
        />
      </div>
      <SelectAppointmentSlot selectedSlot={selectedSlot} onSelect={setSelectedSlot} />
      {error && <p className="text-red-600 mt-2">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="mt-4 w-full bg-primary text-white py-2 rounded disabled:opacity-50"
      >
        {loading ? t('loading') : t('book')}
      </button>
    </form>
  );
}

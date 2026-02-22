'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { checkAppointmentAvailability } from '../api/check-availability';
import { AppointmentSlotType } from '@/entities/appointment/model/appointment.types';
import { cn } from '@/shared/lib/utils';

interface SelectAppointmentSlotProps {
  selectedSlot: AppointmentSlotType | null;
  onSelect: (slot: AppointmentSlotType) => void;
}

export function SelectAppointmentSlot({ selectedSlot, onSelect }: SelectAppointmentSlotProps) {
  const t = useTranslations('booking.selectSlot');
  const [availableSlots, setAvailableSlots] = useState<AppointmentSlotType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simulated slots - in real app calculate dynamically based on business hours
  const slots: AppointmentSlotType[] = Array.from({ length: 16 }, (_, i) => {
    const hour = 9 + Math.floor(i / 2);
    const minute = i % 2 === 0 ? 0 : 30;
    const start = new Date();
    start.setHours(hour, minute, 0, 0);
    const end = new Date(start);
    end.setMinutes(start.getMinutes() + 30);
    return {
      id: `slot-${i}`,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    };
  });

  useEffect(() => {
    async function fetchAvailability() {
      setLoading(true);
      setError(null);
      try {
        const available = await Promise.all(
          slots.map(async (slot) => {
            const isAvailable = await checkAppointmentAvailability(slot.startTime, 30);
            return isAvailable ? slot : null;
          })
        );
        setAvailableSlots(available.filter((slot): slot is AppointmentSlotType => slot !== null));
      } catch (e) {
        setError(t('error.checkAvailability'));
      } finally {
        setLoading(false);
      }
    }
    fetchAvailability();
  }, []);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">{t('title')}</h2>
      {loading && <p>{t('loading')}</p>}
      {error && <p className="text-red-600">{error}</p>}
      <ul className="grid grid-cols-4 gap-2" role="list">
        {slots.map((slot) => {
          const isAvailable = availableSlots.some((s) => s.id === slot.id);
          const isSelected = selectedSlot?.id === slot.id;
          return (
            <li key={slot.id}>
              <button
                type="button"
                disabled={!isAvailable}
                aria-pressed={isSelected}
                aria-label={`Select ${new Date(slot.startTime).toLocaleTimeString()}`}
                className={cn(
                  'w-full py-2 rounded-md border text-sm',
                  isAvailable
                    ? isSelected
                      ? 'bg-primary text-white border-primary'
                      : 'bg-surface border-gray-300 hover:bg-primary hover:text-white'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed',
                  'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary'
                )}
                onClick={() => isAvailable && onSelect(slot)}
              >
                {new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

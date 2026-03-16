'use client';

import { useTranslations } from 'next-intl';
import type { AppointmentWithDetails } from '@/entities/appointment/model/appointment.types';
import type { StaffRole } from '@/entities/staff/model/staff.types';

const CLINICAL_ROLES: StaffRole[] = ['dentist', 'hygienist', 'admin'];

function formatTime(iso: string) {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? 'PM' : 'AM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:${m.toString().padStart(2, '0')} ${period}`;
}

interface PatientSnapshotCardProps {
  appointment: AppointmentWithDetails;
  viewerRole: StaffRole;
  /** Optional callback when the card is first opened (for audit logging). */
  onOpen?: (appointmentId: string) => void;
}

export function PatientSnapshotCard({
  appointment,
  viewerRole,
  onOpen,
}: PatientSnapshotCardProps) {
  const t = useTranslations('staff.clinical.snapshot');
  const isClinical = CLINICAL_ROLES.includes(viewerRole);

  const patient = appointment.patient;
  const fullName = patient
    ? `${patient.first_name} ${patient.last_name}`
    : (appointment.patient_name ?? t('unknown'));

  const phone = appointment.phone ?? patient?.phone ?? null;
  const email = patient?.email ?? null;

  // Fire audit hook once when card mounts
  // (caller decides whether to log; onOpen is optional)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleRef = (node: HTMLDivElement | null) => {
    if (node && onOpen) {
      onOpen(appointment.id);
    }
  };

  return (
    <div
      ref={handleRef}
      className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm space-y-3"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-base font-semibold text-slate-900">{fullName}</p>
          <p className="text-xs text-slate-500">
            {formatTime(appointment.start_time)}
            {appointment.appointment_type?.name
              ? ` · ${appointment.appointment_type.name}`
              : ''}
            {appointment.appointment_type?.duration_minutes
              ? ` (${appointment.appointment_type.duration_minutes} min)`
              : ''}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 capitalize">
          {appointment.status.replace('-', ' ')}
        </span>
      </div>

      {/* Contact */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <div>
          <dt className="text-xs text-slate-400 uppercase tracking-wide">{t('phone')}</dt>
          <dd className="font-medium text-slate-800">{phone ?? t('na')}</dd>
        </div>

        <div>
          <dt className="text-xs text-slate-400 uppercase tracking-wide">{t('email')}</dt>
          <dd className="font-medium text-slate-800">
            {isClinical ? (email ?? t('na')) : t('restricted')}
          </dd>
        </div>
      </dl>

      {/* Reason / Notes — clinical only */}
      <div>
        <p className="text-xs text-slate-400 uppercase tracking-wide">{t('notes')}</p>
        {isClinical ? (
          <p className="mt-0.5 text-sm text-slate-700">
            {appointment.notes ? appointment.notes : <span className="italic text-slate-400">{t('noNotes')}</span>}
          </p>
        ) : (
          <p className="mt-0.5 text-xs italic text-slate-400">{t('restricted')}</p>
        )}
      </div>
    </div>
  );
}

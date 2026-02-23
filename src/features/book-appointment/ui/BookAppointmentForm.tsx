// This is a starting UI component for the appointment booking feature
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Example schema for appointment booking
const appointmentSchema = z.object({
  doctorId: z.string().min(1, 'Please select a doctor'),
  date: z.string().min(1, 'Please select a date'),
  time: z.string().min(1, 'Please select a time'),
  reason: z.string().max(500).optional(),
});

export type AppointmentFormData = z.infer<typeof appointmentSchema>;

export function BookAppointmentForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AppointmentFormData>({ resolver: zodResolver(appointmentSchema) });

  const onSubmit = (data: AppointmentFormData) => {
    // placeholder for form submission logic
    console.log('Booking appointment:', data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4 max-w-md mx-auto bg-white rounded-md shadow-md">
      <div>
        <label htmlFor="doctorId" className="block text-sm font-medium text-slate-700">
          Doctor
        </label>
        <select id="doctorId" {...register('doctorId')} className="mt-1 block w-full rounded border border-slate-300 p-2">
          <option value="">Select a doctor</option>
          {/* TODO: populate options dynamically from doctors entity */}
          <option value="doc1">Dr. Smith</option>
          <option value="doc2">Dr. Johnson</option>
        </select>
        {errors.doctorId && <p className="text-amber-700 text-sm mt-1">{errors.doctorId.message}</p>}
      </div>

      <div>
        <label htmlFor="date" className="block text-sm font-medium text-slate-700">
          Date
        </label>
        <input type="date" id="date" {...register('date')} className="mt-1 block w-full rounded border border-slate-300 p-2" />
        {errors.date && <p className="text-amber-700 text-sm mt-1">{errors.date.message}</p>}
      </div>

      <div>
        <label htmlFor="time" className="block text-sm font-medium text-slate-700">
          Time
        </label>
        <input type="time" id="time" {...register('time')} className="mt-1 block w-full rounded border border-slate-300 p-2" />
        {errors.time && <p className="text-amber-700 text-sm mt-1">{errors.time.message}</p>}
      </div>

      <div>
        <label htmlFor="reason" className="block text-sm font-medium text-slate-700">
          Reason for Visit (optional)
        </label>
        <textarea
          id="reason"
          {...register('reason')}
          rows={3}
          className="mt-1 block w-full rounded border border-slate-300 p-2"
          maxLength={500}
        />
      </div>

      <button
        type="submit"
        className="bg-teal-700 text-white px-4 py-2 rounded hover:bg-teal-800 transition"
      >
        Book Appointment
      </button>
    </form>
  );
}

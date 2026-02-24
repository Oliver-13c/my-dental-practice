'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const registerPatientSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
});

export type RegisterPatientData = z.infer<typeof registerPatientSchema>;

export function RegisterPatientForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterPatientData>({ resolver: zodResolver(registerPatientSchema) });

  const onSubmit = (data: RegisterPatientData) => {
    // placeholder for registration logic
    console.log('Registering patient:', data);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 p-4 max-w-md mx-auto bg-white rounded-md shadow-md"
    >
      <div>
        <label htmlFor="firstName" className="block text-sm font-medium text-slate-700">
          First Name
        </label>
        <input
          type="text"
          id="firstName"
          {...register('firstName')}
          className="mt-1 block w-full rounded border border-slate-300 p-2"
        />
        {errors.firstName && (
          <p className="text-amber-700 text-sm mt-1">{errors.firstName.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="lastName" className="block text-sm font-medium text-slate-700">
          Last Name
        </label>
        <input
          type="text"
          id="lastName"
          {...register('lastName')}
          className="mt-1 block w-full rounded border border-slate-300 p-2"
        />
        {errors.lastName && (
          <p className="text-amber-700 text-sm mt-1">{errors.lastName.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          type="email"
          id="email"
          {...register('email')}
          className="mt-1 block w-full rounded border border-slate-300 p-2"
        />
        {errors.email && (
          <p className="text-amber-700 text-sm mt-1">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-slate-700">
          Phone (optional)
        </label>
        <input
          type="tel"
          id="phone"
          {...register('phone')}
          className="mt-1 block w-full rounded border border-slate-300 p-2"
        />
      </div>

      <button
        type="submit"
        className="bg-teal-700 text-white px-4 py-2 rounded hover:bg-teal-800 transition"
      >
        Register
      </button>
    </form>
  );
}

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslations } from 'next-intl';
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';
import { Textarea } from '@/shared/ui/textarea';
import { Card } from '@/shared/ui/card';
import { useCsrfToken } from '@/shared/hooks/useCsrfToken';

const patientIntakeSchema = z.object({
  fullName: z.string().min(2, 'patientIntake.errors.fullNameRequired'),
  dateOfBirth: z.string().min(1, 'patientIntake.errors.dateOfBirthRequired'),
  contactNumber: z.string().min(5, 'patientIntake.errors.contactNumberRequired'),
  email: z.string().email('patientIntake.errors.invalidEmail'),
  medicalHistory: z.string().optional(),
  insuranceProvider: z.string().optional(),
  insurancePolicyNumber: z.string().optional(),
});

type PatientIntakeFormData = z.infer<typeof patientIntakeSchema>;

export function PatientIntakeForm({ patientId }: { patientId: string }) {
  const t = useTranslations('patientIntake.form');
  const getCsrfHeaders = useCsrfToken();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PatientIntakeFormData>({ resolver: zodResolver(patientIntakeSchema) });

  async function onSubmit(data: PatientIntakeFormData) {
    try {
      const csrfHeaders = await getCsrfHeaders();
      const response = await fetch('/api/patient-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        body: JSON.stringify({ ...data, patientId }),
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      alert(t('success'));
    } catch (error) {
      console.error('Error submitting intake form:', error);
      alert(t('error'));
    }
  }

  return (
    <Card className="max-w-xl mx-auto p-6">
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <h1 className="text-2xl font-bold mb-4">{t('title')}</h1>

        <div className="mb-4">
          <label htmlFor="fullName" className="block font-semibold mb-1">
            {t('fullName')}
          </label>
          <Input id="fullName" {...register('fullName')} aria-invalid={!!errors.fullName} />
          {errors.fullName && <p className="text-red-600 mt-1">{t(errors.fullName.message)}</p>}
        </div>

        <div className="mb-4">
          <label htmlFor="dateOfBirth" className="block font-semibold mb-1">
            {t('dateOfBirth')}
          </label>
          <Input type="date" id="dateOfBirth" {...register('dateOfBirth')} aria-invalid={!!errors.dateOfBirth} />
          {errors.dateOfBirth && <p className="text-red-600 mt-1">{t(errors.dateOfBirth.message)}</p>}
        </div>

        <div className="mb-4">
          <label htmlFor="contactNumber" className="block font-semibold mb-1">
            {t('contactNumber')}
          </label>
          <Input id="contactNumber" {...register('contactNumber')} aria-invalid={!!errors.contactNumber} />
          {errors.contactNumber && <p className="text-red-600 mt-1">{t(errors.contactNumber.message)}</p>}
        </div>

        <div className="mb-4">
          <label htmlFor="email" className="block font-semibold mb-1">
            {t('email')}
          </label>
          <Input type="email" id="email" {...register('email')} aria-invalid={!!errors.email} />
          {errors.email && <p className="text-red-600 mt-1">{t(errors.email.message)}</p>}
        </div>

        <div className="mb-4">
          <label htmlFor="medicalHistory" className="block font-semibold mb-1">
            {t('medicalHistory')}
          </label>
          <Textarea id="medicalHistory" {...register('medicalHistory')} />
        </div>

        <div className="mb-4">
          <label htmlFor="insuranceProvider" className="block font-semibold mb-1">
            {t('insuranceProvider')}
          </label>
          <Input id="insuranceProvider" {...register('insuranceProvider')} />
        </div>

        <div className="mb-4">
          <label htmlFor="insurancePolicyNumber" className="block font-semibold mb-1">
            {t('insurancePolicyNumber')}
          </label>
          <Input id="insurancePolicyNumber" {...register('insurancePolicyNumber')} />
        </div>

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? t('submitting') : t('submit')}
        </Button>
      </form>
    </Card>
  );
}

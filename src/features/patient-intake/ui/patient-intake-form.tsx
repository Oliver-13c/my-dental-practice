import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslations } from 'next-intl';
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';
import { Textarea } from '@/shared/ui/textarea';
import { Card } from '@/shared/ui/card';
import { useCsrfToken } from '@/shared/hooks/useCsrfToken';
import { Field } from '@/shared/ui/field';
import { FormFeedback } from '@/shared/ui/form-feedback';

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
  const [submitState, setSubmitState] = useState<'idle' | 'success' | 'error'>('idle');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PatientIntakeFormData>({ resolver: zodResolver(patientIntakeSchema) });

  async function onSubmit(data: PatientIntakeFormData) {
    try {
      setSubmitState('idle');
      const csrfHeaders = await getCsrfHeaders();
      const response = await fetch('/api/patient-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        body: JSON.stringify({ ...data, patientId }),
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      setSubmitState('success');
    } catch (error) {
      console.error('Error submitting intake form:', error);
      setSubmitState('error');
    }
  }

  return (
    <Card className="max-w-xl mx-auto p-6">
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <h1 className="text-2xl font-bold mb-4">{t('title')}</h1>

        {submitState === 'success' && <FormFeedback type="success" message={t('success')} className="mb-4" />}
        {submitState === 'error' && <FormFeedback type="error" message={t('error')} className="mb-4" />}

        <Field
          className="mb-4"
          htmlFor="fullName"
          label={t('fullName')}
          required
          error={errors.fullName ? t(errors.fullName.message) : undefined}
        >
          <Input id="fullName" {...register('fullName')} validationState={errors.fullName ? 'error' : 'default'} aria-invalid={!!errors.fullName} />
        </Field>

        <Field
          className="mb-4"
          htmlFor="dateOfBirth"
          label={t('dateOfBirth')}
          required
          error={errors.dateOfBirth ? t(errors.dateOfBirth.message) : undefined}
        >
          <Input type="date" id="dateOfBirth" {...register('dateOfBirth')} validationState={errors.dateOfBirth ? 'error' : 'default'} aria-invalid={!!errors.dateOfBirth} />
        </Field>

        <Field
          className="mb-4"
          htmlFor="contactNumber"
          label={t('contactNumber')}
          required
          error={errors.contactNumber ? t(errors.contactNumber.message) : undefined}
        >
          <Input id="contactNumber" {...register('contactNumber')} validationState={errors.contactNumber ? 'error' : 'default'} aria-invalid={!!errors.contactNumber} />
        </Field>

        <Field
          className="mb-4"
          htmlFor="email"
          label={t('email')}
          required
          error={errors.email ? t(errors.email.message) : undefined}
        >
          <Input type="email" id="email" {...register('email')} validationState={errors.email ? 'error' : 'default'} aria-invalid={!!errors.email} />
        </Field>

        <Field className="mb-4" htmlFor="medicalHistory" label={t('medicalHistory')}>
          <Textarea id="medicalHistory" {...register('medicalHistory')} />
        </Field>

        <Field className="mb-4" htmlFor="insuranceProvider" label={t('insuranceProvider')}>
          <Input id="insuranceProvider" {...register('insuranceProvider')} />
        </Field>

        <Field className="mb-4" htmlFor="insurancePolicyNumber" label={t('insurancePolicyNumber')}>
          <Input id="insurancePolicyNumber" {...register('insurancePolicyNumber')} />
        </Field>

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? t('submitting') : t('submit')}
        </Button>
      </form>
    </Card>
  );
}

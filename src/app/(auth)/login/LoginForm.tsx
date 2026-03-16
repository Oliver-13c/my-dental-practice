'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { supabase } from '@/shared/api/supabase-client';
import { useRouter } from 'next/navigation';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { FormFeedback } from '@/shared/ui/form-feedback';
import { Input } from '@/shared/ui/input';

interface LoginFormInputs {
  email: string;
  password: string;
}

export function LoginForm() {
  const t = useTranslations('auth.login');
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormInputs>();
  const router = useRouter();

  async function onSubmit(data: LoginFormInputs) {
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (error) {
      setError('root', { type: 'server', message: t('loginError') });
    } else {
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-md space-y-6 p-4">
      <h2 className="text-2xl font-bold mb-4">{t('loginTitle')}</h2>

      {errors.root?.message && <FormFeedback type="error" message={errors.root.message} />}

      <Field
        htmlFor="email"
        label={t('email')}
        required
        error={errors.email ? t('loginError') : undefined}
      >
        <Input
          id="email"
          type="email"
          {...register('email', { required: true })}
          validationState={errors.email ? 'error' : 'default'}
          aria-invalid={errors.email ? 'true' : 'false'}
        />
      </Field>

      <Field
        htmlFor="password"
        label={t('password')}
        required
        error={errors.password ? t('loginError') : undefined}
      >
        <Input
          id="password"
          type="password"
          {...register('password', { required: true })}
          validationState={errors.password ? 'error' : 'default'}
          aria-invalid={errors.password ? 'true' : 'false'}
        />
      </Field>

      <Button type="submit" disabled={isSubmitting} loading={isSubmitting} fullWidth>
        {t('login')}
      </Button>
    </form>
  );
}

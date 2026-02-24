'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { supabase } from '@/shared/api/supabase-client';
import { useRouter, useSearchParams } from 'next/navigation';

interface LoginFormInputs {
  email: string;
  password: string;
}

export function LoginForm() {
  const t = useTranslations('auth.login');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormInputs>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackError = searchParams.get('error');
  const [errorMessage, setErrorMessage] = useState<string | null>(
    callbackError === 'confirmation_failed' ? t('confirmationFailed') : null,
  );

  async function onSubmit(data: LoginFormInputs) {
    setErrorMessage(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (error) {
      if (error.message.toLowerCase().includes('email not confirmed')) {
        setErrorMessage(t('emailNotConfirmed'));
      } else {
        setErrorMessage(t('loginError'));
      }
    } else {
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-md mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">{t('loginTitle')}</h2>

      {errorMessage && <p className="text-red-600">{errorMessage}</p>}

      <div>
        <label htmlFor="email" className="block font-semibold mb-1">
          {t('email')}
        </label>
        <input
          id="email"
          type="email"
          {...register('email', { required: true })}
          className={`w-full rounded border border-gray-300 p-2 focus:border-primary focus:ring-primary ${errors.email ? 'border-red-500' : ''}`}
          aria-invalid={errors.email ? 'true' : 'false'}
        />
      </div>

      <div>
        <label htmlFor="password" className="block font-semibold mb-1">
          {t('password')}
        </label>
        <input
          id="password"
          type="password"
          {...register('password', { required: true })}
          className={`w-full rounded border border-gray-300 p-2 focus:border-primary focus:ring-primary ${errors.password ? 'border-red-500' : ''}`}
          aria-invalid={errors.password ? 'true' : 'false'}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded bg-primary px-4 py-2 font-semibold text-white hover:bg-secondary disabled:opacity-50"
      >
        {t('login')}
      </button>
    </form>
  );
}

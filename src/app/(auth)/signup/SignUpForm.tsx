'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { supabase } from '@/shared/api/supabase-client';

interface SignUpFormInputs {
  email: string;
  password: string;
}

export function SignUpForm() {
  const t = useTranslations('auth.signup');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormInputs>();
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function onSubmit(data: SignUpFormInputs) {
    setErrorMessage(null);
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setErrorMessage(t('signupError'));
    } else {
      setSubmitted(true);
    }
  }

  if (submitted) {
    return (
      <div className="space-y-4 max-w-md mx-auto p-4 text-center">
        <h2 className="text-2xl font-bold mb-4">{t('signupTitle')}</h2>
        <p className="text-green-600">{t('checkEmail')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-md mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">{t('signupTitle')}</h2>

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
          {...register('password', { required: true, minLength: 6 })}
          className={`w-full rounded border border-gray-300 p-2 focus:border-primary focus:ring-primary ${errors.password ? 'border-red-500' : ''}`}
          aria-invalid={errors.password ? 'true' : 'false'}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded bg-primary px-4 py-2 font-semibold text-white hover:bg-secondary disabled:opacity-50"
      >
        {t('signup')}
      </button>
    </form>
  );
}

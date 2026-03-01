'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';

const userFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'staff'], { errorMap: () => ({ message: 'Invalid role' }) }),
  isActive: z.boolean(),
});

type UserFormData = z.infer<typeof userFormSchema>;

interface UserFormProps {
  initialData?: Partial<UserFormData>;
  onSubmit: (data: UserFormData) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
}

export function UserForm({
  initialData,
  onSubmit,
  isLoading = false,
  submitLabel = 'Save',
}: UserFormProps) {
  const t = useTranslations('admin.users.form');
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: initialData || {
      isActive: true,
      role: 'staff',
    },
  });

  return (
    <Card className="max-w-lg p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('firstName')}
          </label>
          <Input
            {...register('firstName')}
            placeholder="John"
            className={errors.firstName ? 'border-red-500' : ''}
          />
          {errors.firstName && (
            <p className="text-red-500 text-sm mt-1">{errors.firstName.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('lastName')}
          </label>
          <Input
            {...register('lastName')}
            placeholder="Doe"
            className={errors.lastName ? 'border-red-500' : ''}
          />
          {errors.lastName && (
            <p className="text-red-500 text-sm mt-1">{errors.lastName.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('email')}
          </label>
          <Input
            {...register('email')}
            type="email"
            placeholder="john@example.com"
            className={errors.email ? 'border-red-500' : ''}
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('role')}
          </label>
          <select
            {...register('role')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
          {errors.role && (
            <p className="text-red-500 text-sm mt-1">{errors.role.message}</p>
          )}
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            {...register('isActive')}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label className="ml-2 text-sm font-medium text-gray-700">
            {t('active')}
          </label>
        </div>

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? t('saving') : submitLabel}
        </Button>
      </form>
    </Card>
  );
}

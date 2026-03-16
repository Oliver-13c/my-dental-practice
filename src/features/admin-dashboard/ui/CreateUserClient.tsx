'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserForm } from './UserForm';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { csrfFetch } from '@/shared/lib/csrf-fetch';

interface CreateUserData {
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'staff';
  isActive: boolean;
}

interface PasswordModalProps {
  email: string;
  tempPassword: string;
  firstName: string;
  onClose: () => void;
  t: (key: string, values?: Record<string, string | number>) => string;
}

function TemporaryPasswordModal({ email, tempPassword, firstName, onClose, t }: PasswordModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full p-6 space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">{t('modal.title')}</h2>
        
        <div className="bg-blue-50 border border-blue-200 rounded p-4 space-y-2">
          <p className="text-sm font-medium text-gray-700">
            <strong>{t('modal.staffMember')}:</strong> {firstName}
          </p>
          <p className="text-sm font-medium text-gray-700">
            <strong>{t('modal.email')}:</strong> {email}
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded p-4 space-y-3">
          <p className="text-sm font-medium text-amber-900">{t('modal.temporaryPassword')}</p>
          <div className="flex gap-2">
            <code className="flex-1 bg-white border border-amber-300 rounded px-3 py-2 text-sm font-mono text-gray-900 break-all">
              {tempPassword}
            </code>
            <button
              onClick={handleCopy}
              className={`px-3 py-2 rounded font-medium text-sm transition ${
                copied
                  ? 'bg-green-600 text-white'
                  : 'bg-amber-600 text-white hover:bg-amber-700'
              }`}
            >
              {copied ? t('modal.copied') : t('modal.copy')}
            </button>
          </div>
          <p className="text-xs text-amber-800">
            {t('modal.passwordWarning', { firstName })}
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded p-4">
          <p className="text-sm text-blue-800">
            <strong>{t('modal.nextSteps')}:</strong>
          </p>
          <ol className="text-xs text-blue-700 mt-2 space-y-1 list-decimal list-inside">
            <li>{t('modal.stepSharePassword', { firstName })}</li>
            <li>{t('modal.stepVisitLogin')}</li>
            <li>{t('modal.stepChangePassword')}</li>
          </ol>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              navigator.clipboard.writeText(tempPassword);
              setCopied(true);
            }}
          >
            {t('modal.copyAndContinue')}
          </Button>
          <Button className="flex-1" onClick={onClose}>
            {t('modal.done')}
          </Button>
        </div>
      </Card>
    </div>
  );
}

export function CreateUserClient() {
  const t = useTranslations('admin.users');
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [modalData, setModalData] = useState<{ email: string; tempPassword: string; firstName: string } | null>(null);

  const handleSubmit = async (data: CreateUserData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Map role from UI to backend format
      const roleMap: Record<string, string> = {
        admin: 'admin',
        staff: 'receptionist',
      };

      // Generate a temporary password (server-side only, not shown to user)
      const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!`;

      const response = await csrfFetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          password: tempPassword,
          first_name: data.firstName,
          last_name: data.lastName,
          role: roleMap[data.role] || 'receptionist',
          sendWelcomeEmail: true, // Signal to backend to send password reset email
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t('errors.createUser'));
      }

      // Show temporary password in secure modal + email was sent by backend
      setModalData({
        email: data.email,
        tempPassword: tempPassword,
        firstName: data.firstName,
      });
      setShowPasswordModal(true);
    } catch (err) {
      console.error('Failed to create user:', err);
      setError(err instanceof Error ? err.message : t('errors.createUser'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleModalClose = () => {
    setShowPasswordModal(false);
    setModalData(null);
    router.push('/admin/users');
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/users">
          <Button variant="ghost">&larr; {t('backToUsers')}</Button>
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-4">
          {t('createNewUser')}
        </h1>
        <p className="text-gray-600 mt-1">
          {t('createUserDescription')}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <UserForm
        onSubmit={handleSubmit}
        isLoading={isLoading}
        submitLabel={t('createUser')}
      />

      {showPasswordModal && modalData && (
        <TemporaryPasswordModal
          email={modalData.email}
          tempPassword={modalData.tempPassword}
          firstName={modalData.firstName}
          onClose={handleModalClose}
          t={t}
        />
      )}
    </div>
  );
}

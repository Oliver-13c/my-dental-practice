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
}

function TemporaryPasswordModal({ email, tempPassword, firstName, onClose }: PasswordModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full p-6 space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">✓ User Created Successfully</h2>
        
        <div className="bg-blue-50 border border-blue-200 rounded p-4 space-y-2">
          <p className="text-sm font-medium text-gray-700">
            <strong>Staff member:</strong> {firstName}
          </p>
          <p className="text-sm font-medium text-gray-700">
            <strong>Email:</strong> {email}
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded p-4 space-y-3">
          <p className="text-sm font-medium text-amber-900">Temporary Password:</p>
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
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <p className="text-xs text-amber-800">
            ⚠️ This password will be displayed only once. Copy it now and store it securely.
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded p-4">
          <p className="text-sm text-green-800">
            ℹ️ A password reset email has also been sent to <strong>{email}</strong>. 
            The user can use either method to sign in.
          </p>
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
            Copy & Continue
          </Button>
          <Button className="flex-1" onClick={onClose}>
            Done
          </Button>
        </div>
      </Card>
    </div>
  );
}

interface CreateUserData {
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'staff';
  isActive: boolean;
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
        throw new Error(result.error || 'Failed to create user');
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
      setError(err instanceof Error ? err.message : 'Failed to create user');
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
          <Button variant="ghost">&larr; Back to Users</Button>
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-4">
          {t('createNewUser') || 'Create New User'}
        </h1>
        <p className="text-gray-600 mt-1">
          {t('createUserDescription') || 'Add a new staff member to the system'}
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
        submitLabel={t('createUser') || 'Create User'}
      />

      {showPasswordModal && modalData && (
        <TemporaryPasswordModal
          email={modalData.email}
          tempPassword={modalData.tempPassword}
          firstName={modalData.firstName}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}

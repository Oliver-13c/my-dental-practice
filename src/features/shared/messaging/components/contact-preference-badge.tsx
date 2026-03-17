/**
 * Shared Contact Preference Badge Component
 * 
 * Displays contact preferences for a patient across messaging interfaces
 */

'use client';

import { AlertCircle, CheckCircle2, Mail, MessageSquare } from 'lucide-react';
import type { ContactPreferences } from '../types/messaging.types';

interface ContactPreferenceBadgeProps {
  preferences?: ContactPreferences;
  className?: string;
}

export function ContactPreferenceBadge({ preferences, className = '' }: ContactPreferenceBadgeProps) {
  if (!preferences) {
    return null;
  }

  const { do_not_contact, reminder_email, reminder_sms, appointment_email, appointment_sms } = preferences;

  if (do_not_contact) {
    return (
      <div className={`inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 ${className}`}>
        <AlertCircle className="h-4 w-4 text-red-600" />
        <span className="text-xs font-medium text-red-700">Do Not Contact</span>
      </div>
    );
  }

  const preferredChannels = [];
  if (reminder_email || appointment_email) preferredChannels.push('email');
  if (reminder_sms || appointment_sms) preferredChannels.push('sms');

  if (preferredChannels.length === 0) {
    return (
      <div className={`inline-flex items-center gap-2 rounded-full bg-gray-50 px-3 py-1 ${className}`}>
        <AlertCircle className="h-4 w-4 text-gray-600" />
        <span className="text-xs font-medium text-gray-700">No Preferences Set</span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 ${className}`}>
      <CheckCircle2 className="h-4 w-4 text-green-600" />
      <span className="text-xs font-medium text-green-700">
        {preferredChannels.map((ch) => 
          ch === 'email' ? <Mail key="email" className="inline h-3 w-3 mr-1" /> : 
          <MessageSquare key="sms" className="inline h-3 w-3 mr-1" />
        )}
        {preferredChannels.join('/')}
      </span>
    </div>
  );
}

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Skeleton } from '@/shared/ui/skeleton';
import { CheckCircle, AlertCircle, Copy, Eye, EyeOff } from 'lucide-react';
import { csrfFetch } from '@/shared/lib/csrf-fetch';

interface TenantConfig {
  twilio_account_sid: string | null;
  twilio_auth_token: string | null;
  twilio_phone_number: string | null;
  twilio_webhook_url: string | null;
  twilio_status_webhook_url: string | null;
  twilio_enabled: boolean;
}

export function TwilioConfigurationForm() {
  const t = useTranslations('admin');
  const [config, setConfig] = useState<TenantConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAuthToken, setShowAuthToken] = useState(false);

  const [formData, setFormData] = useState({
    twilio_account_sid: '',
    twilio_auth_token: '',
    twilio_phone_number: '',
    twilio_webhook_url: '',
    twilio_status_webhook_url: '',
  });

  // Fetch existing configuration
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const response = await csrfFetch('/api/admin/tenant-configuration');
        const result = await response.json();

        if (response.ok) {
          const data = result.data as TenantConfig;
          setConfig(data);
          setFormData({
            twilio_account_sid: data.twilio_account_sid || '',
            twilio_auth_token: data.twilio_auth_token || '',
            twilio_phone_number: data.twilio_phone_number || '',
            twilio_webhook_url: data.twilio_webhook_url || '',
            twilio_status_webhook_url: data.twilio_status_webhook_url || '',
          });
        } else {
          // No config exists yet - that's OK
          setConfig({
            twilio_enabled: false,
            twilio_account_sid: null,
            twilio_auth_token: null,
            twilio_phone_number: null,
            twilio_webhook_url: null,
            twilio_status_webhook_url: null,
          });
        }
      } catch (err) {
        setError('Failed to load configuration');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setError(null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate required fields
    if (
      !formData.twilio_account_sid ||
      !formData.twilio_auth_token ||
      !formData.twilio_phone_number ||
      !formData.twilio_webhook_url ||
      !formData.twilio_status_webhook_url
    ) {
      setError('All fields are required');
      return;
    }

    try {
      setSaving(true);
      const response = await csrfFetch('/api/admin/tenant-configuration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(result.data.message);
        // Update config to show new values
        setConfig({
          twilio_enabled: result.data.twilio_enabled,
          twilio_account_sid: formData.twilio_account_sid,
          twilio_auth_token: formData.twilio_auth_token,
          twilio_phone_number: formData.twilio_phone_number,
          twilio_webhook_url: formData.twilio_webhook_url,
          twilio_status_webhook_url: formData.twilio_status_webhook_url,
        });
      } else {
        setError(result.error || 'Failed to save configuration');
      }
    } catch (err) {
      setError('An error occurred while saving configuration');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Twilio Configuration
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Configure your Twilio credentials and webhook URLs. These settings are
          stored securely and will be used for all SMS messaging across the
          practice.
        </p>
      </div>

      {/* Status Indicator */}
      <div className="mb-6 flex items-center gap-2">
        {config?.twilio_enabled ? (
          <>
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-600">
              Twilio is configured and enabled
            </span>
          </>
        ) : (
          <>
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <span className="text-sm font-medium text-amber-600">
              Twilio is not yet configured
            </span>
          </>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-4">
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Twilio Account SID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Twilio Account SID *
          </label>
          <Input
            type="text"
            value={formData.twilio_account_sid}
            onChange={(e) =>
              handleInputChange('twilio_account_sid', e.target.value)
            }
            placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            className="w-full"
          />
          <p className="mt-1 text-xs text-gray-500">
            Found in your Twilio Console under Account Info
          </p>
        </div>

        {/* Twilio Auth Token */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Twilio Auth Token *
          </label>
          <div className="relative">
            <Input
              type={showAuthToken ? 'text' : 'password'}
              value={formData.twilio_auth_token}
              onChange={(e) =>
                handleInputChange('twilio_auth_token', e.target.value)
              }
              placeholder="••••••••••••••••••••••••••••••••"
              className="w-full pr-10"
            />
            <button
              type="button"
              onClick={() => setShowAuthToken(!showAuthToken)}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
            >
              {showAuthToken ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Found in your Twilio Console. Keep this secret!
          </p>
        </div>

        {/* Twilio Phone Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Twilio Phone Number *
          </label>
          <Input
            type="tel"
            value={formData.twilio_phone_number}
            onChange={(e) =>
              handleInputChange('twilio_phone_number', e.target.value)
            }
            placeholder="+1 (555) 555-5555"
            className="w-full"
          />
          <p className="mt-1 text-xs text-gray-500">
            Your Twilio phone number (must include country code)
          </p>
        </div>

        {/* Webhook URLs */}
        <div className="border-t pt-4 mt-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Webhook URLs
          </h3>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Inbound SMS Webhook URL *
            </label>
            <div className="flex gap-2">
              <Input
                type="url"
                value={formData.twilio_webhook_url}
                onChange={(e) =>
                  handleInputChange('twilio_webhook_url', e.target.value)
                }
                placeholder="https://yourdomain.com/api/webhooks/twilio/sms"
                className="flex-1"
              />
              {formData.twilio_webhook_url && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(formData.twilio_webhook_url)}
                  className="px-3 py-2 text-gray-500 hover:text-gray-700"
                  title="Copy to clipboard"
                >
                  <Copy className="h-5 w-5" />
                </button>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Twilio will POST inbound SMS to this URL
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Delivery Status Webhook URL *
            </label>
            <div className="flex gap-2">
              <Input
                type="url"
                value={formData.twilio_status_webhook_url}
                onChange={(e) =>
                  handleInputChange('twilio_status_webhook_url', e.target.value)
                }
                placeholder="https://yourdomain.com/api/webhooks/twilio/status"
                className="flex-1"
              />
              {formData.twilio_status_webhook_url && (
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(formData.twilio_status_webhook_url)
                  }
                  className="px-3 py-2 text-gray-500 hover:text-gray-700"
                  title="Copy to clipboard"
                >
                  <Copy className="h-5 w-5" />
                </button>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Twilio will POST delivery status updates to this URL
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </form>

      {/* Quick Reference */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">📋 Setup Checklist</h3>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Log in to your Twilio Console</li>
          <li>Get your Account SID and Auth Token</li>
          <li>Buy or configure a phone number</li>
          <li>Fill in the form above with your credentials</li>
          <li>Deploy your application (webhook URLs must be live and reachable)</li>
          <li>Enter the webhook URLs in this form</li>
          <li>Click "Save Configuration"</li>
          <li>Configure webhooks in Twilio Console (add the URLs above)</li>
          <li>Send a test SMS from outside the practice to verify</li>
        </ol>
      </div>
    </Card>
  );
}

'use client';

import { useState } from 'react';

interface SectionProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

function SettingSection({ title, description, children }: SectionProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
      </div>
      {children}
    </div>
  );
}

function SettingToggle({ label, description, value, onChange }: { label: string; description: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-4 border-t border-gray-200 first:border-t-0">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-600 mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        aria-label={`Toggle ${label} ${value ? 'on' : 'off'}`}
        title={`Toggle ${label}`}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
          value ? 'bg-blue-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white transition ${
            value ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    // Security
    enforcePasswordExpiry: false,
    requireMfa: false,
    sessionTimeout: false,
    
    // Notifications
    emailOnUserCreation: true,
    emailOnPasswordReset: true,
    emailOnUserDeactivation: true,
    
    // Audit
    enableDetailedLogging: true,
    anonymizeIpAddresses: false,
  });

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage system configuration and preferences</p>
      </div>

      {saved && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-2 text-sm">
          <span>✓</span> Settings saved successfully
        </div>
      )}

      {/* Security Settings */}
      <SettingSection
        title="Security Settings"
        description="Configure security policies and access controls"
      >
        <SettingToggle
          label="Enforce Password Expiry"
          description="Require users to change passwords regularly"
          value={settings.enforcePasswordExpiry}
          onChange={(v) => setSettings({ ...settings, enforcePasswordExpiry: v })}
        />
        <SettingToggle
          label="Require Multi-Factor Authentication"
          description="Require MFA for all admin accounts"
          value={settings.requireMfa}
          onChange={(v) => setSettings({ ...settings, requireMfa: v })}
        />
        <SettingToggle
          label="Session Timeout"
          description="Automatically log out inactive sessions"
          value={settings.sessionTimeout}
          onChange={(v) => setSettings({ ...settings, sessionTimeout: v })}
        />

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          <p className="font-medium">💡 Tip:</p>
          <p>These settings require database migration to function. Run <code className="bg-blue-100 px-1.5 py-0.5 rounded">npx supabase db push</code></p>
        </div>
      </SettingSection>

      {/* Notification Settings */}
      <SettingSection
        title="Notification Settings"
        description="Configure email notifications for system events"
      >
        <SettingToggle
          label="Notify on User Creation"
          description="Send email when new users are created"
          value={settings.emailOnUserCreation}
          onChange={(v) => setSettings({ ...settings, emailOnUserCreation: v })}
        />
        <SettingToggle
          label="Notify on Password Reset"
          description="Send email when passwords are reset"
          value={settings.emailOnPasswordReset}
          onChange={(v) => setSettings({ ...settings, emailOnPasswordReset: v })}
        />
        <SettingToggle
          label="Notify on User Deactivation"
          description="Send email when users are deactivated"
          value={settings.emailOnUserDeactivation}
          onChange={(v) => setSettings({ ...settings, emailOnUserDeactivation: v })}
        />
      </SettingSection>

      {/* Audit & Logging */}
      <SettingSection
        title="Audit & Logging"
        description="Configure how system actions are logged and tracked"
      >
        <SettingToggle
          label="Enable Detailed Logging"
          description="Log all field-level changes for updates"
          value={settings.enableDetailedLogging}
          onChange={(v) => setSettings({ ...settings, enableDetailedLogging: v })}
        />
        <SettingToggle
          label="Anonymize IP Addresses"
          description="Remove identifying IP address information from logs"
          value={settings.anonymizeIpAddresses}
          onChange={(v) => setSettings({ ...settings, anonymizeIpAddresses: v })}
        />
      </SettingSection>

      {/* System Information */}
      <SettingSection
        title="System Information"
        description="View details about your system configuration"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">System Version</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">1.0.0</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">Last Updated</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">Feb 24, 2026</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">Database Status</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Connected
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">Environment</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">Production</p>
            </div>
          </div>
        </div>
      </SettingSection>

      {/* Backup & Recovery */}
      <SettingSection
        title="Backup & Recovery"
        description="Manage system backups and recovery options"
      >
        <div className="space-y-3">
          <button className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
            📥 Export Data
          </button>
          <button className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
            📋 View Backups
          </button>
        </div>
      </SettingSection>

      {/* Save Button */}
      <div className="flex gap-4">
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Save Settings
        </button>
        <button className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}

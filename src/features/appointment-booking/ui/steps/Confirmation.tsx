'use client';

import React from 'react';

interface ConfirmationProps {
  onConfirm: () => void;
  onEdit: () => void;
  data: any;
  loading: boolean;
  error: string | null;
}

export function Confirmation({ onConfirm, onEdit, data, loading, error }: ConfirmationProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold mb-4">Confirm Appointment</h2>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      <div className="bg-gray-100 p-4 rounded space-y-2">
        <p><strong>Date:</strong> {data.date}</p>
        <p><strong>Time:</strong> {data.time}</p>
        {data.patientInfo && (
          <>
            <p><strong>Name:</strong> {data.patientInfo.fullName}</p>
            <p><strong>Email:</strong> {data.patientInfo.email}</p>
            <p><strong>Phone:</strong> {data.patientInfo.contactNumber}</p>
          </>
        )}
      </div>

      <div className="flex gap-4">
        <button
          onClick={onEdit}
          disabled={loading}
          className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400 disabled:opacity-50"
        >
          Edit
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/80 disabled:opacity-50"
        >
          {loading ? 'Confirming...' : 'Confirm Booking'}
        </button>
      </div>
    </div>
  );
}

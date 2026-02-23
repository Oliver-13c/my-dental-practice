'use client';

import React from 'react';

interface PatientInfo {
  fullName: string;
  dateOfBirth: string;
  contactNumber: string;
  email: string;
}

interface Props {
  onNext: () => void;
  onDataChange: (data: PatientInfo) => void;
  patientInfo: PatientInfo | null;
}

export function EnterPatientInfo({ onNext, onDataChange, patientInfo }: Props) {
  const [formData, setFormData] = React.useState<PatientInfo>(
    patientInfo || {
      fullName: '',
      dateOfBirth: '',
      contactNumber: '',
      email: '',
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onDataChange(formData);
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-bold mb-4">Patient Information</h2>

      <div>
        <label htmlFor="fullName" className="block font-semibold mb-1">
          Full Name
        </label>
        <input
          id="fullName"
          type="text"
          value={formData.fullName}
          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
          className="w-full rounded border border-gray-300 p-2"
          required
        />
      </div>

      <div>
        <label htmlFor="dateOfBirth" className="block font-semibold mb-1">
          Date of Birth
        </label>
        <input
          id="dateOfBirth"
          type="date"
          value={formData.dateOfBirth}
          onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
          className="w-full rounded border border-gray-300 p-2"
        />
      </div>

      <div>
        <label htmlFor="contactNumber" className="block font-semibold mb-1">
          Contact Number
        </label>
        <input
          id="contactNumber"
          type="tel"
          value={formData.contactNumber}
          onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
          className="w-full rounded border border-gray-300 p-2"
        />
      </div>

      <div>
        <label htmlFor="email" className="block font-semibold mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full rounded border border-gray-300 p-2"
          required
        />
      </div>

      <button
        type="submit"
        className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/80"
      >
        Next
      </button>
    </form>
  );
}

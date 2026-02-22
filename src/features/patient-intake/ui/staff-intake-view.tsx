import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Button } from '@/shared/ui/button';

interface PatientIntakeData {
  patient_id: string;
  full_name: string;
  date_of_birth: string;
  contact_number: string;
  email: string;
  medical_history: string | null;
  insurance_provider: string | null;
  insurance_policy_number: string | null;
}

export function StaffIntakeView() {
  const t = useTranslations('patientIntake.staffView');
  const [data, setData] = useState<PatientIntakeData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/patient-intake');
        if (!response.ok) throw new Error(`Error: ${response.status}`);
        const json = await response.json();
        setData(json.data);
      } catch (err: any) {
        setError(err.message || t('fetchError'));
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [t]);

  async function handleDelete(patientId: string) {
    if (!confirm(t('confirmDelete'))) return;
    try {
      const response = await fetch(`/api/patient-intake?patientId=${patientId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Delete failed');
      setData((d) => d.filter((item) => item.patient_id !== patientId));
    } catch (err) {
      alert(t('deleteError'));
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">{t('title')}</h1>
      {loading && <p>{t('loading')}</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && !error && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('fullName')}</TableHead>
              <TableHead>{t('dateOfBirth')}</TableHead>
              <TableHead>{t('contactNumber')}</TableHead>
              <TableHead>{t('email')}</TableHead>
              <TableHead>{t('medicalHistory')}</TableHead>
              <TableHead>{t('insuranceProvider')}</TableHead>
              <TableHead>{t('insurancePolicyNumber')}</TableHead>
              <TableHead>{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.patient_id}>
                <TableCell>{item.full_name}</TableCell>
                <TableCell>{item.date_of_birth}</TableCell>
                <TableCell>{item.contact_number}</TableCell>
                <TableCell>{item.email}</TableCell>
                <TableCell>{item.medical_history ?? '-'}</TableCell>
                <TableCell>{item.insurance_provider ?? '-'}</TableCell>
                <TableCell>{item.insurance_policy_number ?? '-'}</TableCell>
                <TableCell>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(item.patient_id)}
                  >
                    {t('delete')}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

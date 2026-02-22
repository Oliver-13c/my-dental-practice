import { notFound } from 'next/navigation';
import { getServerSession } from '@/shared/api/supabase-auth';
import { AppointmentList } from '@/features/patient-appointments/ui/appointment-list';

export default async function PatientAppointmentsPage() {
  const session = await getServerSession();

  if (!session || session.role !== 'patient' || !session.user?.email) {
    notFound();
  }

  // Use email or another identifier for patient name
  const patientName = session.user.email;

  return <AppointmentList patientName={patientName} />;
}

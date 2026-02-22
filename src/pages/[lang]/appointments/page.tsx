import { BookAppointmentForm } from '@/features/book-appointment';
import { useLocale } from 'next-intl';

export default function AppointmentsPage() {
  const locale = useLocale();

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-6">
        {locale === 'es' ? 'Reservar cita' : 'Book Appointment'}
      </h1>
      <BookAppointmentForm />
    </main>
  );
}

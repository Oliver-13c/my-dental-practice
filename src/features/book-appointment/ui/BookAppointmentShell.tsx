import React from 'react';
import BookingForm from './booking-form';
import Header from '@/widgets/Header/Header';

export default function BookAppointmentShell() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-4xl mx-auto p-4">
        <BookingForm />
      </main>
    </div>
  );
}

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { SelectDateTime } from './steps/SelectDateTime'; // Placeholder for now
import { EnterPatientInfo } from './steps/EnterPatientInfo';
import { Confirmation } from './steps/Confirmation';

export function AppointmentBookingWizard() {
  const t = useTranslations('AppointmentBooking');
  const [currentStep, setCurrentStep] = useState(1);
  // This state will eventually hold the data collected from each step
  const [bookingData, setBookingData] = useState({});

  const handleNext = (data?: any) => {
    if (data) {
      setBookingData((prevData) => ({ ...prevData, ...data }));
    }
    setCurrentStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setCurrentStep((prevStep) => prevStep - 1);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <SelectDateTime onNext={handleNext} />;
      case 2:
        return <EnterPatientInfo onBack={handleBack} onNext={handleNext} />;
      case 3:
        // In a real app, pass collected bookingData to Confirmation
        return <Confirmation onBack={handleBack} onNext={handleNext} />;
      default:
        return <div>{t('bookingComplete')}</div>; // Or a success message component
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">{t('title')}</h1>
      <div className="mb-4">
        {/* Simple step indicator */}
        <p>Step {currentStep} of 3</p>
      </div>
      <div>{renderStep()}</div>
    </div>
  );
}

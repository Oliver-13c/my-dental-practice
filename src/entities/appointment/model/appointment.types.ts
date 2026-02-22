export interface AppointmentSlotType {
  id: string;
  startTime: string; // ISO date string
  endTime: string;   // ISO date string
}

export interface AppointmentType {
  id: string;
  startTime: string;
  endTime: string;
  patientName: string;
  createdBy?: string; // user id of who booked
}

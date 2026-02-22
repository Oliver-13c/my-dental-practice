import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/shared/api/supabase-client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { patientId, fullName, dateOfBirth, contactNumber, email, medicalHistory, insuranceProvider, insurancePolicyNumber } = req.body;

    if (!patientId || !fullName || !dateOfBirth || !contactNumber || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { error } = await supabase
      .from('patient_intake')
      .upsert({
        patient_id: patientId,
        full_name: fullName,
        date_of_birth: dateOfBirth,
        contact_number: contactNumber,
        email,
        medical_history: medicalHistory || null,
        insurance_provider: insuranceProvider || null,
        insurance_policy_number: insurancePolicyNumber || null,
      }, { onConflict: 'patient_id' });

    if (error) {
      console.error('Error inserting/updating patient intake:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.status(200).json({ message: 'Intake form saved' });
  } catch (error) {
    console.error('Patient intake API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

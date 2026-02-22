import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/shared/api/supabase-client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'POST': {
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
      return res.status(200).json({ message: 'Intake form saved' });
    }
    case 'GET': {
      const { data, error } = await supabase.from('patient_intake').select('*');
      if (error) {
        console.error('Error fetching patient intake data:', error);
        return res.status(500).json({ error: 'Failed to fetch data' });
      }
      return res.status(200).json({ data });
    }
    case 'DELETE': {
      const { patientId } = req.query;
      if (!patientId || typeof patientId !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid patientId' });
      }
      const { error } = await supabase.from('patient_intake').delete().eq('patient_id', patientId);
      if (error) {
        console.error('Error deleting patient intake entry:', error);
        return res.status(500).json({ error: 'Delete failed' });
      }
      return res.status(200).json({ message: 'Deleted successfully' });
    }
    default:
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      return res.status(405).json({ error: 'Method Not Allowed' });
  }
}

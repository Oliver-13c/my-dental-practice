import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { patient_id, appointment_date, appointment_time } = req.body;

  if (!patient_id || !appointment_date || !appointment_time) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { error } = await supabase.from('appointments').insert({
      patient_id,
      appointment_date,
      appointment_time,
      status: 'pending',
    });

    if (error) {
      throw error;
    }

    res.status(200).json({ message: 'Appointment created' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create appointment' });
  }
}

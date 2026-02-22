import type { NextApiRequest, NextApiResponse } from 'next';
import { checkAndSendReminders } from '@/lib/scheduler/check-appointment-reminders';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    await checkAndSendReminders();
    return res.status(200).json({ message: 'Reminders processed' });
  } catch (error) {
    console.error('Reminder runner error:', error);
    return res.status(500).json({ error: 'Scheduler failed' });
  }
}

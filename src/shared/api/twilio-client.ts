import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID ?? '';
const authToken = process.env.TWILIO_AUTH_TOKEN ?? '';
const fromPhone = process.env.TWILIO_PHONE_NUMBER ?? '';

if (!accountSid || !authToken || !fromPhone) {
  console.warn(
    '[twilio-client] Missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_PHONE_NUMBER — SMS will be disabled',
  );
}

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export { client as twilioClient, fromPhone as twilioFromPhone };

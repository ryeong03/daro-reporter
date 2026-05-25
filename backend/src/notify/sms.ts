import twilio from 'twilio';

/**
 * Twilio SMS 발송
 */
export async function sendSMS(to: string, body: string): Promise<string> {
  const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);

  const message = await client.messages.create({
    to,
    from: process.env.TWILIO_PHONE_NUMBER!,
    body,
  });

  console.log(`[sms] Sent to ${to}: ${message.sid}`);
  return message.sid;
}

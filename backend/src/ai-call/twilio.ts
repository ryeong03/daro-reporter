import twilio from 'twilio';

function getClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
}

/**
 * Twilio Voice로 농업인에게 전화 발신.
 * TwiML은 /twilio/voice-response 엔드포인트에서 제공.
 */
export async function makeCall(
  toPhone: string,
  userId: string,
  eventType: string
): Promise<string> {
  const client = getClient();
  const baseUrl = process.env.BASE_URL || 'https://your-server.ngrok.io';

  const call = await client.calls.create({
    to: toPhone,
    from: process.env.TWILIO_PHONE_NUMBER!,
    url: `${baseUrl}/twilio/voice-response?userId=${userId}&eventType=${eventType}`,
    statusCallback: `${baseUrl}/twilio/voice-status`,
    statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
    timeout: 30,
  });

  console.log(`[twilio] Call initiated: ${call.sid}`);
  return call.sid;
}

/**
 * 보건소 대표번호로 자동 콜 발신
 */
export async function callHealthCenter(
  userName: string,
  eventType: string,
  location: string
): Promise<string> {
  const client = getClient();
  const healthCenterPhone = process.env.HEALTH_CENTER_PHONE!;
  const baseUrl = process.env.BASE_URL || 'https://your-server.ngrok.io';

  const message = `긴급 알림입니다. ${userName}님에게 ${eventType === 'heatstroke' ? '열사병' : '실신'} 의심 상황이 발생했습니다. 위치는 ${location}입니다. 즉시 확인 바랍니다.`;

  const call = await client.calls.create({
    to: healthCenterPhone,
    from: process.env.TWILIO_PHONE_NUMBER!,
    twiml: `<Response><Say language="ko-KR">${message}</Say><Pause length="2"/><Say language="ko-KR">${message}</Say></Response>`,
  });

  console.log(`[twilio] Health center call: ${call.sid}`);
  return call.sid;
}

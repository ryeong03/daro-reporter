// eslint-disable-next-line @typescript-eslint/no-require-imports
const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

async function testCall() {
  const to = process.env.TEST_PHONE!;
  const from = process.env.TWILIO_PHONE_NUMBER!;

  console.log(`[test] Calling ${to} from ${from}...`);

  try {
    const call = await client.calls.create({
      to,
      from,
      twiml: `<Response>
        <Say language="ko-KR">안녕하세요, 히어로 안전 모니터링 테스트 전화입니다. 이 전화는 시스템 테스트 목적으로 발신되었습니다. 감사합니다.</Say>
        <Pause length="1"/>
        <Say language="ko-KR">테스트가 완료되었습니다. 끊어주셔도 됩니다.</Say>
      </Response>`,
    });

    console.log(`[test] Call initiated! SID: ${call.sid}`);
    console.log(`[test] Status: ${call.status}`);
  } catch (err: any) {
    console.error(`[test] Call failed:`, err.message);
    if (err.code) console.error(`[test] Error code: ${err.code}`);
    if (err.moreInfo) console.error(`[test] More info: ${err.moreInfo}`);
  }
}

testCall();

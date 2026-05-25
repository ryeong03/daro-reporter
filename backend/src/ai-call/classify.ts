import Anthropic from '@anthropic-ai/sdk';

export type Classification = 'safe' | 'emergency' | 'unclear';

interface ClassifyResult {
  classification: Classification;
  reasoning: string;
}

const SYSTEM_PROMPT = `당신은 농어촌 어르신 안전 모니터링 시스템의 AI 판단 모듈입니다.
어르신과의 통화 내용(STT 변환 텍스트)을 분석하여 현재 상태를 판단합니다.

분류 기준:
- safe: "괜찮아요", "별일 없어", "쉬고 있어", "일하고 있어" 등 명확한 안전 표현
- emergency: "아파요", "못 일어나", "어지러워", "도와줘", "119", 통증/호흡곤란/쓰러짐/혼란 상태
- unclear: 단음절 반복("응..", "어.."), 침묵/웅얼거림, 상황 파악 불가, 맥락 벗어남

규칙:
1. safe와 emergency 신호가 동시 존재하면 반드시 emergency로 판단
2. 판단이 어려우면 unclear 반환 (시스템이 재질문 처리)
3. 빈 텍스트나 인식 불가는 unclear

JSON 형태로만 응답: {"classification": "safe|emergency|unclear", "reasoning": "판단 근거"}`;

export async function classifyResponse(sttText: string): Promise<ClassifyResult> {
  if (!sttText || sttText.trim().length === 0) {
    return { classification: 'unclear', reasoning: '응답 없음 (빈 텍스트)' };
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    system: SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: `어르신 응답: "${sttText}"` },
    ],
  });

  try {
    const content = message.content[0];
    if (content.type === 'text') {
      const result = JSON.parse(content.text);
      return {
        classification: result.classification as Classification,
        reasoning: result.reasoning,
      };
    }
  } catch {
    console.error('[classify] Failed to parse Claude response');
  }

  return { classification: 'unclear', reasoning: 'Claude 응답 파싱 실패' };
}

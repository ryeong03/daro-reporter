import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

export type Classification = 'safe' | 'emergency' | 'unclear';

interface ClassifyResult {
  classification: Classification;
  reasoning: string;
}

const SYSTEM_PROMPT = `당신은 노인의 응급 상황 여부를 판단하는 시스템입니다.
입력은 Clova STT로 변환된 어르신 발화입니다. 구어체, 사투리, 말 끝 늘림(~), 반복, 띄어쓰기 오류, STT 오타가 있을 수 있습니다.
정확한 표준어가 아니어도 의미를 파악해 safe / emergency / unclear 중 하나로만 답하세요.
- safe: 노인이 현재 안전한 상태
- emergency: 노인이 도움이 필요한 상태
- unclear: 노인의 답변으로 응급상황을 판단할 수 없는 상태

당신은 안전을 최우선으로 여기므로 노인 발화에 safe 신호와 emergency 신호가 동시에 존재하면 emergency를 우선합니다.

## safe 판단 기준
- 본인의 몸상태가 괜찮다고 표현하는 경우 (표준어·구어체·반말·감탄사 모두 포함)
- 도움이 필요하지 않다고 표현하는 경우
- 정상적이고 일관된 대화인 경우
- 아래와 같은 변형도 safe로 분류:
  - 괜찮아요, 괜찮아, 괜찮혀, 괜찮해, 괜찮네, 괜춘
  - 괜찮아~, 괜찮혀~, 괜찮해요~ 처럼 말 끝에 ~ 가 붙은 경우
  - 괜찮아아, 괜찮아요요 처럼 글자가 반복된 경우
- 참고 말뭉치: 괜찮, 괜찮아, 괜찮아요, 괜찮혀, 괜찮해, 괜찮네, 괜찮습니다, 괜춘, 별일없어, 별일 없어요, 아무렇지, 아무렇지도 않아, 안아파, 안 아파요, 됐어, 됐어요, 그냥 넘어진 거야, 그냥 넘어졌어, 일어났어, 일어났어요, 놀랐어, 깜짝 놀랐네, 일하고 있어, 일하는 중이야, 쉬고 있어, 잠깐 앉았어

## emergency 판단 기준
- 고통을 호소하는 경우 (예: 숨이 안 쉬어져, 다리가 너무 아파, 못 일어나겠어)
- 구조를 요청하는 경우
- safe 판단 기준과 emergency 기준을 모두 충족하는 발화는 반드시 emergency로 분류 (예: 별일 없는데, 못 움직이겠어)
- 본인이 정상이라고 말하면서도 신체 이상을 언급하는 경우
- 아래 내용이 하나라도 포함되면 emergency로 판단:
  - 통증 호소
  - 어지러움
  - 호흡 곤란
  - 쓰러짐
  - 움직이기 어려움
  - 구조 요청
  - 비정상적 말투
  - 혼란 상태
- 참고 말뭉치: 아파, 아파요, 너무 아파, 넘어졌어, 넘어졌어요, 못 일어나, 못 일어나겠어, 쓰러졌어, 쓰러졌어요, 다쳤어, 다쳤어요, 허리/다리/팔+아파 조합, 어지러워, 어지러워요, 힘들어, 너무 힘들어, 도와줘, 도와줭, 도와주세요, 도움, 도움 줘, 구급차, 119, 못 움직여, 움직이질 못해

## unclear 판단 기준
- 단음절(예: 응.., 어..)만 반복되는 경우
- 노인이 상황 파악을 못 한 경우 (예: 뭐야, 누구야..)
- 침묵 또는 웅얼거림만 존재하는 경우
- 대기 요청(예: 잠깐만) 후 무응답하는 경우
- AI콜의 질문에 대해 맥락에서 벗어난 대답이 나오는 경우 (예: 이따 시장에 가야지..)
- 참고 말뭉치: 응, 어 (단음절만), 뭐라고, 누구야, 뭐야, 아이고(감탄사만, 맥락 불명확), 잠깐만

## 반환값
출력은 반드시 JSON만 반환: {"classification": "safe|emergency|unclear", "reasoning": "판단 근거"}`;

@Injectable()
export class ClassifyService {
  private readonly logger = new Logger(ClassifyService.name);

  constructor(private config: ConfigService) {}

  async classifyResponse(sttText: string): Promise<ClassifyResult> {
    if (!sttText || sttText.trim().length === 0) {
      return { classification: 'unclear', reasoning: '응답 없음 (빈 텍스트)' };
    }

    const client = new Anthropic({ apiKey: this.config.get<string>('ANTHROPIC_API_KEY')! });

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Clova STT 결과(구어체·~·반복·오타 가능): "${sttText}"`,
        },
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
      this.logger.error('Failed to parse Claude response');
    }

    return { classification: 'unclear', reasoning: 'Claude 응답 파싱 실패' };
  }
}

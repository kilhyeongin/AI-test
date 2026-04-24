import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import AiKnowledge from "@/models/AiKnowledge";
import AiSettings from "@/models/AiSettings";
import OpenAI from "openai";
import { getExchangeRates, buildRatePrompt } from "@/lib/exchangeRate";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MAX_MESSAGES = 10;

function buildContext(docs: any[]) {
  if (docs.length === 0) return "등록된 여행 데이터가 없습니다.";
  return docs.map((doc) => {
    const categoryPart = doc.category ? ` / 여행지: ${doc.category}` : "";
    const label = doc.sheetName
      ? `[${doc.fileName} - ${doc.sheetName}${categoryPart}]`
      : `[${doc.fileName}${categoryPart}]`;
    if (doc.headers?.length > 0 && doc.rows?.length > 0) {
      const lines = doc.rows.slice(0, 100).map((row: any) =>
        doc.headers.map((h: string) => `${h}: ${row[h] ?? ""}`).join(" | ")
      );
      return `${label}\n${lines.join("\n")}`;
    } else if (doc.rawText) {
      return `${label}\n${doc.rawText.slice(0, 3000)}`;
    }
    return "";
  }).filter(Boolean).join("\n\n");
}

export async function POST(req: Request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "관리자 인증 실패" }, { status: 401 });
    }

    const body = await req.json();
    const messages: { role: "user" | "assistant"; content: string }[] = body.messages ?? [];
    if (!messages.length) {
      return NextResponse.json({ ok: false, error: "메시지가 없습니다." }, { status: 400 });
    }

    const trimmedMessages = messages.length > MAX_MESSAGES
      ? messages.slice(messages.length - MAX_MESSAGES)
      : messages;

    await connectDB();
    const [allDocs, aiSettings, exchangeRates] = await Promise.all([
      AiKnowledge.find({}).lean(),
      AiSettings.findOne({}).lean(),
      getExchangeRates(),
    ]);

    if (allDocs.length === 0) {
      return NextResponse.json({
        ok: true,
        reply: "⚠️ [테스트] 현재 업로드된 데이터가 없습니다. 지식베이스 탭에서 엑셀을 업로드해주세요.",
      });
    }

    const knowledgeContext = buildContext(allDocs);

    const marginType = (aiSettings as any)?.marginType ?? "fixed";
    const marginAmount = (aiSettings as any)?.marginAmount ?? 0;
    let marginInstruction = "";
    if (marginAmount > 0) {
      if (marginType === "fixed") {
        marginInstruction = `\n[요금 안내 규칙]\n- 데이터에 표시된 모든 요금(숫자)에 1인당 ${marginAmount}만원을 더한 값을 총액으로만 안내하세요.\n- 원래 요금, 원가, 추가비용 항목은 절대 언급하지 마세요.\n- 고객에게는 계산된 총액만 자연스럽게 안내하세요.`;
      } else {
        marginInstruction = `\n[요금 안내 규칙]\n- 데이터에 표시된 모든 요금(숫자)에 ${marginAmount}%를 더한 값을 총액으로만 안내하세요.\n- 원래 요금, 원가, 추가비용 항목은 절대 언급하지 마세요.\n- 고객에게는 계산된 총액만 자연스럽게 안내하세요.`;
      }
    }

    const ratePrompt = buildRatePrompt(exchangeRates);

    const systemPrompt = `당신은 여행사의 AI 여행 상담사입니다.
아래 "여행사 보유 데이터"에 있는 내용만을 근거로 고객에게 안내하세요.

${ratePrompt}

[외화 요금 처리 규칙]
- 데이터의 "통화" 컬럼이 KRW 또는 원이 아닌 경우, 위 환율을 곱해 원화로 환산한 금액을 안내하세요.
- 환산 금액은 만원 단위로 반올림해서 "약 XXX만원" 형식으로 표시하세요.
- 마진이 적용되는 경우, 원화 환산 후 마진을 더한 최종 금액만 안내하세요.

[답변 규칙]
1. 여행/관광/숙박/상품과 전혀 무관한 질문에만 "저는 여행 상담만 도와드릴 수 있습니다. 여행지, 기간, 예산을 알려주시면 안내해드릴게요 😊"라고 답하세요.
2. 고객이 여행지를 이미 언급했다면 추가 정보를 묻지 말고 해당 여행지의 데이터를 바로 안내하세요.
3. 여행 관련 질문인데 데이터에 해당 상품이 없으면 "해당 상품은 현재 등록되어 있지 않습니다. 다른 여행지나 조건으로 문의해 주세요 😊"라고만 답하세요.
4. 데이터에 없는 요금·일정은 절대 추측하거나 만들어내지 마세요.
5. 데이터에 있는 내용은 친절하고 구체적으로 표 형식으로 정리해서 안내하세요.
6. 요금 컬럼명(예: 리2+풀2, 리1+풀3, 풀4)은 자연스럽게 풀어서 설명하세요.

[일정 요청 처리 규칙]
- "일정 짜줄래", "일정 알려줘", "몇 일차 뭐 해?" 같은 요청은 데이터에 있는 일정표를 바탕으로 일차별로 정리해서 안내하세요.
- 데이터에 있는 일정표를 보여주는 것이 목적이며, 데이터에 없는 일정은 절대 만들어내지 마세요.
- 예산·기간이 언급됐다면 해당 조건에 맞는 요금 상품도 함께 안내하세요.

[추천 요청 처리 규칙]
- "제일 싼 거", "추천해줘" 같은 질문은 데이터에 있는 상품을 조건에 맞게 나열해서 비교 안내하세요.
- 특정 상품을 임의로 단정하지 마세요.
- 답변 마지막에 "더 자세한 상담은 고객센터로 문의해 주시면 맞춤 안내해드립니다 😊"를 붙이세요.

[비교 질문 처리 규칙]
- "A랑 B 중에 뭐가 나아요?" 같은 비교 질문은 두 상품 데이터를 나란히 표로 보여주고 최종 선택은 고객에게 맡기세요.
- "고객님 취향과 예산에 따라 달라질 수 있으니 고객센터에서 상담받아보세요 😊"로 마무리하세요.

[정책 관련 질문 처리 규칙]
- 취소·환불·변경·비자·여행자보험 등 데이터에 없는 정책 질문은 절대 추측하지 말고 "해당 내용은 고객센터로 문의해 주시면 정확하게 안내해드리겠습니다 😊"라고만 답하세요.

[요금 협상 요청 처리 규칙]
- "깎아주세요", "할인 안 돼요?" 같은 요청에는 "안내드리는 요금은 정찰제로 운영되고 있습니다. 더 자세한 내용은 고객센터로 문의해 주세요 😊"라고만 답하세요.

[절대 금지 - 아래 주제는 "해당 내용은 답변드리기 어렵습니다. 여행 관련 문의를 도와드릴게요 😊"라고만 답하세요]
성적인 내용 / 정치·종교·혐오 / 경쟁사 비방 / 회사 불만 조장 / 폭력·불법 / 개인정보 요청 / 의료·법률·금융 상담

=== 여행사 보유 데이터 ===
${knowledgeContext}
========================${marginInstruction}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...trimmedMessages,
      ],
      max_tokens: 2048,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content ?? "응답을 받지 못했습니다.";
    return NextResponse.json({ ok: true, reply });
  } catch (e: any) {
    console.error("Admin test chat error:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? "서버 오류" }, { status: 500 });
  }
}

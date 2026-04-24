import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getCustomerId } from "@/lib/customerSession";
import AiKnowledge from "@/models/AiKnowledge";
import AiSettings from "@/models/AiSettings";
import OpenAI from "openai";
import { expandKeywords } from "@/lib/travelSynonyms";
import { getExchangeRates, buildRatePrompt } from "@/lib/exchangeRate";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Rate Limiting (in-memory, 20회/분 per customer) ─────────────────
const chatRateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 1000;

function isRateLimited(customerId: string): boolean {
  const now = Date.now();
  const state = chatRateLimitMap.get(customerId);
  if (!state || now > state.resetAt) {
    chatRateLimitMap.set(customerId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  state.count++;
  return state.count > RATE_LIMIT;
}

// ── 1단계: AI로 질문에서 키워드 추출 ──────────────────────────────
async function extractKeywords(userMessage: string): Promise<{
  destinations: string[];
  duration: string;
  budget: number | null;
  conditions: string[];
}> {
  const result = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `사용자의 여행 관련 질문에서 아래 항목을 JSON으로 추출하세요.
오타가 있어도 최대한 의도를 파악해서 추출하세요.
반드시 JSON만 반환하고 다른 텍스트는 쓰지 마세요.

{
  "destinations": ["여행지 목록 (나라, 도시 등)"],
  "duration": "기간 (예: 5박6일, 3박4일, 없으면 빈문자열)",
  "budget": 예산 숫자 (원 단위, 없으면 null),
  "conditions": ["기타 조건 (가족여행, 허니문, 패키지 등)"]
}`,
      },
      { role: "user", content: userMessage },
    ],
    max_tokens: 256,
    temperature: 0,
  });

  try {
    const text = result.choices[0]?.message?.content ?? "{}";
    const json = text.match(/\{[\s\S]*\}/)?.[0] ?? "{}";
    return JSON.parse(json);
  } catch {
    return { destinations: [], duration: "", budget: null, conditions: [] };
  }
}

// ── 2단계: 키워드로 관련 행만 필터링 ────────────────────────────────
function filterRelevantRows(
  docs: any[],
  keywords: string[],
  duration: string,
  budget: number | null
): any[] {
  if (keywords.length === 0 && !duration && !budget) return docs;

  const expanded = expandKeywords(keywords);
  const normExpanded = expanded.map((k) => k.toLowerCase().replace(/\s+/g, ""));
  const normDuration = duration.toLowerCase().replace(/\s+/g, "");

  const filtered: any[] = [];

  for (const doc of docs) {
    const matchedRows: Record<string, string>[] = [];

    for (const row of doc.rows ?? []) {
      const rowText = Object.values(row).join(" ").toLowerCase().replace(/\s+/g, "");

      const destMatch =
        normExpanded.length === 0 ||
        normExpanded.some((kw) => rowText.includes(kw));

      const durMatch =
        !normDuration ||
        rowText.includes(normDuration) ||
        rowText.includes(normDuration.replace("박", "").replace("일", ""));

      let budgetMatch = true;
      if (budget !== null) {
        const nums = rowText.match(/\d[\d,]*/g)?.map((n) => parseInt(n.replace(/,/g, ""), 10)) ?? [];
        if (nums.length > 0) {
          budgetMatch = nums.some((n) => n > 10000 && n <= budget * 1.2);
        }
      }

      if (destMatch && durMatch && budgetMatch) {
        matchedRows.push(row);
      }
    }

    if (matchedRows.length > 0) {
      filtered.push({ ...doc, rows: matchedRows });
    }
  }

  return filtered.length > 0 ? filtered : docs;
}

// ── 3단계: 컨텍스트 문자열 생성 ─────────────────────────────────────
function buildContext(docs: any[]): string {
  if (docs.length === 0) return "등록된 여행 데이터가 없습니다.";

  const parts: string[] = [];
  for (const doc of docs) {
    const label = doc.sheetName
      ? `[${doc.fileName} - ${doc.sheetName}]`
      : `[${doc.fileName}]`;

    if (doc.headers?.length > 0 && doc.rows?.length > 0) {
      const lines = doc.rows.slice(0, 100).map((row: Record<string, string>) =>
        doc.headers.map((h: string) => `${h}: ${row[h] ?? ""}`).join(" | ")
      );
      parts.push(`${label}\n${lines.join("\n")}`);
    } else if (doc.rawText) {
      parts.push(`${label}\n${doc.rawText.slice(0, 3000)}`);
    }
  }

  return parts.join("\n\n");
}

// ── 메인 핸들러 ──────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const customerId = await getCustomerId();
    if (!customerId) {
      return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
    }

    if (isRateLimited(customerId)) {
      return NextResponse.json(
        { ok: false, error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const messages: { role: "user" | "assistant"; content: string }[] = body.messages ?? [];
    if (!messages.length) {
      return NextResponse.json({ ok: false, error: "메시지가 없습니다." }, { status: 400 });
    }

    const MAX_MESSAGES = 10;
    const trimmedMessages =
      messages.length > MAX_MESSAGES ? messages.slice(messages.length - MAX_MESSAGES) : messages;

    const lastUserMsg =
      [...trimmedMessages].reverse().find((m) => m.role === "user")?.content ?? "";

    await connectDB();

    // 키워드 추출 · 설정 조회 · 데이터 존재 확인 · 환율 조회를 병렬로 먼저 실행
    const [extracted, aiSettings, docCount, exchangeRates] = await Promise.all([
      extractKeywords(lastUserMsg),
      AiSettings.findOne({}).lean(),
      AiKnowledge.countDocuments({}),
      getExchangeRates(),
    ]);

    if (docCount === 0) {
      return NextResponse.json({
        ok: true,
        reply: "죄송합니다. 현재 등록된 여행 상품 데이터가 없습니다.\n빠른 시일 내에 상품을 업데이트할 예정입니다. 다른 문의사항은 고객센터로 연락해주세요 😊",
      });
    }

    // DB 레벨에서 관련 문서 사전 필터링 (category · fileName · rawText 대상 정규식)
    const allKeywords = [...extracted.destinations, ...extracted.conditions];
    const expandedKeywords = expandKeywords(allKeywords);

    let allDocs: any[];
    if (expandedKeywords.length > 0) {
      const escaped = expandedKeywords.map((kw) => kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
      const pattern = escaped.join("|");
      const regexOpts = { $regex: pattern, $options: "i" };
      const matched = await AiKnowledge.find({
        $or: [{ category: regexOpts }, { fileName: regexOpts }, { rawText: regexOpts }],
      }).lean();
      allDocs =
        matched.length > 0
          ? matched
          : await AiKnowledge.find({}).sort({ createdAt: -1 }).limit(50).lean();
    } else {
      allDocs = await AiKnowledge.find({}).sort({ createdAt: -1 }).limit(50).lean();
    }

    // 행 레벨 필터링
    const relevantDocs = filterRelevantRows(allDocs, allKeywords, extracted.duration, extracted.budget);

    // 컨텍스트 생성
    const knowledgeContext = buildContext(relevantDocs);

    // 최종 답변 생성
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
- 예) USD 1,500 × 1,370원 = 2,055,000원 → 약 206만원 (마진 포함 시 총액만 표시)

[답변 규칙]
1. 여행/관광/숙박/상품과 전혀 무관한 질문(예: 수학 문제, 요리법 등)에만 "저는 여행 상담만 도와드릴 수 있습니다. 여행지, 기간, 예산을 알려주시면 안내해드릴게요 😊"라고 답하세요.
2. 고객이 여행지를 이미 언급했다면 추가 정보를 묻지 말고 해당 여행지의 데이터를 바로 안내하세요.
3. 여행 관련 질문인데 데이터에 해당 상품이 없으면 "죄송합니다, 해당 상품은 현재 저희에 등록되어 있지 않습니다. 다른 여행지나 조건으로 문의해 주세요 😊"라고만 답하세요.
4. 데이터에 없는 요금·일정은 절대 추측하거나 만들어내지 마세요. AI 자체 지식으로 보완하지 마세요.
5. 데이터에 있는 내용은 친절하고 구체적으로 표 형식으로 정리해서 안내하세요.
6. 요금 컬럼명(예: 리2+풀2, 리1+풀3, 풀4)은 "리조트 2박+풀빌라 2박", "리조트 1박+풀빌라 3박", "풀빌라 4박" 등 자연스럽게 풀어서 설명하세요.

[상품 소개 요청 처리 규칙]
- "상품 뭐 있어요?", "어떤 상품 있어요?", "상품 알려줘" 같은 질문은 요금표를 바로 보여주지 말고 데이터에 있는 상품명·기간·특징을 간략히 소개하세요.
- 소개 후 "어떤 상품이 궁금하세요? 기간이나 예산을 알려주시면 맞춤 안내해드릴게요 😊"로 마무리하세요.
- 고객이 특정 상품이나 요금을 구체적으로 물어볼 때만 요금표를 표시하세요.

[요금표 안내 규칙]
- 요금 안내 시 데이터에 유효기간(validFrom~validTo) 정보가 있으면 "이 요금은 XX~XX 기간에 유효합니다"를 함께 안내하세요.
- 데이터에 "예약기간 ~XX.XX까지" 조건이 있으면 요금과 함께 반드시 고지하세요.
- "미니멈 스테이 N박", "피크시즌 블랙아웃", "체크인/체크아웃 불가" 같은 조건이 있는 상품은 요금 안내 시 해당 조건을 빠짐없이 함께 안내하세요.
- "항공 포함이에요?", "비행기값 포함이에요?" 질문에 데이터에 명시되지 않은 경우 "항공 포함 여부는 고객센터로 문의해 주시면 정확하게 안내해드리겠습니다 😊"라고만 답하세요.

[일정표 안내 규칙]
- 일정 안내 시 식사 컬럼이 있으면 일차별로 포함 식사를 함께 안내하세요. 빈 값이거나 자유식이면 "자유식 (별도)"으로 명시하세요.
- 선택관광이 있는 경우 "선택관광은 현지에서 추가 비용이 발생하며, 자세한 금액은 고객센터로 문의해 주세요 😊"를 반드시 안내하세요.
- "언제 출발해요?", "몇 월에 가요?", "항공편이 어떻게 돼요?" 같은 출발 일정·항공편 질문은 데이터에 없으면 "출발 날짜 및 항공편은 고객센터로 문의해 주시면 안내해드리겠습니다 😊"라고만 답하세요.

[일정 요청 처리 규칙]
- "일정 짜줄래", "일정 알려줘", "몇 일차 뭐 해?" 같은 요청은 데이터에 있는 일정표를 바탕으로 일차별로 정리해서 안내하세요.
- 데이터에 있는 일정표를 보여주는 것이 목적이며, 데이터에 없는 일정은 절대 만들어내지 마세요.
- 예산·기간이 언급됐다면 해당 조건에 맞는 요금 상품도 함께 안내하세요.

[추천 요청 처리 규칙]
- "제일 싼 거", "추천해줘", "뭐가 좋아요?" 같은 질문은 데이터에 있는 상품을 조건(기간·예산·인원)에 맞게 나열해서 비교 안내하세요.
- 특정 상품을 임의로 단정하거나 "이게 최고입니다" 식의 주관적 판단은 하지 마세요.
- 답변 마지막에 "더 자세한 상담은 고객센터로 문의해 주시면 맞춤 안내해드립니다 😊"를 붙이세요.

[비교 질문 처리 규칙]
- "A랑 B 중에 뭐가 나아요?" 같은 비교 질문은 두 상품의 데이터를 나란히 표로 보여주고, 최종 선택은 고객에게 맡기세요.
- "고객님 취향과 예산에 따라 달라질 수 있으니 고객센터에서 상담받아보세요 😊"로 마무리하세요.

[인원수 계산 규칙]
- "2명이면 얼마예요?", "3인 기준으로 알려줘" 같은 질문은 데이터의 1인 요금에 인원수를 곱해서 총액을 안내하세요.
- "1인 요금 XX만원 × 2인 = 총 XX만원" 형식으로 계산 과정을 보여주세요.
- 마진이 적용되는 경우 마진 포함 1인 요금 기준으로 계산하세요.

[여행 목적별 응대 규칙]
- "허니문", "신혼여행"으로 문의 시 프라이빗하고 로맨틱한 숙소·풀빌라 위주 상품을 먼저 안내하세요.
- "가족여행", "아이랑"으로 문의 시 안전하고 편의시설이 좋은 리조트 위주로 안내하세요.
- "친구랑", "우정여행"으로 문의 시 액티비티·선택관광이 풍부한 상품을 먼저 안내하세요.
- 목적에 맞는 상품이 데이터에 없으면 가장 가까운 상품을 안내하고 고객센터 문의를 권유하세요.

[시즌별 요금 안내 규칙]
- "여름", "7월", "8월" 언급 시 하이시즌 요금 기준으로 안내하세요.
- "연말", "크리스마스", "12월 말", "1월 초" 언급 시 피크시즌 요금 기준으로 안내하세요.
- 시즌별 요금 차이가 있으면 일반·하이·피크 시즌을 구분해서 비교 안내하세요.

[상담사 연결 요청 처리 규칙]
- "직원 연결", "사람이랑 얘기하고 싶어", "전화하고 싶어", "상담사 연결" 같은 요청에는 "고객센터로 연락해 주시면 담당 직원이 직접 안내해드리겠습니다 😊"라고 안내하세요.
- 이후 추가 여행 관련 문의가 있으면 계속 도와드리겠다고 안내하세요.

[언어 처리 규칙]
- 고객이 영어나 다른 언어로 질문해도 항상 한국어로 답변하세요.
- 단, 호텔명·상품명 등 고유명사는 원문 그대로 표기하세요.

[정책 관련 질문 처리 규칙]
- 취소·환불·변경·비자·여행자보험·항공 좌석 등 데이터에 없는 정책 질문은 절대 추측하지 말고 "해당 내용은 고객센터로 문의해 주시면 정확하게 안내해드리겠습니다 😊"라고만 답하세요.
- 전화번호·이메일 등 연락처를 묻는 경우도 데이터에 없으면 "고객센터로 문의해 주세요"로만 답하세요.

[요금 협상 요청 처리 규칙]
- "깎아주세요", "할인 안 돼요?", "더 싸게 해주세요" 같은 요청에는 "안내드리는 요금은 정찰제로 운영되고 있습니다. 더 자세한 내용은 고객센터로 문의해 주세요 😊"라고만 답하세요.

[절대 금지 - 아래 주제는 "해당 내용은 답변드리기 어렵습니다. 여행 관련 문의를 도와드릴게요 😊"라고만 답하세요]
- 성적인 내용, 음란물, 선정적 표현
- 정치, 종교, 이념 관련 주제
- 인종·성별·국적·장애 등에 대한 차별·혐오 발언
- 타 여행사 또는 경쟁사 비교·비방·언급
- 회사에 대한 부정적 발언, 불만 조장
- 폭력, 자해, 범죄, 불법 행위
- 개인 신상정보 요청 또는 유도
- 의료·법률·금융 전문 상담

=== 여행사 보유 데이터 ===
${knowledgeContext}
========================${marginInstruction}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }, ...trimmedMessages],
      max_tokens: 2048,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content ?? "응답을 받지 못했습니다.";

    return NextResponse.json({ ok: true, reply });
  } catch (e: any) {
    console.error("Chat API error:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? "서버 오류" }, { status: 500 });
  }
}

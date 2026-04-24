import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import AiKnowledgeDraft, { STANDARD_HEADERS, ITINERARY_HEADERS } from "@/models/AiKnowledgeDraft";
import AiKnowledge from "@/models/AiKnowledge";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 검토 대기 목록 조회
export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ ok: false, error: "인증 실패" }, { status: 401 });

    await connectDB();
    const drafts = await AiKnowledgeDraft.find({ status: "pending" })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ ok: true, drafts });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}

// 행 수정
export async function PATCH(req: Request) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ ok: false, error: "인증 실패" }, { status: 401 });

    const { id, rows } = await req.json();
    await connectDB();
    await AiKnowledgeDraft.findByIdAndUpdate(id, { rows });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}

// 승인 또는 반려
export async function POST(req: Request) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ ok: false, error: "인증 실패" }, { status: 401 });

    const { action, ids } = await req.json(); // action: "approve" | "reject"
    await connectDB();

    if (action === "approve") {
      const drafts = await AiKnowledgeDraft.find({ _id: { $in: ids } }).lean();
      for (const draft of drafts) {
        const fallback = (draft as any).docType === "itinerary" ? ITINERARY_HEADERS : STANDARD_HEADERS;
        const rows = (draft as any).rows ?? [];
        const detectedKeys = rows.length > 0 ? Array.from(new Set(rows.flatMap((r: any) => Object.keys(r)))) as string[] : [];
        const headers = detectedKeys.length > 0 ? detectedKeys : fallback;
        await AiKnowledge.create({
          fileName: draft.fileName,
          fileType: draft.fileType,
          docType: (draft as any).docType ?? "rate",
          sheetName: draft.sheetName,
          headers,
          rows: draft.rows,
          rawText: draft.summary,
          uploadedBy: (draft as any).uploadedBy,
          category: draft.category,
          validFrom: draft.validFrom,
          validTo: draft.validTo,
        });
        await AiKnowledgeDraft.findByIdAndUpdate(draft._id, { status: "approved" });
      }
    } else if (action === "reject") {
      await AiKnowledgeDraft.updateMany({ _id: { $in: ids } }, { status: "rejected" });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}

// AI 재분석 (rows=[] 인 draft의 summary 텍스트를 다시 구조화)
export async function PUT(req: Request) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ ok: false, error: "인증 실패" }, { status: 401 });

    const { id } = await req.json();
    await connectDB();
    const draft = await AiKnowledgeDraft.findById(id).lean() as any;
    if (!draft) return NextResponse.json({ ok: false, error: "항목을 찾을 수 없습니다." }, { status: 404 });

    const rawText = (draft.rawText ?? draft.summary) ?? "";
    if (!rawText.trim()) return NextResponse.json({ ok: false, error: "재분석할 텍스트가 없습니다." }, { status: 400 });

    const isItinerary = draft.docType === "itinerary";
    const colHeaders = isItinerary ? ITINERARY_HEADERS : STANDARD_HEADERS;

    const prompt = isItinerary
      ? `아래는 여행사 일정표 파일에서 추출한 원본 텍스트입니다.
각 줄은 엑셀의 한 행이며, 셀 값은 " | " 로 구분되어 있습니다.

[원본 텍스트]
${rawText}

위 내용을 분석해 일정표 데이터를 JSON 배열로 반환하세요. 다른 텍스트는 절대 쓰지 마세요.

규칙:
- 컬럼: ${colHeaders.join(", ")}
- 원본 파일의 컬럼명이 달라도 (날짜/일자/Day, 행사일정/주요일정 등) 의미에 맞게 위 8개 컬럼으로 매핑하세요.
- 병합 셀로 인해 일차·지역·숙박이 첫 행에만 있고 이후 행이 비어있을 수 있습니다. 직전 행 값을 이어받아 모든 행을 완성하세요.
- 일차: "제 1 일" → "1일차", "Day 1" → "1일차" 형식으로 변환
- 지역: 해당 일차의 주요 방문 지역·도시
- 교통편: 이동 수단 (항공기, 전용차량, 렌터카 등 / 없으면 빈 문자열)
- 일정내용: 주요 활동·관광지를 "·" 기호와 줄바꿈(\n)으로 나열. 관광지·명소 이름은 절대 생략하지 말고 원본에 나온 것을 모두 포함. 단, "선택 N." 또는 "선택N." 형태로 번호가 붙은 옵션 항목은 일정내용에 절대 포함하지 말고 반드시 선택관광 컬럼에만 넣을 것
- 선택관광: 원본에서 "선택 1.", "선택 2.", "선택1.", "선택2." 등 번호 붙은 항목을 찾아 투어명만 "·" 기호와 줄바꿈(\n)으로 나열. 절대로 일정내용에 넣지 말 것. 상세 설명(가격·주의사항)은 제외하고 투어명만. 없으면 빈 문자열
- 숙박: HOTEL 행 또는 숙박 정보에서 호텔·리조트명 추출 (없으면 빈 문자열)
- 식사: 원본의 조식/중식/석식 항목 확인 후 "자유식"으로 표기된 것은 포함이 아니므로 기재하지 말 것. 오직 "현지식", "포함", "제공" 등으로 명시된 식사만 기재. 모두 자유식이면 빈 문자열 ""
- 특이사항: 비고, 주의사항, 추가요금 안내, 진행 조건 등 (없으면 빈 문자열)
- 일차, 지역, 일정내용 중 하나라도 파악 가능하면 행으로 포함하세요.
- 최대 50행.

형식: [{"일차":"","지역":"","교통편":"","일정내용":"","선택관광":"","숙박":"","식사":"","특이사항":""}]`
      : `아래는 여행사 요금표 파일에서 추출한 원본 텍스트입니다.
각 줄은 엑셀의 한 행이며, 셀 값은 " | " 로 구분되어 있습니다.

[원본 텍스트]
${rawText}

위 내용을 분석해 요금표 데이터를 JSON 배열로 반환하세요. 다른 텍스트는 절대 쓰지 마세요.

규칙:
- 가능하면 다음 컬럼으로 통일하세요: ${colHeaders.join(", ")}
- 단, 시트 구조가 표준 요금표와 다른 경우(예: 업그레이드 비용표, 선택관광 추가비용 등)는 원본 데이터에 맞는 컬럼명을 그대로 사용해도 됩니다. 이 경우 모든 행의 컬럼명을 일관되게 유지하세요.
- 병합 셀로 인해 상품명·룸타입 등이 첫 행에만 있고 이후 행이 비어있을 수 있습니다. 직전 행 값을 이어받아 모든 행을 완성하세요.
- 상품명, 1인요금 중 하나라도 파악 가능하면 행으로 포함하세요.
- 파악 불가 컬럼은 빈 문자열 ""로.
- 최대 50행.

형식: [{"상품명":"","룸타입":"","기간":"","1인요금":"","통화":"","포함사항":"","특이사항":""}]`;

    const result = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 8000,
      temperature: 0,
    });

    const text = result.choices[0]?.message?.content ?? "[]";
    const json = text.match(/\[[\s\S]*\]/)?.[0] ?? "[]";
    let rows: Record<string, string>[] = [];
    try { rows = JSON.parse(json); } catch { rows = []; }

    await AiKnowledgeDraft.findByIdAndUpdate(id, { rows });
    return NextResponse.json({ ok: true, rows, rowCount: rows.length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "서버 오류" }, { status: 500 });
  }
}

// 드래프트 삭제
export async function DELETE(req: Request) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ ok: false, error: "인증 실패" }, { status: 401 });

    const { id } = await req.json();
    await connectDB();
    await AiKnowledgeDraft.findByIdAndDelete(id);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}

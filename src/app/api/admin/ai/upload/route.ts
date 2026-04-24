import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import AiKnowledgeDraft, { STANDARD_HEADERS, ITINERARY_HEADERS } from "@/models/AiKnowledgeDraft";
import * as XLSX from "xlsx";
import OpenAI from "openai";
import zlib from "zlib";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 시트에서 원본 텍스트만 추출 (병합 셀 값 채우기 포함)
function sheetToRawText(sheet: XLSX.WorkSheet): string {
  const raw: string[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  // 병합 셀의 시작 값을 나머지 셀에 채워넣기
  const merges: XLSX.Range[] = (sheet["!merges"] as XLSX.Range[] | undefined) ?? [];
  for (const merge of merges) {
    const { s, e } = merge;
    const value = raw[s.r]?.[s.c] ?? "";
    if (!value) continue;
    for (let r = s.r; r <= e.r; r++) {
      for (let c = s.c; c <= e.c; c++) {
        if (r === s.r && c === s.c) continue;
        if (raw[r]) raw[r][c] = value;
      }
    }
  }

  return raw
    .filter((row) => row.some((c) => String(c ?? "").trim()))
    .map((row) =>
      row
        .map((c) => String(c ?? "").replace(/\r?\n/g, " ").trim())
        .filter(Boolean)
        .join(" | ")
    )
    .filter(Boolean)
    .join("\n");
}

// ── 한셀 등 비표준 xlsx fallback 파서 ─────────────────────────────────

// zip Central Directory를 기반으로 특정 파일을 추출
function readZipFile(buffer: Buffer, targetName: string): string | null {
  try {
    // End of Central Directory 위치 탐색 (뒤에서부터)
    let eocdPos = -1;
    for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65558); i--) {
      if (buffer.readUInt32LE(i) === 0x06054b50) { eocdPos = i; break; }
    }
    if (eocdPos < 0) return null;

    const cdOffset = buffer.readUInt32LE(eocdPos + 16);
    const cdEntries = buffer.readUInt16LE(eocdPos + 8);

    let pos = cdOffset;
    for (let i = 0; i < cdEntries; i++) {
      if (pos + 46 > buffer.length || buffer.readUInt32LE(pos) !== 0x02014b50) break;
      const compression  = buffer.readUInt16LE(pos + 10);
      const compSize     = buffer.readUInt32LE(pos + 20);
      const fnLen        = buffer.readUInt16LE(pos + 28);
      const extraLen     = buffer.readUInt16LE(pos + 30);
      const commentLen   = buffer.readUInt16LE(pos + 32);
      const localOffset  = buffer.readUInt32LE(pos + 42);
      const fileName     = buffer.slice(pos + 46, pos + 46 + fnLen).toString("utf8");

      if (fileName === targetName) {
        const localFnLen    = buffer.readUInt16LE(localOffset + 26);
        const localExtraLen = buffer.readUInt16LE(localOffset + 28);
        const dataStart     = localOffset + 30 + localFnLen + localExtraLen;
        const data          = buffer.slice(dataStart, dataStart + compSize);
        if (compression === 0) return data.toString("utf8");
        if (compression === 8) return zlib.inflateRawSync(data).toString("utf8");
        return null;
      }
      pos += 46 + fnLen + extraLen + commentLen;
    }
    return null;
  } catch {
    return null;
  }
}

// 한셀 등 비표준 포맷 xlsx에서 텍스트를 직접 추출
// HanCell은 모든 요소에 x: 네임스페이스 접두사 사용 (<x:si>, <x:row>, <x:c> 등)
function fallbackParseXlsx(buffer: Buffer): { sheetName: string; rawText: string }[] {
  const ssXml = readZipFile(buffer, "xl/sharedStrings.xml");
  if (!ssXml) return [];

  // sharedStrings 배열 구성 — x: 등 네임스페이스 접두사를 허용하는 패턴 사용
  const NS = "(?:[a-z]+:)?"; // 선택적 네임스페이스 접두사 (예: x:, hs:)
  const sharedStrings: string[] = [];
  for (const si of ssXml.matchAll(new RegExp(`<${NS}si>([\\s\\S]*?)<\\/${NS}si>`, "g"))) {
    const texts: string[] = [];
    for (const t of si[1].matchAll(new RegExp(`<${NS}t(?:\\s[^>]*)?>([^<]*)<\\/${NS}t>`, "g"))) {
      texts.push(t[1]
        .replace(/&amp;/g, "&").replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'"));
    }
    sharedStrings.push(texts.join(""));
  }
  if (sharedStrings.length === 0) return [];

  // 시트 이름 목록
  const workbookXml = readZipFile(buffer, "xl/workbook.xml") ?? "";
  const sheetNames: string[] = [];
  for (const m of workbookXml.matchAll(/name="([^"]+)"/g)) sheetNames.push(m[1]);

  // 열 문자 → 숫자 (정렬용)
  const colNum = (col: string) =>
    [...col].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0);

  // 각 워크시트 파싱
  // split 방식: 한셀처럼 행 하나가 수백KB인 경우 regex 방식이 실패하기 때문
  const results: { sheetName: string; rawText: string }[] = [];

  for (let si = 0; si < Math.max(sheetNames.length, 1); si++) {
    const sheetXml = readZipFile(buffer, `xl/worksheets/sheet${si + 1}.xml`);
    if (!sheetXml) continue;

    const rowParts = sheetXml.split(/(?=<(?:[a-z]+:)?row\b)/);
    const rowLines: string[] = [];

    for (const part of rowParts) {
      if (!/^<(?:[a-z]+:)?row\b/.test(part)) continue;
      const endMatch = /<\/(?:[a-z]+:)?row>/.exec(part);
      const raw = endMatch
        ? part.slice(0, endMatch.index + endMatch[0].length)
        : part.slice(0, 4000);
      // 자가닫기 셀(<x:c ... />) 먼저 제거 — 열린 태그로 오인식되는 버그 방지
      // g 플래그 regex는 루프 안에서 매번 새로 생성 (lastIndex 오염 방지)
      const parseTarget = (raw.length > 4000 ? raw.slice(0, 4000) : raw)
        .replace(/<(?:[a-z]+:)?c\b[^>]*\/>/g, "");

      const cells: { colNum: number; value: string }[] = [];
      const cellRe = /<(?:[a-z]+:)?c\b([^>]*)>([\s\S]*?)<\/(?:[a-z]+:)?c>/g;
      for (const cell of parseTarget.matchAll(cellRe)) {
        const attrs  = cell[1];
        const colStr = attrs.match(/\br="([A-Z]+)\d+"/)?.[1] ?? "";
        if (!colStr) continue;
        const cn = colNum(colStr);
        if (cn > 26) break; // A~Z 범위만 — 이후는 한셀의 빈 스타일 셀
        const type   = attrs.match(/\bt="([^"]+)"/)?.[1] ?? "";
        const inner  = cell[2];
        const rawVal = inner.match(/<(?:[a-z]+:)?v>([^<]*)<\/(?:[a-z]+:)?v>/)?.[1] ?? "";
        let value = "";
        if (type === "s") {
          const idx = parseInt(rawVal, 10);
          value = Number.isFinite(idx) && idx < sharedStrings.length ? sharedStrings[idx] : "";
        } else {
          value = rawVal;
        }
        if (value.trim()) cells.push({ colNum: cn, value: value.trim() });
      }
      cells.sort((a, b) => a.colNum - b.colNum);
      const line = cells.map((c) => c.value).join(" | ");
      if (line.trim()) rowLines.push(line);
    }

    if (rowLines.length === 0) continue;
    results.push({
      sheetName: sheetNames[si] ?? `시트${si + 1}`,
      rawText: rowLines.join("\n"),
    });
  }
  return results;
}

// 배열을 N개씩 나누기
function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

// 시트 배치를 AI로 분석 (요금표)
async function analyzeRateBatch(
  fileName: string,
  sheets: { sheetName: string; rawText: string }[]
): Promise<{ sheetName: string; summary: string; rows: Record<string, string>[] }[]> {
  const blocks = sheets
    .map((s) => `[시트: ${s.sheetName}]\n${s.rawText}`)
    .join("\n\n---\n\n");

  const standardCols = STANDARD_HEADERS.join(", ");

  const prompt = `아래는 여행사 요금표 파일(${fileName})의 시트 내용입니다.
각 줄은 엑셀의 한 행이며 셀 값은 " | "로 구분되어 있습니다.

${blocks}

각 시트를 분석해서 JSON 배열만 반환하세요. 다른 텍스트는 절대 쓰지 마세요.

규칙:
- 요금/가격 정보가 있는 시트만 포함. 목차·일정표·비요금 시트는 rows를 빈 배열로.
- 가능하면 다음 7개 컬럼으로 통일하세요: ${standardCols}
- 단, 시트 구조가 표준 요금표와 다른 경우(예: 업그레이드 비용표, 선택관광 추가비용 등)는 원본 데이터에 맞는 컬럼명을 그대로 사용해도 됩니다. 이 경우 모든 행의 컬럼명을 일관되게 유지하세요.
- 병합 셀로 인해 상품명·룸타입 등이 첫 행에만 있고 이후 행이 비어있을 수 있습니다. 이 경우 직전 행 값을 이어받아 모든 행을 완성하세요.
- 상품명: 호텔명 또는 상품명
- 룸타입: 객실 종류 (예: Deluxe, Suite, Twin 등)
- 기간: 여행 기간 또는 적용 날짜 범위 (예: 2박3일, 2025.01~03 등)
- 1인요금: 숫자만 (단위 제외, 예: 136 또는 136000)
- 통화: 원화면 "KRW", 달러면 "USD", 엔화면 "JPY" 등
- 포함사항: 조식, 공항이동 등 포함 내용
- 특이사항: 비고, 조건, 추가 안내 등
- 원본에 해당 정보가 없으면 빈 문자열 ""로
- rows는 시트당 최대 50개

형식:
[{"sheetName":"시트명","summary":"한줄요약","rows":[{"상품명":"","룸타입":"","기간":"","1인요금":"","통화":"","포함사항":"","특이사항":""}]}]`;

  try {
    const result = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 16000,
      temperature: 0,
    });
    const text = result.choices[0]?.message?.content ?? "[]";
    const json = text.match(/\[[\s\S]*\]/)?.[0] ?? "[]";
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// 시트 배치를 AI로 분석 (일정표)
async function analyzeItineraryBatch(
  fileName: string,
  sheets: { sheetName: string; rawText: string }[]
): Promise<{ sheetName: string; summary: string; rows: Record<string, string>[] }[]> {
  const blocks = sheets
    .map((s) => `[시트: ${s.sheetName}]\n${s.rawText}`)
    .join("\n\n---\n\n");

  const itineraryCols = ITINERARY_HEADERS.join(", ");

  const prompt = `아래는 여행사 일정표 파일(${fileName})의 시트 내용입니다.
각 줄은 엑셀의 한 행이며 셀 값은 " | "로 구분되어 있습니다.

${blocks}

각 시트를 분석해서 JSON 배열만 반환하세요. 다른 텍스트는 절대 쓰지 마세요.

규칙:
- 일정 내용이 있는 시트만 포함. 목차·요금·비일정 시트는 rows를 빈 배열로.
- 모든 행을 반드시 다음 8개 컬럼으로 통일: ${itineraryCols}
- 원본 파일의 컬럼명이 달라도 (날짜/일자/Day, 행사일정/주요일정 등) 의미에 맞게 아래 8개 컬럼으로 매핑하세요.
- 병합 셀로 인해 일차·지역·숙박 등이 첫 행에만 있고 이후 행이 비어있을 수 있습니다. 이 경우 직전 행 값을 이어받아 모든 행을 완성하세요.
- 일차: 몇 일차인지 (예: 1일차, 2일차 / "제 1 일" → "1일차" / "Day 1" → "1일차"로 변환)
- 지역: 해당 일차의 주요 방문 지역·도시 (예: 인천→호놀룰루, 우붓, 카오락)
- 교통편: 이동 수단 (예: 항공기, 전용차량, 렌터카, 없으면 빈 문자열)
- 일정내용: 그날의 주요 활동·관광지를 "·" 기호와 줄바꿈(\n)으로 나열. 관광지·명소 이름은 절대 생략하지 말고 원본에 나온 것을 모두 포함하세요. 단, "선택 N." 또는 "선택N." 형태로 번호가 붙은 옵션 항목은 일정내용에 절대 포함하지 말고 반드시 선택관광 컬럼에만 넣으세요.
- 선택관광: 원본에서 "선택 1.", "선택 2.", "선택1.", "선택2." 등 번호가 붙은 항목들을 찾아 투어명만 "·" 기호와 줄바꿈(\n)으로 나열. 절대로 일정내용에 넣지 말 것. 각 옵션의 상세 설명(가격·주의사항·포함내역 등)은 제외하고 투어명만. 예: "· 컨버터블 렌터카 24시간\n· 오션 터틀 스노클링\n· 하나우마베이 스노클링\n· 서핑 그룹레슨 90분\n· 해양스포츠 제트스키\n· 쿠알로아랜치 투어". 선택 옵션이 없으면 빈 문자열
- 숙박: HOTEL 행 또는 숙박 정보에서 호텔·리조트명 추출 (없으면 빈 문자열)
- 식사: 원본의 "조식/중식/석식" 항목을 확인하되 반드시 다음 규칙을 따를 것. "자유식"으로 표기된 식사는 포함이 아니므로 기재하지 마세요. 오직 "현지식", "포함", "제공" 등으로 명시된 식사만 기재. 예) "조식: 자유식 중식: 현지식 석식: 자유식" → "중식" 만 기재. 모두 자유식이면 빈 문자열 ""
- 특이사항: 비고, 주의사항, 추가요금 안내, 진행 조건 등 (없으면 빈 문자열)
- 원본에 해당 정보가 없으면 빈 문자열 ""로
- rows는 시트당 최대 50개

형식:
[{"sheetName":"시트명","summary":"한줄요약","rows":[{"일차":"","지역":"","교통편":"","일정내용":"","선택관광":"","숙박":"","식사":"","특이사항":""}]}]`;

  try {
    const result = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 16000,
      temperature: 0,
    });
    const text = result.choices[0]?.message?.content ?? "[]";
    const json = text.match(/\[[\s\S]*\]/)?.[0] ?? "[]";
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "관리자 인증 실패" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ ok: false, error: "파일이 없습니다." }, { status: 400 });
    }

    const fileName = file.name;
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "";

    if (!["xlsx", "xls", "csv", "pdf"].includes(ext)) {
      return NextResponse.json(
        { ok: false, error: "지원 형식: xlsx, xls, csv, pdf" },
        { status: 400 }
      );
    }

    const MAX_FILE_SIZE = ext === "pdf" ? 50 * 1024 * 1024 : 100 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      const limitLabel = ext === "pdf" ? "50MB" : "100MB";
      return NextResponse.json(
        { ok: false, error: `파일 크기는 ${limitLabel} 이하여야 합니다.` },
        { status: 400 }
      );
    }

    const category = (formData.get("category") as string | null)?.trim() ?? "";
    const validFrom = (formData.get("validFrom") as string | null)?.trim() ?? "";
    const validTo = (formData.get("validTo") as string | null)?.trim() ?? "";
    const docType = (formData.get("docType") as string | null) === "itinerary" ? "itinerary" : "rate";

    const buffer = Buffer.from(await file.arrayBuffer());
    await connectDB();

    const savedSheets: string[] = [];
    const results: { sheetName: string; summary: string; rowCount: number }[] = [];

    if (ext === "pdf") {
      const pdfData = await pdfParse(buffer);
      const rawText = pdfData.text?.trim() ?? "";

      if (!rawText || rawText.length < 10) {
        return NextResponse.json(
          { ok: false, error: "PDF에서 텍스트를 추출할 수 없습니다. 스캔본(이미지) PDF는 지원하지 않습니다." },
          { status: 400 }
        );
      }

      // PDF도 AI로 정리
      const analyzeFunc = docType === "itinerary" ? analyzeItineraryBatch : analyzeRateBatch;
      const aiResults = await analyzeFunc(fileName, [{ sheetName: "전체", rawText }]);
      const r = aiResults[0] ?? { sheetName: "전체", summary: rawText.slice(0, 300), rows: [] };

      await AiKnowledgeDraft.create({
        fileName, fileType: "text", docType, sheetName: r.sheetName,
        summary: r.summary || rawText,
        rows: r.rows ?? [],
        uploadedBy: session.user.id, category, validFrom, validTo,
      });
      savedSheets.push(r.sheetName);
      results.push({ sheetName: r.sheetName, summary: r.summary, rowCount: (r.rows ?? []).length });

    } else {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      console.log(`[Upload] ${fileName} — 시트 ${workbook.SheetNames.length}개`);

      // 모든 시트에서 원본 텍스트 추출
      let sheetTexts = workbook.SheetNames
        .map((sheetName) => ({
          sheetName,
          rawText: sheetToRawText(workbook.Sheets[sheetName]),
        }))
        .filter((s) => s.rawText.trim().length >= 20);

      // xlsx 파싱 결과가 비어있으면 (한셀 등 비표준 포맷) fallback 파서 시도
      if (sheetTexts.length === 0) {
        console.log(`[Upload] 표준 파싱 실패 — fallback 파서 시도 (${fileName})`);
        const fallback = fallbackParseXlsx(buffer).filter((s) => s.rawText.trim().length >= 20);
        if (fallback.length > 0) {
          sheetTexts = fallback;
          console.log(`[Upload] fallback 파서 성공 — ${sheetTexts.length}개 시트`);
        }
      }

      if (sheetTexts.length === 0) {
        return NextResponse.json({ ok: false, error: "읽을 수 있는 데이터가 없습니다. 파일을 Excel 또는 Google Sheets에서 열어 다시 저장 후 시도해보세요." }, { status: 400 });
      }

      // 2개씩 배치로 나눠 병렬 AI 호출
      const batches = chunk(sheetTexts, 1);
      console.log(`[Upload] AI 분석 시작 — ${batches.length}개 배치 병렬 처리 (${docType})`);

      const analyzeFunc = docType === "itinerary" ? analyzeItineraryBatch : analyzeRateBatch;
      const batchResults = await Promise.all(
        batches.map((batch) => analyzeFunc(fileName, batch))
      );
      const aiResults = batchResults.flat();
      console.log(`[Upload] AI 분석 완료 — ${aiResults.length}개 시트`);

      // sheetName → rawText 맵 (AI rows가 빈 경우 rawText 폴백용)
      const sheetTextMap = new Map(sheetTexts.map((s) => [s.sheetName, s.rawText]));
      const processedSheetNames = new Set<string>();

      for (const r of aiResults) {
        if (!r.sheetName) continue;
        processedSheetNames.add(r.sheetName);

        const hasRows = (r.rows ?? []).length > 0;
        const rawText = sheetTextMap.get(r.sheetName) ?? "";
        if (!hasRows && !rawText) continue; // 완전히 빈 시트만 제외

        try {
          await AiKnowledgeDraft.create({
            fileName,
            fileType: ext === "csv" ? "csv" : "excel",
            docType,
            sheetName: r.sheetName,
            // rows가 없으면 rawText를 summary에 보존 (승인 시 AiKnowledge.rawText로 복사됨)
            summary: r.summary || rawText,
            rows: r.rows ?? [],
            uploadedBy: session.user.id,
            category,
            validFrom,
            validTo,
          });
          savedSheets.push(r.sheetName);
          results.push({ sheetName: r.sheetName, summary: r.summary, rowCount: (r.rows ?? []).length });
        } catch (err: any) {
          console.error(`[Upload] DB 저장 오류 (${r.sheetName}):`, err?.message);
        }
      }

      // AI가 결과를 아예 반환하지 않은 시트 → rawText로 직접 저장
      for (const s of sheetTexts) {
        if (processedSheetNames.has(s.sheetName)) continue;
        try {
          await AiKnowledgeDraft.create({
            fileName,
            fileType: ext === "csv" ? "csv" : "excel",
            docType,
            sheetName: s.sheetName,
            summary: s.rawText,
            rows: [],
            uploadedBy: session.user.id,
            category,
            validFrom,
            validTo,
          });
          savedSheets.push(s.sheetName);
          results.push({ sheetName: s.sheetName, summary: s.rawText.slice(0, 100), rowCount: 0 });
        } catch (err: any) {
          console.error(`[Upload] 원본 텍스트 저장 오류 (${s.sheetName}):`, err?.message);
        }
      }
    }

    if (savedSheets.length === 0) {
      return NextResponse.json({ ok: false, error: "저장 가능한 데이터가 없습니다." }, { status: 400 });
    }

    return NextResponse.json({ ok: true, sheets: savedSheets, fileName, results });
  } catch (e: any) {
    console.error("Upload error:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? "서버 오류" }, { status: 500 });
  }
}

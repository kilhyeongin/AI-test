// src/app/api/land/rates/import/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import LandRate from "@/models/LandRate";
import * as XLSX from "xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RatePlan = {
  meal: string;
  nightsLabel: string;
  price: string;
  extraNightPrice: string;
};

type RateRow = {
  stayPeriod: string;
  roomType: string;
  occupancy: string;
  plan1: RatePlan;
  plan2: RatePlan;
};

function parseExcel(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // 2차원 배열 형태로 읽기 (각 행이 배열)
  const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

  if (!rows || rows.length < 2) {
    throw new Error("데이터 행이 없습니다. (헤더 + 최소 1행 이상 필요)");
  }

  // 첫 행은 헤더라고 가정
  const header = rows[0];
  const dataRows = rows.slice(1);

  let resortName = "";
  const rateRows: RateRow[] = [];

  for (const r of dataRows) {
    if (!r || r.length === 0) continue;

    // 엑셀 컬럼 인덱스 기준:
    // 0: 리조트명
    // 1: 투숙기간
    // 2: 객실
    // 3: 투숙인원
    // 4: 식사1
    // 5: 박1
    // 6: 요금1
    // 7: 1박추가1
    // 8: 식사2
    // 9: 박2
    // 10: 요금2
    // 11: 1박추가2
    const resortCell = String(r[0] ?? "").trim();
    if (resortCell) {
      resortName = resortCell;
    }

    const stayPeriod = String(r[1] ?? "").trim();
    const roomType = String(r[2] ?? "").trim();
    const occupancy = String(r[3] ?? "").trim();

    // 비어있는 행은 스킵
    if (!stayPeriod && !roomType && !occupancy) continue;

    const row: RateRow = {
      stayPeriod,
      roomType,
      occupancy,
      plan1: {
        meal: String(r[4] ?? "").trim(),
        nightsLabel: String(r[5] ?? "").trim(),
        price: String(r[6] ?? "").trim(),
        extraNightPrice: String(r[7] ?? "").trim(),
      },
      plan2: {
        meal: String(r[8] ?? "").trim(),
        nightsLabel: String(r[9] ?? "").trim(),
        price: String(r[10] ?? "").trim(),
        extraNightPrice: String(r[11] ?? "").trim(),
      },
    };

    rateRows.push(row);
  }

  if (!resortName) {
    throw new Error("리조트명이 비어 있습니다. (첫 번째 컬럼에 리조트명을 입력해주세요)");
  }

  if (rateRows.length === 0) {
    throw new Error("유효한 요금 행을 찾을 수 없습니다.");
  }

  return {
    resortName,
    rateRows,
    headerRow: header,
  };
}

export async function POST(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const isPreview = searchParams.get("preview") === "1";

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { ok: false, error: "파일이 전송되지 않았습니다." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const parsed = parseExcel(buffer);

    // 미리보기 모드: DB 저장 없이 파싱 결과만 반환
    if (isPreview) {
      // 너무 많을 수 있으니 프론트 미리보기는 최대 50행까지만
      const previewRows = parsed.rateRows.slice(0, 50);
      return NextResponse.json({
        ok: true,
        resortName: parsed.resortName,
        rows: previewRows,
        totalRows: parsed.rateRows.length,
      });
    }

    // 실제 업로드 모드: DB 저장
    await connectDB();

    const doc = await LandRate.create({
      resortName: parsed.resortName,
      rateRows: parsed.rateRows,
      // 텍스트(포함/불포함/특전 등)는 이후에 별도 수정 화면에서 입력
    });

    return NextResponse.json({
      ok: true,
      id: String(doc._id),
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { ok: false, error: e?.message || "엑셀 업로드 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

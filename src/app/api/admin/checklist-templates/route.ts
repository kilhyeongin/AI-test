// src/app/api/admin/checklist-templates/route.ts
// ---------------------------------------------
// 관리자용 체크리스트 템플릿 목록 & 생성 API
//  - GET  /api/admin/checklist-templates   : 템플릿 목록 조회
//  - POST /api/admin/checklist-templates   : 새 템플릿 생성
// ---------------------------------------------

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ChecklistTemplate } from "@/models/ChecklistTemplate";

// 템플릿 목록 조회
export async function GET() {
  try {
    await connectDB();

    const docs = await ChecklistTemplate.find().sort({ createdAt: -1 }).lean();

    return NextResponse.json(
      {
        ok: true,
        templates: docs.map((d) => ({
          id: String(d._id),
          name: d.name,
          description: d.description || "",
          items: (d.items as any[]).map((it) => ({
            key: it.key,
            title: it.title,
            defaultRole: it.defaultRole,
            defaultKind: it.defaultKind,
            area: it.area,
          })),
          createdAt: d.createdAt,
        })),
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("GET /api/admin/checklist-templates error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "서버 오류" },
      { status: 500 }
    );
  }
}

// 새 템플릿 생성
export async function POST(req: Request) {
  try {
    await connectDB();

    const body = (await req.json().catch(() => null)) as {
      name?: string;
      description?: string;
      items?: {
        key?: string;
        title?: string;
        defaultRole?: "admin" | "customer";
        defaultKind?:
          | "ADMIN_UPLOAD_VIEW"
          | "CLIENT_UPLOAD_REVIEW"
          | "PAYMENT_PIPELINE";
        area?: "main" | "extra";
      }[];
    } | null;

    if (!body) {
      return NextResponse.json(
        { ok: false, error: "잘못된 요청입니다.(body 없음)" },
        { status: 400 }
      );
    }

    const { name, description, items } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { ok: false, error: "템플릿 이름을 입력해 주세요." },
        { status: 400 }
      );
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { ok: false, error: "최소 1개 이상의 항목이 필요합니다." },
        { status: 400 }
      );
    }

    const normalizedItems = items.map((it, idx) => ({
      key: it.key && it.key.trim() ? it.key.trim() : `item_${idx + 1}`,
      title: it.title?.trim() || `항목 ${idx + 1}`,
      defaultRole: it.defaultRole || "admin",
      defaultKind: it.defaultKind || "ADMIN_UPLOAD_VIEW",
      area: it.area || "main",
    }));

    const doc = await ChecklistTemplate.create({
      name: name.trim(),
      description: description?.trim() || "",
      items: normalizedItems,
    });

    return NextResponse.json(
      {
        ok: true,
        id: String(doc._id),
      },
      { status: 201 }
    );
  } catch (e: any) {
    console.error("POST /api/admin/checklist-templates error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "서버 오류" },
      { status: 500 }
    );
  }
}

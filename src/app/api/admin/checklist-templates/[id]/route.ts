// /src/app/api/admin/checklist-templates/[id]/route.ts
// --------------------------------------------------
// 체크리스트 템플릿 단건 조회 / 수정 / 삭제 API
//  - GET    /api/admin/checklist-templates/[id]   : 단일 템플릿 조회
//  - PUT    /api/admin/checklist-templates/[id]   : 템플릿 수정
//  - DELETE /api/admin/checklist-templates/[id]   : 템플릿 삭제
// --------------------------------------------------

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ChecklistTemplate } from "@/models/ChecklistTemplate";
import { getAdminSession } from "@/lib/session";

type TemplateItemInput = {
  key?: string;
  title?: string;
  defaultRole?: "admin" | "customer";
  defaultKind?: "ADMIN_UPLOAD_VIEW" | "CLIENT_UPLOAD_REVIEW" | "PAYMENT_PIPELINE";
  area?: "main" | "extra";
};

// ✅ Next.js 15 route.ts 타입 호환: params가 Promise로 잡히는 케이스 대응
type RouteCtx = {
  params: Promise<{ id: string }>;
};

// 단일 템플릿 조회
export async function GET(req: Request, context: RouteCtx) {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json(
        { ok: false, error: "관리자 인증 실패" },
        { status: 401 }
      );
    }

    await connectDB();

    const { id } = await context.params;

    // lean() 결과를 any로 캐스팅해서 _id, name 등 사용 시 타입 에러 제거
    const doc = (await ChecklistTemplate.findById(id).lean()) as any;

    if (!doc) {
      return NextResponse.json(
        { ok: false, error: "템플릿을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        template: {
          id: String(doc._id),
          name: doc.name,
          description: doc.description || "",
          items: (doc.items || []).map((it: any) => ({
            key: it.key,
            title: it.title,
            defaultRole: it.defaultRole,
            defaultKind: it.defaultKind,
            area: it.area,
          })),
          createdAt: doc.createdAt,
        },
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("GET /api/admin/checklist-templates/[id] error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "서버 오류" },
      { status: 500 }
    );
  }
}

// 템플릿 수정
export async function PUT(req: Request, context: RouteCtx) {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json(
        { ok: false, error: "관리자 인증 실패" },
        { status: 401 }
      );
    }

    await connectDB();

    const { id } = await context.params;

    const body = (await req.json().catch(() => null)) as {
      name?: string;
      description?: string;
      items?: TemplateItemInput[];
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

    // 항목 정규화
    const normalizedItems = items.map((it, idx) => ({
      key: it.key && it.key.trim() ? it.key.trim() : `item_${idx + 1}`,
      title: it.title?.trim() || `항목 ${idx + 1}`,
      defaultRole: it.defaultRole || "admin",
      defaultKind: it.defaultKind || "ADMIN_UPLOAD_VIEW",
      area: it.area || "main",
    }));

    const updated = (await ChecklistTemplate.findByIdAndUpdate(
      id,
      {
        name: name.trim(),
        description: description?.trim() || "",
        items: normalizedItems,
      },
      { new: true }
    ).lean()) as any;

    if (!updated) {
      return NextResponse.json(
        { ok: false, error: "템플릿 저장에 실패했습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        id: String(updated._id),
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("PUT /api/admin/checklist-templates/[id] error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "서버 오류" },
      { status: 500 }
    );
  }
}

// 템플릿 삭제
export async function DELETE(req: Request, context: RouteCtx) {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json(
        { ok: false, error: "관리자 인증 실패" },
        { status: 401 }
      );
    }

    await connectDB();

    const { id } = await context.params;

    const deleted = (await ChecklistTemplate.findByIdAndDelete(id).lean()) as any;

    if (!deleted) {
      return NextResponse.json(
        { ok: false, error: "이미 삭제되었거나 존재하지 않는 템플릿입니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    console.error("DELETE /api/admin/checklist-templates/[id] error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "서버 오류" },
      { status: 500 }
    );
  }
}

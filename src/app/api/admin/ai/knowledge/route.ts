import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import AiKnowledge from "@/models/AiKnowledge";

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "관리자 인증 실패" }, { status: 401 });
    }

    await connectDB();

    const list = await AiKnowledge.find({})
      .select("fileName fileType docType sheetName headers createdAt rows category validFrom validTo")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ ok: true, list });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "서버 오류" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "관리자 인증 실패" }, { status: 401 });
    }

    const { oldCategory, newCategory } = await req.json();
    if (!newCategory?.trim()) {
      return NextResponse.json({ ok: false, error: "카테고리명을 입력해주세요." }, { status: 400 });
    }

    await connectDB();
    // "미분류"는 DB에 "" 또는 null로 저장되어 있음
    const filter = oldCategory === "미분류"
      ? { $or: [{ category: "" }, { category: null }, { category: { $exists: false } }] }
      : { category: oldCategory };

    await AiKnowledge.updateMany(filter, { $set: { category: newCategory.trim() } });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "서버 오류" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "관리자 인증 실패" }, { status: 401 });
    }

    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ ok: false, error: "id가 없습니다." }, { status: 400 });
    }

    await connectDB();
    await AiKnowledge.findByIdAndDelete(id);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "서버 오류" }, { status: 500 });
  }
}

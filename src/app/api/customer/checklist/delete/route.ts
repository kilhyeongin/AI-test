// [DELETE] 아이템 삭제 { id }
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ChecklistItem } from "@/models/ChecklistItem";
import { requireCustomerId } from "@/lib/customerSession";

export async function POST(req: NextRequest) {
  // Turbopack환경에서 DELETE 바디 파싱 이슈 회피용으로 POST 사용
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });

    const customerId = await requireCustomerId();
    await connectDB();
    const r = await ChecklistItem.deleteOne({ _id: id, customerId });
    if (!r.deletedCount) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || "failed" }, { status: 401 });
  }
}

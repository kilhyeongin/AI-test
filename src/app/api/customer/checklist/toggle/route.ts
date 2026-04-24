// [PATCH] 완료 토글 { id, done }
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ChecklistItem } from "@/models/ChecklistItem";
import { requireCustomerId } from "@/lib/customerSession";

export async function PATCH(req: NextRequest) {
  try {
    const { id, done } = await req.json();
    if (!id || typeof done !== "boolean") {
      return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }
    const customerId = await requireCustomerId();
    await connectDB();
    const updated = await ChecklistItem.findOneAndUpdate(
      { _id: id, customerId },
      { $set: { done } },
      { new: true }
    ).select("_id title done");
    if (!updated) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true, item: { id: String(updated._id), title: updated.title, done: updated.done } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || "failed" }, { status: 401 });
  }
}

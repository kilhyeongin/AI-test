import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { LandAgency } from "@/models/LandAgency";
import { verifyAdminSession } from "@/lib/jwt";
import { cookies } from "next/headers";
import { Types } from "mongoose";

export async function POST(req: NextRequest) {
  await connectDB();

  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value || "";
  const admin = verifyAdminSession(token);

  if (!admin) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const { id, status } = body;

  if (!id || !["approved", "rejected"].includes(status)) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }

  await LandAgency.findByIdAndUpdate(id, { status });

  return NextResponse.json({ ok: true });
}

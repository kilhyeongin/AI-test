// /src/app/api/admin/land/agencies/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { LandAgency } from "@/models/LandAgency";
import { cookies } from "next/headers";
import { verifyAdminSession } from "@/lib/jwt";
import { Types } from "mongoose";

// 공통: 관리자 인증
async function requireAdmin(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value || "";
  const sess = verifyAdminSession(token);
  if (!sess) {
    return null;
  }
  return sess;
}

// [GET] 랜드사 목록 조회
export async function GET(req: NextRequest) {
  await connectDB();
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 }
    );
  }

  const docs = await LandAgency.find().sort({ createdAt: -1 }).lean();

  const items = docs.map((d: any) => ({
    id: String(d._id),
    landName: d.landName,
    ownerName: d.ownerName,
    email: d.email,
    phone: d.phone,
    homepage: d.homepage || "",
    businessRegNo: d.businessRegNo,
    businessRegFileUrl: d.businessRegFileUrl,
    status: d.status, // "PENDING" | "APPROVED" | "REJECTED"
    createdAt: d.createdAt,
  }));

  return NextResponse.json({ ok: true, items });
}

// [POST] 상태 변경(승인/거절)
export async function POST(req: NextRequest) {
  await connectDB();
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 }
    );
  }

  const { id, status } = body || {};
  if (!id || !status || !["PENDING", "APPROVED", "REJECTED"].includes(status)) {
    return NextResponse.json(
      { ok: false, error: "missing_fields" },
      { status: 400 }
    );
  }
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { ok: false, error: "invalid_id" },
      { status: 400 }
    );
  }

  await LandAgency.updateOne({ _id: id }, { $set: { status } });

  return NextResponse.json({ ok: true });
}

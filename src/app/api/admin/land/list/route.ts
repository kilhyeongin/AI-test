import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { LandAgency } from "@/models/LandAgency";
import { verifyAdminSession } from "@/lib/jwt";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  await connectDB();

  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value || "";
  const admin = verifyAdminSession(token);

  if (!admin) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const list = await LandAgency.find().sort({ createdAt: -1 }).lean();

  // ✅ 프론트(/admin/land/[id])와 동일한 키로 내려주기
  return NextResponse.json({
    ok: true,
    items: list.map((it: any) => ({
      id: String(it._id),

      landName: it.landName ?? "",
      ownerName: it.ownerName ?? "",
      email: it.email ?? "",
      phone: it.phone ?? "",
      homepage: it.homepage ?? "",
      businessRegNo: it.businessRegNo ?? "",
      businessRegFileUrl: it.businessRegFileUrl ?? "",

      status: (it.status ?? "pending") as "pending" | "approved" | "rejected",
      createdAt: it.createdAt,
    })),
  });
}

// [GET] 관리자: 고객 상세 조회 (Next 15 params await)
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Customer } from "@/models/Customer";
import { getSessionUser } from "@/lib/authz";
import type { Types } from "mongoose";

type CustomerLean = {
  _id: Types.ObjectId;
  name: string;
  email: string;
  status: "active" | "disabled";
  createdAt: Date;
  updatedAt: Date;
};

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }   // ★ Promise
) {
  try {
    const me = await getSessionUser();
    if (!me) return NextResponse.json({ ok:false, error:"unauthenticated" }, { status:401 });

    const { id } = await ctx.params;          // ★ await
    await connectDB();

    const doc = await Customer.findById(id)
      .select("_id name email status createdAt updatedAt")
      .lean<CustomerLean | null>();

    if (!doc) return NextResponse.json({ ok:false, error:"not_found" }, { status:404 });

    return NextResponse.json({
      ok: true,
      customer: {
        id: String(doc._id),
        name: doc.name,
        email: doc.email,
        status: doc.status,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      },
    });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:"internal_error", debug:e?.message }, { status:500 });
  }
}

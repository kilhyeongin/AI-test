// [PATCH] 관리자 사용자 상태/권한 업데이트 (OWNER 전용)
// - 입력: { status?: "active"|"disabled", roles?: string[] }
// - Next.js 최신 버전에서는 params가 Promise일 수 있으므로 await 필요

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { requireOwnerUser } from "@/lib/authz";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> } // ✅ params가 Promise일 수 있음
) {
  try {
    await requireOwnerUser();
    await connectDB();

    const { id } = await ctx.params; // ✅ 반드시 await 해서 꺼냄

    const { status, roles } = await req.json();
    const update: any = {};
    if (status) update.status = status;
    if (Array.isArray(roles)) update.roles = roles;

    const doc = await User.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    }).select("email name roles status");

    if (!doc) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: String(doc._id),
        email: doc.email,
        name: doc.name,
        roles: doc.roles,
        status: doc.status,
      },
    });
  } catch (err: any) {
    const msg = String(err?.message || "");
    if (msg === "unauthenticated")
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    if (msg === "forbidden")
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    return NextResponse.json({ ok: false, error: "unexpected_error" }, { status: 500 });
  }
}

// [GET] 관리자 사용자 목록 (OWNER/ MANAGER 열람 가능)
// - 쿼리: ?q=검색어&page=1&limit=20
// - 반환: items[], total, page, limit
// - 수정/비번 초기화는 다른 API에서 OWNER만 허용

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { getSessionUser } from "@/lib/authz";

export async function GET(req: NextRequest) {
  try {
    // 🔐 로그인 여부 확인
    const me = await getSessionUser();
    if (!me) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }
    // 🔐 열람 권한: OWNER 또는 MANAGER만
    if (!me.roles.includes("OWNER") && !me.roles.includes("MANAGER")) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || "10")));
    const skip = (page - 1) * limit;

    const criteria: any = { persona: "admin" };
    if (q) {
      criteria.$or = [{ email: new RegExp(q, "i") }, { name: new RegExp(q, "i") }];
    }

    const [items, total] = await Promise.all([
      User.find(criteria)
        .select("email name roles status createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(criteria),
    ]);

    return NextResponse.json({ ok: true, items, total, page, limit });
  } catch (err) {
    return NextResponse.json({ ok: false, error: "unexpected_error" }, { status: 500 });
  }
}

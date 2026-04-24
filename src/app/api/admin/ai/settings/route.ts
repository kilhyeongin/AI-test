import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import AiSettings from "@/models/AiSettings";

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "관리자 인증 실패" }, { status: 401 });
    }
    await connectDB();
    const settings = await AiSettings.findOne({}).lean();
    return NextResponse.json({
      ok: true,
      settings: settings ?? { marginType: "fixed", marginAmount: 0 },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "관리자 인증 실패" }, { status: 401 });
    }

    const { marginType, marginAmount } = await req.json();

    if (!["fixed", "percentage"].includes(marginType)) {
      return NextResponse.json({ ok: false, error: "잘못된 마진 유형" }, { status: 400 });
    }
    if (typeof marginAmount !== "number" || marginAmount < 0) {
      return NextResponse.json({ ok: false, error: "잘못된 마진 금액" }, { status: 400 });
    }

    await connectDB();
    await AiSettings.findOneAndUpdate(
      {},
      { marginType, marginAmount, updatedBy: session.user.id },
      { upsert: true, new: true }
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}

// /src/app/api/admin/dashboard/departures/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { OnboardingFlow } from "@/models/OnboardingFlow";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "today";

    const now = new Date();
    const todayStart = startOfDay(now);

    // 오늘 끝(내일 0시 직전)
    const todayEnd = new Date(
      todayStart.getFullYear(),
      todayStart.getMonth(),
      todayStart.getDate() + 1
    );

    // 이번 주 마지막 날 (일요일 기준)
    const day = todayStart.getDay() || 7; // 일요일=0 → 7
    const weekEnd = new Date(todayStart);
    weekEnd.setDate(todayStart.getDate() + (7 - day));

    // 이번 달 끝(다음 달 1일)
    const monthEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      1
    );

    let dateFilter: any = {};

    if (range === "today") {
      // 오늘 출발: departDate == 오늘
      dateFilter = { $gte: todayStart, $lt: todayEnd };
    } else if (range === "week") {
      // 금주 출발: 오늘 포함 ~ 이번 주 끝, 과거 제외
      dateFilter = { $gte: todayStart, $lte: weekEnd };
    } else if (range === "month") {
      // 이달 출발: 오늘 포함 ~ 이달 말, 과거 제외
      dateFilter = { $gte: todayStart, $lt: monthEnd };
    } else {
      return NextResponse.json(
        { ok: false, error: "invalid range" },
        { status: 400 }
      );
    }

    const flows = await OnboardingFlow.find({
      departDate: dateFilter,
    })
      .select(
        "_id customerId customerName customerEmail destination tripTitle departDate"
      )
      .lean();

    const items = (flows || []).map((f: any) => {
      const depart = new Date(f.departDate);
      const diffMs = startOfDay(depart).getTime() - todayStart.getTime();
      const daysLeft = Math.round(diffMs / (1000 * 60 * 60 * 24));

      return {
        flowId: String(f._id),
        customerId: String(f.customerId),
        customerName: f.customerName || "고객",
        email: f.customerEmail || "",
        destination: f.destination || f.tripTitle || "",
        departDate: depart.toISOString(),
        daysLeft,
      };
    });

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { ok: false, error: e?.message || "server error" },
      { status: 500 }
    );
  }
}

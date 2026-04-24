import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { verifyAdminSession } from "@/lib/jwt";
import { Customer } from "@/models/Customer";
import { OnboardingFlow } from "@/models/OnboardingFlow";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    // 관리자 인증
    const cookie = req.cookies.get("admin_session")?.value || "";
    const sess = verifyAdminSession(cookie);
    if (!sess) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const sort = (searchParams.get("sort") || "recent").toLowerCase();

    // 1) 고객 목록
    const filter: any = {};
    if (q) {
      // 이름/이메일 간단 검색
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ];
    }

    // 최신 생성순으로 먼저 가져오고, 나중에 정렬 보정
    const customers = await Customer.find(filter)
      .select({ _id: 1, name: 1, email: 1, createdAt: 1 })
      .limit(200)
      .lean();

    const ids = customers.map((c: any) => String(c._id));
    // 2) 각 고객의 플로우 1개(있으면)
    const flows = await OnboardingFlow.find({ customerId: { $in: ids } })
      .select({
        _id: 1,
        customerId: 1,
        destination: 1,
        nights: 1,
        days: 1,
        departDate: 1,
        steps: 1,
        updatedAt: 1,
      })
      .lean();

    const flowMap = new Map<string, any>();
    for (const f of flows) flowMap.set(String(f.customerId), f);

    // 3) 카드 변환
    const items = customers.map((c: any) => {
      const f = flowMap.get(String(c._id));
      let progress = "-";
      if (f?.steps?.length) {
        const done = (f.steps || []).filter((s: any) => s.done).length;
        progress = done === f.steps.length ? "완료" : `${done}/${f.steps.length}`;
      }
      const tripText =
        f?.destination && f?.nights && f?.days
          ? `${f.destination} ${f.nights}박 ${f.days}일`
          : undefined;

      return {
        id: String(c._id),
        name: c.name || "이름없음",
        email: c.email || "",
        departDate: f?.departDate ? new Date(f.departDate).toISOString() : null,
        tripText,
        progress,
        flowId: f ? String(f._id) : null,
        hasFlow: !!f,
        destination: f?.destination || undefined,
        nights: f?.nights || undefined,
        days: f?.days || undefined,
        checklistUrl: f ? `/admin/customers/${c._id}/checklist` : undefined,
        _sort_recent: f?.updatedAt ? new Date(f.updatedAt).getTime() : 0,
        _sort_depart: f?.departDate ? new Date(f.departDate).getTime() : 0,
        _sort_name: (c.name || "").toLowerCase(),
        _sort_created: c?.createdAt ? new Date(c.createdAt).getTime() : 0,
      };
    });

    // 4) 정렬
    if (sort === "name") {
      items.sort((a, b) => a._sort_name.localeCompare(b._sort_name));
    } else if (sort === "depart") {
      items.sort((a, b) => (b._sort_depart || 0) - (a._sort_depart || 0));
    } else {
      // recent(기본): 최신 업데이트(없으면 생성일)
      items.sort((a, b) => {
        const A = a._sort_recent || a._sort_created;
        const B = b._sort_recent || b._sort_created;
        return (B || 0) - (A || 0);
      });
    }

    // 내부 정렬 키 삭제
    const cleaned = items.map(({ _sort_recent, _sort_depart, _sort_name, _sort_created, ...rest }) => rest);

    return NextResponse.json({ ok: true, items: cleaned });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "failed" }, { status: 500 });
  }
}

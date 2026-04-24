// /src/app/api/admin/dashboard/overview/route.ts
// 관리자 대시보드 개요 API (customers 컬렉션 사용 + 임박 리스트 고객별 1건 dedup)
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Customer } from "@/models/Customer";
import { OnboardingFlow } from "@/models/OnboardingFlow";

const DAY = 24 * 60 * 60 * 1000;

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

// Date | ISO | "YYYY. M. D." 지원
function toTs(v: any): number {
  if (!v) return 0;
  if (v instanceof Date) return v.getTime();
  if (typeof v === "string") {
    const t = Date.parse(v);
    if (!Number.isNaN(t)) return t;
    const m = v.match(/^\s*(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]).getTime();
  }
  return 0;
}

function inToday(ts: number, today0: number) {
  return ts >= today0 && ts < today0 + DAY;
}

// “이번 달” 여부 (과거/미래 상관 없이)
function inThisMonth(ts: number, today: Date) {
  const first = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
  const next = new Date(today.getFullYear(), today.getMonth() + 1, 1).getTime();
  return ts >= first && ts < next;
}

export async function GET(_req: NextRequest) {
  await connectDB();

  const customers = await Customer.find({})
    .select("_id name email")
    .lean();

  const flows = await OnboardingFlow.find({})
    .select("_id customerId departDate steps updatedAt createdAt")
    .lean();

  const today = new Date();
  const today0 = startOfDay(today);

  // ✅ “앞으로 7일” 구간 (출발 임박 + 금주 집계에 같이 사용)
  const sevenDaysEnd = today0 + 7 * DAY;

  // ----- 타일 집계 -----
  let depToday = 0,
    depWeek = 0,
    depMonth = 0;
  let workToday = 0,
    workWeek = 0,
    workMonth = 0;
  let totalSteps = 0,
    totalDone = 0;

  for (const f of flows as any[]) {
    const dt = toTs(f.departDate);
    if (!dt) continue;

    const steps = f.steps || [];
    totalSteps += steps.length;
    totalDone += steps.filter((s: any) => s.done).length;

    const adminPending = steps
      .flatMap((s: any) => s.subtasks || [])
      .filter(
        (st: any) => st.role === "admin" && st.status === "pending"
      ).length;

    // 1) 오늘 출발팀: 출발일 == 오늘
    if (inToday(dt, today0)) {
      depToday++;
      workToday += adminPending;
    }

    // 2) 금주 출발팀: 앞으로 7일 이내 (이미 출발한 팀 제외)
    if (dt >= today0 && dt < sevenDaysEnd) {
      depWeek++;
      workWeek += adminPending;
    }

    // 3) 이달 출발팀: 이번 달이면서 오늘 이후
    if (dt >= today0 && inThisMonth(dt, today)) {
      depMonth++;
    }

    // 4) 이달의 업무: 이번 달 안에 있는 출발 + 관리자 미처리 수
    if (inThisMonth(dt, today)) {
      workMonth += adminPending;
    }
  }

  const completionRate =
    totalSteps > 0 ? Math.round((totalDone / totalSteps) * 100) : 0;

  // ----- 임박(7일) : 고객별 1건(가장 가까운 출발일) -----
  const weekStart = today0;
  const weekEnd = sevenDaysEnd;

  const custMap = new Map<string, any>();
  for (const c of customers) custMap.set(String(c._id), c);

  // 고객이 존재하는 플로우 중, 앞으로 7일 내 출발만
  const upcoming = (flows as any[])
    .filter((f) => custMap.has(String(f.customerId)))
    .map((f) => ({ f, ts: toTs(f.departDate) }))
    .filter(({ ts }) => ts >= weekStart && ts < weekEnd);

  // 고객별 가장 가까운 출발일 1건만
  const bestByCustomer = new Map<string, { f: any; ts: number }>();
  for (const item of upcoming) {
    const key = String(item.f.customerId);
    const prev = bestByCustomer.get(key);
    if (!prev || item.ts < prev.ts) bestByCustomer.set(key, item);
  }

  const imminent = Array.from(bestByCustomer.values())
    .map(({ f, ts }) => {
      const cu = custMap.get(String(f.customerId));
      return {
        flowId: String(f._id),
        customerId: String(f.customerId),
        customerName: cu?.name || cu?.email || "-",
        email: cu?.email || "-",
        departDate: f.departDate,
        daysLeft: Math.ceil((ts - weekStart) / DAY),
      };
    })
    .sort((a, b) => toTs(a.departDate) - toTs(b.departDate))
    .slice(0, 10);

  // ----- 최근 업데이트(10) -----
  const recent = (flows as any[])
    .filter((f) => custMap.has(String(f.customerId)))
    .map((f) => {
      const cu = custMap.get(String(f.customerId));
      const steps = f.steps || [];
      const done = steps.filter((s: any) => s.done).length;
      const total = steps.length;
      return {
        flowId: String(f._id),
        customerId: String(f.customerId),
        customerName: cu?.name || cu?.email || "-",
        email: cu?.email || "-",
        updatedAt: f.updatedAt || f.createdAt,
        progress: total ? `${done}/${total}` : "-",
      };
    })
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() -
        new Date(a.updatedAt).getTime()
    )
    .slice(0, 10);

  return NextResponse.json({
    ok: true,
    tiles: { depToday, depWeek, depMonth, workToday, workWeek, workMonth },
    summary: {
      customerCount: customers.length,
      flowCount: flows.length,
      completionRate,
      imminentCount: imminent.length,
    },
    imminent,
    recent,
  });
}

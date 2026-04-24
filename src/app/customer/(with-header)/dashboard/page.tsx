// src/app/customer/(with-header)/dashboard/page.tsx
// 고객 대시보드 (PC: 2컬럼 / 모바일 ≤500px: 카드형 + 하단탭)
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "./dashboard.css";

type Me = { id: string; name: string };

type Flow = {
  _id: string;
  departDate?: string;
  destination?: string;
  customerId?: string;
};

function formatYMD(dateInput?: string | null): string {
  if (!dateInput) return "-";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "-";

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

export default function CustomerDashboard() {
  const router = useRouter();

  const [me, setMe] = useState<Me | null>(null);
  const [nearestDepart, setNearestDepart] = useState<string | null>(null);
  const [nearestDestination, setNearestDestination] = useState<string | null>(
    null
  );
  const [daysLeft, setDaysLeft] = useState<number>(0);

  useEffect(() => {
    (async () => {
      // 1) 고객 로그인 정보 확인
      const r = await fetch("/api/auth/customer/me", { cache: "no-store" });
      const data = await r.json().catch(() => null);

      if (!data?.ok) {
        router.replace("/customer/login");
        return;
      }

      const user: Me = data.user;
      setMe(user);

      // 2) 온보딩 플로우 전체 조회 (/api/onboarding/list)
      const flRes = await fetch("/api/onboarding/list", { cache: "no-store" });
      const flData = await flRes.json().catch(() => null);

      if (!flRes.ok || !flData?.ok || !Array.isArray(flData.flows)) {
        setNearestDepart(null);
        setNearestDestination(null);
        setDaysLeft(0);
        return;
      }

      const flows: Flow[] = flData.flows;

      if (!flows.length) {
        setNearestDepart(null);
        setNearestDestination(null);
        setDaysLeft(0);
        return;
      }

      // 3) 현재 로그인된 고객의 플로우만 추리기
      const myFlows = flows.filter(
        (f) =>
          !f.customerId || String(f.customerId) === String(user.id)
      );

      // 4) 미래 출발일만 조사하여 가장 가까운 날짜 찾기
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const futureFlows = myFlows
        .filter((f) => f.departDate)
        .map((f) => ({
          ...f,
          departTime: new Date(f.departDate as string).setHours(0, 0, 0, 0),
        }))
        .filter(
          (f) =>
            !Number.isNaN(f.departTime) &&
            f.departTime >= today.getTime() // 미래만
        )
        .sort((a, b) => a.departTime - b.departTime);

      if (!futureFlows.length) {
        setNearestDepart(null);
        setNearestDestination(null);
        setDaysLeft(0);
        return;
      }

      // 5) 가장 가까운 출발일 1개 + 여행지 선택
      const nearest = futureFlows[0];
      const departStr = nearest.departDate as string;
      const destStr = (nearest.destination || "").trim() || null;

      setNearestDepart(departStr);
      setNearestDestination(destStr);

      const depMs = new Date(departStr).setHours(0, 0, 0, 0);
      const diffDays = Math.max(
        0,
        Math.ceil((depMs - today.getTime()) / 86400000)
      );
      setDaysLeft(diffDays);
    })();
  }, [router]);

  // 화면에 보여줄 목적지 라벨
  const destLabel =
    nearestDestination && nearestDestination.length > 0
      ? nearestDestination
      : "여행";

  return (
    <div className="dash-root">
      {/* 컨테이너 (PC=2컬럼 / 모바일=1컬럼) */}
      <main className="dash-container">
        {/* 좌측 패널 */}
        <section className="panel-left">
          <div className="card user-card">
            <p className="hello">
              <b>{me?.name ?? ""}</b>님,
            </p>

            {nearestDepart ? (
              <>
                <p className="sub">
                  여행 출발까지 <b>{daysLeft}일</b> 남았어요
                </p>
                {/* 예: ✈ 2026-01-03 발리 */}
                <p className="date">
                  ✈ {formatYMD(nearestDepart)} {destLabel}
                </p>
              </>
            ) : (
              <>
                <p className="sub">예정된 여행이 없습니다.</p>
                <p className="date">✈ -</p>
              </>
            )}
          </div>

          <div className="card banner-card">
            <span className="b-ico">⚠️</span>
            <span className="b-text">잔금 납부일이 임박했어요!</span>
          </div>
        </section>

        {/* 우측 패널: 기능 카드 */}
        <section className="panel-right">
          <div className="grid">
            <Link href="/customer/checklist" className="grid-card">
              <div className="icon">☑️</div>
              <div className="label">여행 체크리스트</div>
            </Link>
            <Link href="/customer/destination" className="grid-card">
              <div className="icon">📍</div>
              <div className="label">여행지 정보</div>
            </Link>
            <Link href="/customer/mypage" className="grid-card">
              <div className="icon">❤️</div>
              <div className="label">MY PAGE</div>
            </Link>
            <Link href="/customer/points" className="grid-card">
              <div className="icon">👜</div>
              <div className="label">포인트</div>
            </Link>
            <Link href="/customer/chat" className="grid-card">
              <div className="icon">💬</div>
              <div className="label">챗봇 문의하기</div>
            </Link>
            <Link href="/customer/community" className="grid-card">
              <div className="icon">💭</div>
              <div className="label">커뮤니티</div>
            </Link>
          </div>
        </section>
      </main>

      {/* 하단 탭바 (모바일 ≤500px에서만 CSS로 보이게 함) */}
      <nav className="dash-tabbar">
        <Link href="/customer/dashboard" className="tab active">
          🏠
        </Link>
        <Link href="/customer/mypage" className="tab">
          ❤️
        </Link>
        <Link href="/customer/points" className="tab">
          👜
        </Link>
        <Link href="/customer/notifications" className="tab">
          🔔
        </Link>
      </nav>
    </div>
  );
}

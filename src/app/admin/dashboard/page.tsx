// /src/app/admin/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Tiles = {
  depToday: number;
  depWeek: number;
  depMonth: number;
  workToday: number;
  workWeek: number;
  workMonth: number;
};
type Summary = {
  customerCount: number;
  flowCount: number;
  completionRate: number;
  imminentCount: number;
};
type Imminent = {
  flowId: string;
  customerId: string;
  customerName: string;
  email: string;
  departDate: string;
  daysLeft: number;
};
type Recent = {
  flowId: string;
  customerId: string;
  customerName: string;
  email: string;
  progress: string;
  updatedAt: string;
};

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [tiles, setTiles] = useState<Tiles | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [imminent, setImminent] = useState<Imminent[]>([]);
  const [recent, setRecent] = useState<Recent[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/admin/dashboard/overview", {
          cache: "no-store",
        });
        const data = await r.json();
        if (!r.ok || !data?.ok) throw new Error(data?.error || "failed");
        setTiles(data.tiles);
        setSummary(data.summary);
        setImminent(data.imminent);
        setRecent(data.recent);
      } catch (e: any) {
        setErr(e?.message ?? "error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading)
    return (
      <div style={{ padding: 24 }}>
        <p>불러오는 중...</p>
      </div>
    );
  if (err)
    return (
      <div style={{ padding: 24 }}>
        <p style={{ color: "crimson" }}>오류: {err}</p>
      </div>
    );

  const t = tiles ?? {
    depToday: 0,
    depWeek: 0,
    depMonth: 0,
    workToday: 0,
    workWeek: 0,
    workMonth: 0,
  };

  return (
    <div className="adm-wrap">
      {/* 상단 요약 카드 (타일 + 오늘 업무 요약) */}
      <section className="summary-card">
        <div className="tiles-grid">
          {/* 출발팀 3개 → 클릭 시 출발팀 목록 페이지 이동 */}
          <div className="tiles-card">
            <Tile
              title="오늘 출발팀"
              value={t.depToday}
              unit="팀"
              href="/admin/departures/today"
            />
          </div>
          <div className="tiles-card">
            <Tile
              title="금주 출발팀"
              value={t.depWeek}
              unit="팀"
              href="/admin/departures/week"
            />
          </div>
          <div className="tiles-card">
            <Tile
              title="이달 출발팀"
              value={t.depMonth}
              unit="팀"
              href="/admin/departures/month"
            />
          </div>
          {/* 업무 3개는 지표만 표시 */}
          <div className="tiles-card">
            <Tile title="오늘의 업무" value={t.workToday} unit="건" />
          </div>
          <div className="tiles-card">
            <Tile title="금주의 업무" value={t.workWeek} unit="건" />
          </div>
          <div className="tiles-card">
            <Tile title="이달의 업무" value={t.workMonth} unit="건" />
          </div>
        </div>

        {/* 오늘의 업무 요약 (파란 카드 안 하단) */}
        <section className="today-card">
          <div className="t-head">
            <span className="t-icon">(!)</span>
            <span className="t-title">오늘의 업무 요약</span>
          </div>
          <div className="t-divider" />
          <button className="t-row">
            <span>우선 처리업무 : {t.workToday}건</span>
            <span className="chev">›</span>
          </button>
          <button className="t-row">
            <span>신규 서류접수 : {recent?.length ?? 0}건</span>
            <span className="chev">›</span>
          </button>
        </section>
      </section>

      {/* 2×2 정렬된 바로가기 카드 */}
      <section className="quick-grid">
        <Quick href="/admin/customers" icon="☑️" label="여행 체크리스트" />
        <Quick href="/admin/customers" icon="👤" label="고객 관리" />
        <Quick href="#" icon="📍" label="여행지 정보" />
        <Quick href="#" icon="💬" label="커뮤니티" />
      </section>

      {/* 출발 임박 리스트 */}
      <section className="panel">
        <div className="ph">
          <b>출발 임박 (7일)</b>
          <Link href="/admin/departures/imminent" className="view">
            전체보기
          </Link>
        </div>
        {imminent.length === 0 ? (
          <p className="muted">임박 고객이 없습니다.</p>
        ) : (
          <ul className="list">
            {imminent.slice(0, 5).map((i) => (
              <li key={i.flowId}>
                <div className="l-name">{i.customerName}</div>
                <div className="l-sub">
                  D-{i.daysLeft} ·{" "}
                  {new Date(i.departDate).toLocaleDateString()}
                </div>
                <Link
                  className="go"
                  href={`/admin/customers/${i.customerId}/checklist`}
                >
                  체크리스트
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <style jsx global>{`
        :root {
          --ink: #0f172a;
          --mut: #64748b;
          --line: #e5e7eb;
          --bg: #f7f8fb;
          --panel: #fff;
          --shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
          --accent: #2b56e3;
          --accent-soft: #eef2ff;
          --orange: #f97316;
        }
        .adm-wrap {
          max-width: 1100px;
          margin: 0 auto;
          padding: 20px;
          color: var(--ink);
          background: var(--bg);
        }

        /* 상단 summary 카드 (타일 + 오늘의 업무) */
        .summary-card {
          background: #eef3ff;
          border-radius: 16px;
          padding: 14px 14px 10px;
          box-shadow: var(--shadow);
          border: 1px solid #d4ddff;
          margin-bottom: 16px;
        }

        .tiles-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 10px;
        }
        @media (max-width: 900px) {
          .tiles-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        @media (max-width: 560px) {
          .tiles-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        /* ✅ 각 칸 전체를 타일이 꽉 채우도록 */
        .tiles-grid .tiles-card {
          width: 100%;
        }
          
        /* ✅ 링크가 있을 때도 칸 전체를 쓰게 */
        .tiles-grid .tiles-card > a {
          display: block;
          width: 100%;
          height: 100%;
        }

        .tile-card {
          background: #fff;
          border: 1px solid #e2e8ff;
          border-radius: 10px;
          box-shadow: 0 4px 10px rgba(15, 23, 42, 0.06);
          padding: 10px 8px;
          text-align: center;
          transition: transform 0.12s, box-shadow 0.12s;
          cursor: default;
          width: 100%;   /* 칸 안에서 가로 꽉 채우기 */
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .tile-card.clickable {
          cursor: pointer;
        }
        .tile-card.clickable:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 18px rgba(37, 99, 235, 0.18);
        }

        .tile-value {
          font-size: 20px;
          font-weight: 800;
          line-height: 1;
          color: #1e3a8a;
        }
        .tile-unit {
          font-size: 11px;
          margin-left: 4px;
          color: #6b7280;
        }
        .tile-title {
          margin-top: 4px;
          font-size: 11px;
          color: #4b5563;
        }

        .today-card {
          margin-top: 6px;
          background: #f8fafc;
          border: 1px solid #d1d5db;
          border-radius: 12px;
          padding: 8px 10px 6px;
        }
        .t-head {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 4px;
        }
        .t-icon {
          font-size: 13px;
          color: #4b5563;
        }
        .t-title {
          letter-spacing: -0.01em;
        }
        .t-divider {
          height: 1px;
          background: #e5e7eb;
          margin: 2px 0 4px;
        }
        .t-row {
          width: 100%;
          background: transparent;
          border: none;
          padding: 6px 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 13px;
          color: #111827;
          cursor: pointer;
        }
        .t-row + .t-row {
          border-top: 1px solid #e5e7eb;
        }
        .chev {
          color: #cbd5f5;
          font-weight: 700;
          font-size: 15px;
        }

        /* 2×2 바로가기 카드 */
        .quick-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 18px;
        }
        @media (max-width: 560px) {
          .quick-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        .q {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          color: #1d3a8a;
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: 18px 10px;
          min-height: 120px;
          box-shadow: var(--shadow);
          transition: transform 0.12s, box-shadow 0.12s;
        }
        .q:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 22px rgba(0, 0, 0, 0.08);
        }
        .q .i {
          font-size: 28px;
          margin-bottom: 8px;
        }
        .q .lb {
          margin-top: 4px;
          font-weight: 700;
          display: block;
          font-size: 13px;
        }
        .badge {
          position: absolute;
          right: 10px;
          top: 10px;
          background: var(--accent);
          color: #fff;
          border-radius: 999px;
          font-size: 12px;
          padding: 2px 6px;
        }

        /* 출발 임박 패널 */
        .panel {
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 12px;
          box-shadow: var(--shadow);
        }
        .ph {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .view {
          color: #2563eb;
          text-decoration: none;
          font-size: 14px;
        }
        .muted {
          color: var(--mut);
        }
        .list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .list li {
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 10px 12px;
          background: #fbfdff;
          display: grid;
          grid-template-columns: 1fr auto;
          row-gap: 4px;
        }
        .l-name {
          font-weight: 700;
        }
        .l-sub {
          color: var(--mut);
          font-size: 12px;
        }
        .go {
          grid-column: 2;
          align-self: center;
          text-decoration: none;
          background: var(--orange);
          color: #fff;
          padding: 6px 10px;
          border-radius: 8px;
        }
      `}</style>
    </div>
  );
}

function Tile({
  title,
  value,
  unit,
  href,
}: {
  title: string;
  value: number;
  unit: string;
  href?: string;
}) {
  const inner = (
    <div className={`tile-card ${href ? "clickable" : ""}`}>
      <div className="tile-value">
        {value}
        <span className="tile-unit">{unit}</span>
      </div>
      <div className="tile-title">{title}</div>
    </div>
  );
  if (href) {
    return (
      <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
        {inner}
      </Link>
    );
  }
  return inner;
}

function Quick({
  href,
  icon,
  label,
  badge,
}: {
  href: string;
  icon: string;
  label: string;
  badge?: string;
}) {
  return (
    <Link href={href} className="q">
      {badge && <span className="badge">{badge}</span>}
      <div className="i">{icon}</div>
      <span className="lb">{label}</span>
    </Link>
  );
}

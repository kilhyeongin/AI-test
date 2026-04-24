// /src/app/admin/departures/imminent/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Imminent = {
  flowId: string;
  customerId: string;
  customerName: string;
  email: string;
  departDate: string;
  daysLeft: number;
};

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

type OverviewResponse = {
  ok: boolean;
  tiles: Tiles;
  summary: Summary;
  imminent: Imminent[];
};

export default function ImminentDeparturesPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [imminent, setImminent] = useState<Imminent[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/admin/dashboard/overview", {
          cache: "no-store",
        });
        const data: OverviewResponse = await r.json();
        if (!r.ok || !data?.ok) throw new Error("failed");
        setImminent(data.imminent || []);
      } catch (e: any) {
        setErr(e?.message ?? "에러");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="imm-wrap">
        <p>불러오는 중...</p>
      </div>
    );
  }

  if (err) {
    return (
      <div className="imm-wrap">
        <p style={{ color: "crimson" }}>오류: {err}</p>
      </div>
    );
  }

  return (
    <div className="imm-wrap">
      <header className="imm-header">
        <div className="imm-title-row">
          <h1>출발 임박 (7일 이내)</h1>
          <span className="imm-count-badge">
            {imminent.length}팀
          </span>
        </div>
        <p className="imm-sub">
          오늘을 기준으로 <b>앞으로 7일 이내</b> 출발하는 팀 목록입니다.
        </p>
      </header>

      {imminent.length === 0 ? (
        <div className="imm-empty">
          <p>7일 이내 출발 예정인 팀이 없습니다.</p>
          <Link href="/admin/dashboard" className="imm-back">
            대시보드로 돌아가기
          </Link>
        </div>
      ) : (
        <section className="imm-list-wrap">
          <table className="imm-table">
            <thead>
              <tr>
                <th>고객명</th>
                <th>이메일</th>
                <th>출발일</th>
                <th>D-Day</th>
                <th>체크리스트</th>
              </tr>
            </thead>
            <tbody>
              {imminent.map((i) => (
                <tr key={i.flowId}>
                  <td>{i.customerName}</td>
                  <td>{i.email}</td>
                  <td>
                    {new Date(i.departDate).toLocaleDateString("ko-KR", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                    })}
                  </td>
                  <td className="imm-dday">
                    {i.daysLeft <= 0 ? "D-DAY" : `D-${i.daysLeft}`}
                  </td>
                  <td>
                    <Link
                      href={`/admin/customers/${i.customerId}/checklist`}
                      className="imm-link-btn"
                    >
                      체크리스트
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <style jsx>{`
        .imm-wrap {
          max-width: 1100px;
          margin: 0 auto;
          padding: 20px;
          font-size: 14px;
          color: #0f172a;
          background: #f7f8fb;
        }

        .imm-header {
          margin-bottom: 16px;
        }
        .imm-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .imm-header h1 {
          font-size: 20px;
          font-weight: 800;
          margin: 0;
        }
        .imm-count-badge {
          padding: 2px 10px;
          border-radius: 999px;
          background: #eef2ff;
          color: #1d4ed8;
          font-size: 12px;
          font-weight: 600;
        }
        .imm-sub {
          margin-top: 4px;
          color: #64748b;
        }

        .imm-empty {
          margin-top: 24px;
          padding: 24px;
          border-radius: 12px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          text-align: center;
        }
        .imm-back {
          display: inline-block;
          margin-top: 10px;
          padding: 6px 12px;
          border-radius: 999px;
          background: #2563eb;
          color: #ffffff;
          text-decoration: none;
          font-size: 13px;
        }

        .imm-list-wrap {
          margin-top: 8px;
          background: #ffffff;
          border-radius: 14px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);
          padding: 12px;
          overflow-x: auto;
        }

        .imm-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .imm-table thead tr {
          background: #f9fafb;
        }
        .imm-table th,
        .imm-table td {
          padding: 8px 10px;
          border-bottom: 1px solid #e5e7eb;
          text-align: left;
          white-space: nowrap;
        }
        .imm-table th {
          font-weight: 600;
          color: #4b5563;
        }
        .imm-table tbody tr:hover {
          background: #f1f5f9;
        }

        .imm-dday {
          font-weight: 700;
          color: #2563eb;
        }

        .imm-link-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 4px 10px;
          border-radius: 999px;
          background: #2563eb;
          color: #ffffff;
          text-decoration: none;
          font-size: 12px;
          font-weight: 600;
        }

        @media (max-width: 640px) {
          .imm-header h1 {
            font-size: 18px;
          }
          .imm-table th,
          .imm-table td {
            padding: 6px 8px;
          }
        }
      `}</style>
    </div>
  );
}

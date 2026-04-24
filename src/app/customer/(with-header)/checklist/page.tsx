// /src/app/customer/(with-header)/checklist/page.tsx
"use client";

import "@/app/(styles)/checklist-layout.css";
import { useEffect, useState } from "react";
import Link from "next/link";

type FlowLite = {
  _id: string;
  customerName?: string;
  destination?: string;
  nights?: number;
  days?: number;
  departDate?: string;
  stepsCount: number;
  doneCount: number;
};

type Me = { id: string; email: string; name: string };

function fmtYMD(d?: string | Date) {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function dday(depart?: string | Date) {
  if (!depart) return "";
  const d = new Date(depart);
  if (Number.isNaN(d.getTime())) return "";
  const s = new Date();
  s.setHours(0, 0, 0, 0);
  const e = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
  if (diff > 0) return `D-${diff}`;
  if (diff === 0) return `D-DAY`;
  return `D+${Math.abs(diff)}`;
}

export default function CustomerChecklistPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [flows, setFlows] = useState<FlowLite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // 1) 로그인 고객 확인
        const r = await fetch("/api/auth/customer/me", { cache: "no-store" });
        const d = await r.json().catch(() => null);
        if (!r.ok || !d?.ok) {
          location.href = "/customer/login?next=/customer/checklist";
          return;
        }
        setMe(d.user);

        // 2) 내 체크리스트 목록
        const r2 = await fetch("/api/customer/checklist/list", {
          cache: "no-store",
        });
        const d2 = await r2.json().catch(() => null);
        if (r2.ok && d2?.ok) setFlows(d2.items || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div style={{ padding: 24 }}>불러오는 중…</div>;
  if (!me) return <div style={{ padding: 24 }}>로그인이 필요합니다.</div>;

  return (
    <div className="page">
      <div className="wrap" style={{ maxWidth: 960 }}>
        <header className="hero">
          <div className="hero-main">{me.name}님의 체크리스트</div>
          <div className="hero-sub">진행 중인 여행 체크리스트를 확인하세요.</div>
        </header>

        <section className="list-card">
          <div className="list-header">
            <div className="list-title">
              <span className="list-ico">🗂️</span>
              <span>체크리스트 목록</span>
            </div>
            {flows.length > 0 && (
              <span className="list-count">총 {flows.length}개</span>
            )}
          </div>

          {flows.length === 0 ? (
            <div className="empty">
              아직 생성된 체크리스트가 없습니다.
              <br />
              담당 여행사에 체크리스트 생성을 요청해 주세요.
            </div>
          ) : (
            <div className="list-table">
              {/* 헤더 행 (PC 유지 / 모바일에서 숨김) */}
              <div className="list-row list-row-head">
                <div className="col col-trip">여행</div>
                <div className="col col-depart">출발일</div>
                <div className="col col-dday">D-day</div>
                <div className="col col-progress">진행도</div>
                <div className="col col-action" />
              </div>

              {/* 데이터 행 */}
              {flows.map((f) => {
                const trip = [
                  f.destination || "",
                  f.nights ? `${f.nights}박` : "",
                  f.days ? `${f.days}일` : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                const start = fmtYMD(f.departDate);
                const d = dday(f.departDate);
                const progress = `${f.doneCount}/${f.stepsCount}`;

                return (
                  <div key={f._id} className="list-row">
                    <div className="col col-trip">
                      <div className="trip-main">{trip || "여행"}</div>
                      {f.customerName && (
                        <div className="trip-sub">{f.customerName}</div>
                      )}

                      {/* ✅ 모바일에서만 보이는 심플 요약(한 줄) */}
                      <div className="m-summary">
                        <span className="m-s">
                          <span className="m-k">출발</span>{" "}
                          <span className="m-v">{start || "-"}</span>
                        </span>
                        <span className="m-dot">·</span>
                        <span className="m-s">
                          <span className="m-k">D-day</span>{" "}
                          <span className="m-v">{start ? d : "-"}</span>
                        </span>
                        <span className="m-dot">·</span>
                        <span className="m-s">
                          <span className="m-k">진행</span>{" "}
                          <span className="m-v">{progress}</span>
                        </span>
                      </div>
                    </div>

                    {/* PC 컬럼 유지 */}
                    <div className="col col-depart">{start || "-"}</div>
                    <div className="col col-dday">{start ? d : "-"}</div>
                    <div className="col col-progress">진행도 {progress}</div>

                    <div className="col col-action">
                      <Link
                        href={`/customer/checklist/${f._id}`}
                        className="btn open-btn"
                      >
                        열기
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <style jsx>{`
          .list-card {
            border-radius: 18px;
            background: #f9fafb;
            padding: 18px 20px;
            border: 1px solid #e5e7eb;
          }

          .list-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 10px;
          }

          .list-title {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 15px;
            font-weight: 600;
          }

          .list-ico {
            font-size: 16px;
          }

          .list-count {
            font-size: 12px;
            color: #6b7280;
          }

          .empty {
            padding: 24px 8px;
            font-size: 13px;
            color: #6b7280;
          }

          .list-table {
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid #e5e7eb;
            background: #ffffff;
          }

          /* ===== PC 기본(유지) ===== */
          .list-row {
            display: grid;
            grid-template-columns: 3fr 1.5fr 1fr 1.5fr 1.2fr;
            align-items: center;
            padding: 10px 14px;
            font-size: 13px;
            column-gap: 8px;
          }

          .list-row:nth-child(even):not(.list-row-head) {
            background: #f9fafb;
          }

          .list-row-head {
            background: #f3f4f6;
            font-size: 12px;
            font-weight: 600;
            color: #4b5563;
          }

          .col {
            display: flex;
            align-items: center;
          }

          .col-trip {
            flex-direction: column;
            align-items: flex-start;
            gap: 2px;
          }

          .trip-main {
            font-weight: 700;
          }

          .trip-sub {
            font-size: 11px;
            color: #6b7280;
          }

          .col-depart,
          .col-dday,
          .col-progress {
            font-size: 13px;
            color: #374151;
          }

          .col-action {
            justify-content: flex-end;
          }

          /* 기존 open-btn(PC) */
          .btn.open-btn {
            padding: 4px 10px;
            font-size: 11.5px;
            border-radius: 8px;
            border: 1px solid #cdd3dd; /* ✅ 기본 border 유지 */
            background: #ffffff;
            color: #374151;
            cursor: pointer;
            text-decoration: none;
            transition: all 0.15s ease;
            height: 30px;
            display: inline-flex;
            align-items: center;
            font-weight: 700;
          }

          .btn.open-btn:hover {
            background: #f3f4f6;
            border-color: #b7beca;
          }

          /* 모바일 요약 기본은 숨김 */
          .m-summary {
            display: none;
          }

          @media (max-width: 768px) {
            .list-row,
            .list-row-head {
              grid-template-columns: 2.6fr 1.7fr 1fr 1.6fr 1.4fr;
              padding: 8px 10px;
            }

            .list-card {
              padding: 14px 14px;
            }
          }

          /* ===== ✅ 모바일: 답답함 완화 + 글씨 두께 조절 + 버튼 border 확실 ===== */
          @media (max-width: 600px) {
            .list-table {
              border: 0;
              background: transparent;
              overflow: visible;
            }

            .list-row-head {
              display: none;
            }

            .list-row {
              grid-template-columns: 1fr auto;
              grid-template-rows: auto auto;
              align-items: start;
              column-gap: 10px;
              row-gap: 8px;

              padding: 12px 12px;
              margin-bottom: 10px;

              border: 1px solid #e5e7eb;
              border-radius: 14px;
              background: #ffffff;

              box-shadow: none; /* 과한 카드감 제거 */
            }

            .list-row:nth-child(even):not(.list-row-head) {
              background: #ffffff;
            }

            .col-depart,
            .col-dday,
            .col-progress {
              display: none;
            }

            .col-trip {
              grid-column: 1 / 2;
              grid-row: 1 / 3;
              gap: 6px; /* ✅ 여유 조금 */
            }

            .trip-main {
              font-size: 14px;
              line-height: 1.28;
              letter-spacing: -0.2px;
            }

            .trip-sub {
              font-size: 12px;
            }

            /* ✅ 위 마진/라인하이트로 답답함 해소 */
            .m-summary {
              display: flex;
              flex-wrap: wrap;
              align-items: center;
              gap: 6px;

              margin-top: 8px; /* ✅ 기존보다 더 띄움 */
              padding-top: 2px;

              font-size: 12px;
              line-height: 1.45; /* ✅ 답답함 감소 */
              color: #6b7280;
            }

            .m-k {
              color: #6b7280;
              font-weight: 500; /* ✅ 라벨도 과하게 안 두껍게 */
            }

            .m-v {
              color: #111827;
              font-weight: 600; /* ✅ 800 → 600 (두께 낮춤) */
            }

            .m-dot {
              color: #cbd5e1;
            }

            .col-action {
              grid-column: 2 / 3;
              grid-row: 1 / 3;
              align-items: stretch;
              justify-content: flex-end;
            }

            /* ✅ 열기 버튼: border 확실 + 너무 튀지 않게 */
            .btn.open-btn {
              height: 40px;
              padding: 0 12px;
              border-radius: 12px;

              border: 1px solid rgba(0, 0, 0, 0.7); /* ✅ outline-black 느낌 */
              background: #ffffff;
              color: #111827;

              font-size: 13px;
              font-weight: 700; /* ✅ 과한 두께 방지 */
            }

            .btn.open-btn:hover {
              background: #f9fafb;
              border-color: #111827;
            }
          }
        `}</style>
      </div>
    </div>
  );
}

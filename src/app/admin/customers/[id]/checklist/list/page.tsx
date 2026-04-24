// /src/app/admin/customers/[id]/checklist/list/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type FlowItem = {
  id: string;
  destination: string;
  nights: number;
  days: number;
  departDate?: string | null;
  createdAt?: string | null;
  progress: string;
};

export default function AdminCustomerChecklistListPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [customerName, setCustomerName] = useState<string>("고객");
  const [items, setItems] = useState<FlowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`/api/admin/onboarding/list?customerId=${id}`, {
        cache: "no-store",
      });
      const data = await r.json().catch(() => null);
      if (!r.ok || !data?.ok) throw new Error(data?.error || "failed");

      setCustomerName(data.customerName || "고객");
      setItems(data.items || []);
    } catch (e: any) {
      setErr(e?.message || "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function goToCreateChecklistPage() {
    if (!id) return;
    router.push(`/admin/customers/${id}/checklist/new`);
  }

  async function handleDeleteChecklist(flowId: string) {
    if (!id) return;
    const ok = window.confirm(
      "이 체크리스트를 삭제하시겠습니까?\n삭제 후에는 되돌릴 수 없습니다."
    );
    if (!ok) return;

    setDeletingId(flowId);
    setErr(null);

    try {
      const r = await fetch("/api/admin/onboarding/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flowId, customerId: id }),
      });
      const data = await r.json().catch(() => null);
      if (!r.ok || !data?.ok) throw new Error(data?.error || "삭제에 실패했습니다.");

      setItems((prev) => prev.filter((it) => it.id !== flowId));
    } catch (e: any) {
      setErr(e?.message || "삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="acl-wrap">
      <header className="acl-head">
        <button
          className="acl-btn acl-btn-line"
          onClick={() => router.push("/admin/customers")}
        >
          ← 목록
        </button>

        <h1 className="acl-title">
          {customerName ? `${customerName}의 체크리스트 목록` : "체크리스트 목록"}
        </h1>

        <button className="acl-btn acl-btn-black" onClick={goToCreateChecklistPage}>
          생성
        </button>
      </header>

      {loading && <p className="acl-muted">불러오는 중…</p>}
      {err && <p className="acl-err">오류: {err}</p>}
      {!loading && !err && items.length === 0 && (
        <p className="acl-muted">아직 생성된 체크리스트가 없습니다.</p>
      )}

      <ul className="acl-list">
        {items.map((item) => {
          const tripText =
            item.destination && item.nights && item.days
              ? `${item.destination} ${item.nights}박 ${item.days}일`
              : item.destination || "-";

          const isDeleting = deletingId === item.id;

          return (
            <li key={item.id} className="acl-card">
              <div className="acl-trip">{tripText}</div>

              <div className="acl-meta">
                <span className="acl-meta-item">
                  <span className="acl-meta-label">출발일</span>
                  <span className="acl-meta-val">{formatDate(item.departDate)}</span>
                </span>

                <span className="acl-meta-item">
                  <span className="acl-meta-label">진행상태</span>
                  <span className="acl-meta-val">{item.progress || "-"}</span>
                </span>
              </div>

              <div className="acl-gap" />

              <div className="acl-bottom">
                <div className="acl-actions">
                  <Link
                    href={{
                      pathname: `/admin/customers/${id}/checklist`,
                      query: { flowId: item.id },
                    }}
                    className="acl-btn acl-btn-outline"
                  >
                    열기
                  </Link>

                  <button
                    type="button"
                    className="acl-btn acl-btn-outline acl-btn-danger"
                    onClick={() => handleDeleteChecklist(item.id)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? "삭제 중..." : "삭제"}
                  </button>
                </div>

                <div className="acl-created">
                  생성일: {formatDateTime(item.createdAt)}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* ✅ 기본틀 유지 + Link에도 적용되도록 global 유지
          ✅ font-weight만 “포인트만 굵게 / 나머지 가볍게”로 조정 */}
      <style jsx global>{`
        .acl-wrap {
          width: 100%;
          max-width: 860px;
          margin: 0 auto;
          padding: 14px;
          box-sizing: border-box;
        }

        .acl-head {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
        }

        /* ✅ 제목만 포인트로 굵게 */
        .acl-title {
          margin: 0;
          text-align: center;
          line-height: 1.2;
          letter-spacing: -0.02em;
          overflow-wrap: anywhere;
          font-size: 15px;
          font-weight: 800; /* 포인트 */
          color: #111827;
        }

        /* ===== Buttons (열기/삭제 동일) ===== */
        .acl-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 7px 10px;
          border-radius: 999px;
          border: 1px solid #e5e7eb;
          background: #fff;
          font-size: 12.5px;
          font-weight: 500; /* ✅ 버튼 글씨는 가볍게 */
          cursor: pointer;
          white-space: nowrap;
          line-height: 1;
          min-height: 30px;
          box-sizing: border-box;
          text-decoration: none;
          color: inherit;
        }

        .acl-btn-black {
          background: rgba(0, 0, 0, 0.84);
          color: #fff;
          border-color: transparent;
          font-weight: 600; /* ✅ 액션 버튼만 살짝 더 */
        }

        .acl-btn-line {
          background: #fff;
          color: #111827;
          font-weight: 500;
        }

        .acl-btn-outline {
          background: #fff;
          color: #111827;
          border-color: rgba(0, 0, 0, 0.22);
        }

        .acl-btn-danger {
          color: #b91c1c;
          border-color: #fecaca;
        }

        .acl-btn:disabled {
          opacity: 0.7;
          cursor: default;
        }

        .acl-muted {
          color: #6b7280;
          font-size: 13px;
          margin: 10px 0;
          font-weight: 400;
        }

        .acl-err {
          color: #dc2626;
          font-size: 13px;
          margin: 10px 0;
          font-weight: 400;
        }

        .acl-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .acl-card {
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 12px 14px;
          background: #fff;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.03);
        }

        /* ✅ 카드 제목은 중간 정도만(너무 두껍지 않게) */
        .acl-trip {
          font-size: 14px;
          font-weight: 650; /* 800→650으로 다운 */
          color: #111827;
          overflow-wrap: anywhere;
        }

        /* ✅ 정보 텍스트는 전반적으로 가볍게 */
        .acl-meta {
          margin-top: 8px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px 14px;
          font-size: 12.5px;
          color: #374151;
          font-weight: 400;
        }

        .acl-meta-item {
          display: inline-flex;
          gap: 6px;
          align-items: baseline;
        }

        /* 라벨은 살짝만 강조 */
        .acl-meta-label {
          color: #6b7280;
          font-weight: 500; /* 800→500 */
        }

        /* 값은 보통 */
        .acl-meta-val {
          color: #374151;
          font-weight: 450; /* 700→450 */
        }

        .acl-gap {
          height: 10px;
        }

        .acl-bottom {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px;
        }

        .acl-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        /* ✅ 생성일은 가볍게 */
        .acl-created {
          font-size: 11.5px;
          color: #6b7280;
          text-align: right;
          white-space: nowrap;
          font-weight: 400;
        }

        @media (max-width: 560px) {
          .acl-head {
            grid-template-columns: 1fr 1fr;
            grid-template-areas:
              "back create"
              "title title";
            align-items: center;
          }

          .acl-head button:nth-child(1) {
            grid-area: back;
            justify-self: start;
          }

          /* ✅ 모바일 제목은 조금 키우되, 굵기는 유지 */
          .acl-title {
            grid-area: title;
            text-align: left;
            padding-top: 6px;
            font-size: 17px;
            font-weight: 800;
          }

          .acl-head button:nth-child(3) {
            grid-area: create;
            justify-self: end;
          }

          .acl-bottom {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }

          .acl-created {
            white-space: normal;
            text-align: left;
          }
        }
      `}</style>
    </div>
  );
}

function formatDate(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

function formatDateTime(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}.${m}.${day} ${hh}:${mm}`;
}

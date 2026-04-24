// /src/app/admin/land/agencies/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type LandItem = {
  id: string;
  landName: string;
  ownerName: string;
  email: string;
  phone: string;
  homepage: string;
  businessRegNo: string;
  businessRegFileUrl: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt?: string;
};

export default function AdminLandAgenciesPage() {
  const router = useRouter();
  const [items, setItems] = useState<LandItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch("/api/admin/land/agencies", {
        cache: "no-store",
      });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.ok) {
        throw new Error(d?.error || "failed");
      }
      setItems(d.items || []);
    } catch (e: any) {
      setErr(e?.message || "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(id: string, status: LandItem["status"]) {
    setBusyId(id);
    try {
      const r = await fetch("/api/admin/land/agencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.ok) {
        alert(d?.error || "변경 실패");
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  function fmtDate(iso?: string) {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "-";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}.${m}.${day}`;
  }

  function statusLabel(s: LandItem["status"]) {
    if (s === "PENDING") return "승인 대기";
    if (s === "APPROVED") return "승인 완료";
    return "승인 거절";
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <button
          className="btn line"
          onClick={() => router.push("/admin/dashboard")}
        >
          ← 대시보드
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>
          랜드사 가입 승인 관리
        </h1>
        <span style={{ width: 80 }} />
      </header>

      {loading && <p>불러오는 중…</p>}
      {err && <p style={{ color: "#dc2626" }}>오류: {err}</p>}
      {!loading && !err && items.length === 0 && (
        <p style={{ color: "#6b7280" }}>등록된 랜드사가 없습니다.</p>
      )}

      {!loading && !err && items.length > 0 && (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 14,
          }}
        >
          <thead>
            <tr>
              <th style={{ borderBottom: "1px solid #e5e7eb", padding: 8 }}>
                랜드사명
              </th>
              <th style={{ borderBottom: "1px solid #e5e7eb", padding: 8 }}>
                대표명
              </th>
              <th style={{ borderBottom: "1px solid #e5e7eb", padding: 8 }}>
                연락처
              </th>
              <th style={{ borderBottom: "1px solid #e5e7eb", padding: 8 }}>
                이메일
              </th>
              <th style={{ borderBottom: "1px solid #e5e7eb", padding: 8 }}>
                상태
              </th>
              <th style={{ borderBottom: "1px solid #e5e7eb", padding: 8 }}>
                가입일
              </th>
              <th style={{ borderBottom: "1px solid #e5e7eb", padding: 8 }}>
                액션
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td
                  style={{
                    borderBottom: "1px solid #f3f4f6",
                    padding: 8,
                    fontWeight: 600,
                  }}
                >
                  {it.landName}
                </td>
                <td style={{ borderBottom: "1px solid #f3f4f6", padding: 8 }}>
                  {it.ownerName}
                </td>
                <td style={{ borderBottom: "1px solid #f3f4f6", padding: 8 }}>
                  {it.phone}
                </td>
                <td style={{ borderBottom: "1px solid #f3f4f6", padding: 8 }}>
                  {it.email}
                </td>
                <td style={{ borderBottom: "1px solid #f3f4f6", padding: 8 }}>
                  {statusLabel(it.status)}
                </td>
                <td style={{ borderBottom: "1px solid #f3f4f6", padding: 8 }}>
                  {fmtDate(it.createdAt)}
                </td>
                <td style={{ borderBottom: "1px solid #f3f4f6", padding: 8 }}>
                  {it.status === "PENDING" ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        className="btn black"
                        disabled={busyId === it.id}
                        onClick={() => updateStatus(it.id, "APPROVED")}
                      >
                        승인
                      </button>
                      <button
                        className="btn line"
                        disabled={busyId === it.id}
                        onClick={() => updateStatus(it.id, "REJECTED")}
                      >
                        거절
                      </button>
                    </div>
                  ) : it.status === "APPROVED" ? (
                    <button
                      className="btn line"
                      disabled={busyId === it.id}
                      onClick={() => updateStatus(it.id, "PENDING")}
                    >
                      승인 취소
                    </button>
                  ) : (
                    <button
                      className="btn line"
                      disabled={busyId === it.id}
                      onClick={() => updateStatus(it.id, "PENDING")}
                    >
                      재검토
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* 버튼 공통 스타일 (관리자 쪽 기존 모노톤과 자연스럽게 어울리도록) */}
      <style jsx>{`
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 13px;
          border: 1px solid #e5e7eb;
          background: #fff;
          cursor: pointer;
        }
        .btn.black {
          background: #111827;
          color: #fff;
          border-color: #111827;
        }
        .btn.line {
          background: #fff;
          color: #111827;
        }
        .btn:disabled {
          opacity: 0.5;
          cursor: default;
        }
      `}</style>
    </div>
  );
}

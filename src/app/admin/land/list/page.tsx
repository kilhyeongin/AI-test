// src/app/admin/land/list/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminInnerTabs from "@/components/admin/AdminInnerTabs";

type Item = {
  id: string;

  // ✅ API/DB 기준 키로 통일
  landName: string;
  ownerName: string;
  email: string;
  phone: string;
  homepage: string;
  businessRegNo: string;
  businessRegFileUrl?: string;

  status: "pending" | "approved" | "rejected";
  createdAt?: string;
};

export default function LandListPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const r = await fetch("/api/admin/land/list", { cache: "no-store" });
    const d = await r.json().catch(() => null);

    if (d?.ok) setItems(d.items as Item[]);
    else setItems([]);

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      {/* 상단 관리자 탭 */}
      <AdminInnerTabs />

      {/* 본문 컨텐츠 */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>랜드사 가입 승인</h1>

        {loading && <p>불러오는 중...</p>}

        {!loading && items.length === 0 && <p>가입 신청이 없습니다.</p>}

        <ul style={{ listStyle: "none", padding: 0, marginTop: 20 }}>
          {items.map((item) => (
            <li
              key={item.id}
              style={{
                border: "1px solid #ddd",
                padding: 16,
                borderRadius: 12,
                marginBottom: 12,
                background: "#fff",
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    wordBreak: "break-word",
                  }}
                >
                  {item.landName}
                </div>

                <div style={{ marginTop: 4, fontSize: 14, color: "#555" }}>
                  대표: {item.ownerName} / {item.phone}
                </div>

                <div style={{ fontSize: 13, color: "#666" }}>{item.email}</div>

                {/* (옵션) 홈페이지/사업자번호도 목록에서 확인 가능하게 */}
                <div style={{ marginTop: 6, fontSize: 12, color: "#666" }}>
                  홈페이지: {item.homepage || "-"}
                </div>
                <div style={{ fontSize: 12, color: "#666" }}>
                  사업자등록번호: {item.businessRegNo || "-"}
                </div>

                <div
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color:
                      item.status === "approved"
                        ? "#10b981"
                        : item.status === "rejected"
                        ? "#ef4444"
                        : "#f59e0b",
                  }}
                >
                  상태: {item.status}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Link
                  href={`/admin/land/${item.id}`}
                  style={{
                    padding: "8px 14px",
                    background: "#111",
                    color: "#fff",
                    borderRadius: 8,
                    textAlign: "center",
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  상세보기
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// src/app/admin/land/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AdminInnerTabs from "@/components/admin/AdminInnerTabs";

type Item = {
  id: string;
  landName: string;
  ownerName: string;
  phone: string;
  email: string;
  homepage: string;
  businessRegNo: string;
  businessRegFileUrl: string;
  status: "pending" | "approved" | "rejected";
};

export default function LandDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<Item | null>(null);

  async function load() {
    // ✅ list API가 아래 Item 형태로 내려준다는 전제(아래 3번에서 API도 맞춰드립니다)
    const r = await fetch("/api/admin/land/list", { cache: "no-store" });
    const d = await r.json();
    if (!d?.ok) return;

    const found = (d.items || []).find((i: Item) => i.id === id);
    if (found) setItem(found);
  }

  async function approve(status: "approved" | "rejected") {
    const r = await fetch("/api/admin/land/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const d = await r.json();
    if (d.ok) {
      alert("처리 완료되었습니다.");
      load();
    } else {
      alert(d.error || "처리 오류");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <AdminInnerTabs />

      {!item ? (
        <div style={{ padding: 30 }}>불러오는 중...</div>
      ) : (
        <div style={{ maxWidth: 600, margin: "0 auto", padding: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>{item.landName}</h1>

          <div style={{ marginTop: 12 }}>
            <b>대표명:</b> {item.ownerName}
          </div>
          <div>
            <b>전화번호:</b> {item.phone}
          </div>
          <div>
            <b>이메일:</b> {item.email}
          </div>
          <div>
            <b>홈페이지:</b> {item.homepage}
          </div>
          <div>
            <b>사업자등록번호:</b> {item.businessRegNo}
          </div>

          <div style={{ marginTop: 16 }}>
            <b>사업자등록증:</b>
            <div>
              <a
                href={item.businessRegFileUrl}
                target="_blank"
                rel="noreferrer"
                style={{ color: "#2563eb" }}
              >
                파일 보기
              </a>
            </div>
          </div>

          <div style={{ marginTop: 24, fontSize: 14 }}>
            현재 상태:{" "}
            <b
              style={{
                color:
                  item.status === "approved"
                    ? "#10b981"
                    : item.status === "rejected"
                    ? "#ef4444"
                    : "#f59e0b",
              }}
            >
              {item.status}
            </b>
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
            <button
              onClick={() => approve("approved")}
              style={{
                padding: "10px 18px",
                borderRadius: 8,
                background: "#10b981",
                border: "none",
                color: "#fff",
                cursor: "pointer",
                flex: 1,
              }}
            >
              승인
            </button>

            <button
              onClick={() => approve("rejected")}
              style={{
                padding: "10px 18px",
                borderRadius: 8,
                background: "#ef4444",
                border: "none",
                color: "#fff",
                cursor: "pointer",
                flex: 1,
              }}
            >
              반려
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

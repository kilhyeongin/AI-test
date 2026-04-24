// /src/app/admin/departures/[range]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type DepartItem = {
  flowId: string;
  customerId: string;
  customerName: string;
  email?: string;
  departDate: string;
  destination?: string;
  daysLeft: number;
};

export default function DeparturesPage() {
  const { range } = useParams<{ range: "today" | "week" | "month" }>();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [items, setItems] = useState<DepartItem[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(
          `/api/admin/dashboard/departures?range=${range}`,
          { cache: "no-store" }
        );
        const d = await r.json();
        if (!r.ok || !d?.ok) throw new Error(d?.error || "failed");
        setItems(d.items || []);
      } catch (e: any) {
        setErr(e?.message ?? "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [range]);

  if (loading) return <div style={{ padding: 24 }}>불러오는 중...</div>;
  if (err)
    return (
      <div style={{ padding: 24, color: "crimson" }}>오류: {err}</div>
    );

  const titleMap: Record<string, string> = {
    today: "오늘 출발팀",
    week: "금주 출발팀",
    month: "이달 출발팀",
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 20 }}>
      <header
        style={{
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>
            {titleMap[range] || "출발팀"}
          </h1>
          <p style={{ color: "#6b7280", fontSize: 13 }}>
            {items.length}팀이 있습니다. (이미 출발한 팀은 제외)
          </p>
        </div>
        <Link
          href="/admin/dashboard"
          style={{ fontSize: 13, color: "#2563eb" }}
        >
          ← 대시보드로
        </Link>
      </header>

      {items.length === 0 ? (
        <p style={{ color: "#6b7280" }}>
          해당 기간에 출발하는 팀이 없습니다.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((it) => (
            <div
              key={it.flowId}
              style={{
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                padding: "10px 14px",
                background: "#ffffff",
                display: "grid",
                gridTemplateColumns: "1fr auto",
                rowGap: 3,
              }}
            >
              <div style={{ fontWeight: 700 }}>
                {it.customerName}{" "}
                {it.destination && (
                  <span
                    style={{
                      color: "#6b7280",
                      fontWeight: 400,
                    }}
                  >
                    · {it.destination}
                  </span>
                )}
              </div>
              <div style={{ color: "#6b7280", fontSize: 12 }}>
                출발일 {new Date(it.departDate).toLocaleDateString()} ·{" "}
                {it.daysLeft > 0
                  ? `D-${it.daysLeft}`
                  : it.daysLeft === 0
                  ? "D-DAY"
                  : `D+${Math.abs(it.daysLeft)}`}
                {it.email && ` · ${it.email}`}
              </div>
              <div style={{ gridColumn: 2, alignSelf: "center" }}>
                <Link
                  href={`/admin/customers/${it.customerId}/checklist?flowId=${it.flowId}`}
                  style={{
                    textDecoration: "none",
                    fontSize: 13,
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "1px solid #2563eb",
                    color: "#2563eb",
                  }}
                >
                  체크리스트 보기
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

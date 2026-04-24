// src/app/admin/guide/list/page.tsx
// 여행 안내 URL 목록 페이지

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminInnerTabs from "@/components/admin/AdminInnerTabs";

type GuideRow = {
  id: string;
  travelerName: string;
  destination: string;
  depart: string;
  departDate: string;
  arrive: string;
  arriveDate: string;
  createdAt: string;
};

export default function GuideListPage() {
  const [rows, setRows] = useState<GuideRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        // 백엔드에서 /api/guides GET으로 전체(또는 최근 N개) 목록을 준다고 가정
        const r = await fetch("/api/guides?limit=100", { cache: "no-store" });
        const data = await r.json();

        if (!r.ok || !data?.ok) {
          throw new Error(data?.error || "list_failed");
        }

        const mapped: GuideRow[] = (data.guides ?? []).map((g: any) => {
          const seg =
            Array.isArray(g.segments) && g.segments.length > 0
              ? g.segments[0]
              : {};
          const dep = seg?.depart ?? "";
          const arr = seg?.arrive ?? "";
          const date = seg?.date ?? "";
          // 단순히 같은 date를 쓰고, 필요하면 나중에 도착일 필드를 추가
          const arriveDate = seg?.arriveDate ?? date;

          return {
            id: String(g._id ?? g.id),
            travelerName: g.travelerName || "여행자",
            destination:
              [g.country, g.city].filter(Boolean).join(" · ") || "-",
            depart: dep || "-",
            departDate: date || "-",
            arrive: arr || "-",
            arriveDate: arriveDate || "-",
            createdAt: g.createdAt || "",
          };
        });

        setRows(mapped);
      } catch (e: any) {
        setErr(e?.message ?? "error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div>
      {/* 상단 관리자 탭 */}
      <AdminInnerTabs />

      {/* 본문 컨텐츠 */}
      <div className="cp-content">
        {/* 상단 툴바 */}
        <div className="cp-toolbar">
          <div>
            <h1 style={{ margin: 0, fontSize: 20 }}>여행 안내 URL 목록</h1>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 13,
                color: "#6b7280",
              }}
            >
              생성된 고객용 안내 페이지 URL을 한눈에 확인할 수 있습니다.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/admin/guide" className="cp-btn primary">
              + 새 여행안내 만들기
            </Link>
          </div>
        </div>

        {/* 목록 카드 */}
        <div className="cp-card">
          {loading && (
            <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
              목록 불러오는 중...
            </p>
          )}

          {err && !loading && (
            <p style={{ margin: 0, fontSize: 13, color: "#b91c1c" }}>
              오류: {err}
            </p>
          )}

          {!loading && !err && rows.length === 0 && (
            <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
              아직 생성된 여행 안내가 없습니다.
            </p>
          )}

          {!loading && !err && rows.length > 0 && (
            <table className="cp-table">
              <thead>
                <tr>
                  <th>여행자 성명</th>
                  <th>여행지</th>
                  <th>출발지 / 출발일</th>
                  <th>도착지 / 도착일</th>
                  <th>URL</th>
                  <th>생성일시</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((g) => {
                  const url = origin
                    ? `${origin}/guide/${g.id}`
                    : `/guide/${g.id}`;

                  return (
                    <tr key={g.id}>
                      <td>{g.travelerName}</td>
                      <td>{g.destination}</td>
                      <td>
                        <div>{g.depart}</div>
                        <div style={{ fontSize: 12, color: "#6b7280" }}>
                          {g.departDate}
                        </div>
                      </td>
                      <td>
                        <div>{g.arrive}</div>
                        <div style={{ fontSize: 12, color: "#6b7280" }}>
                          {g.arriveDate}
                        </div>
                      </td>
                      <td>
                        <div
                          style={{
                            maxWidth: 260,
                            fontSize: 12,
                            color: "#2563eb",
                            wordBreak: "break-all",
                          }}
                        >
                          {url}
                        </div>
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: "inline-block",
                            marginTop: 4,
                            fontSize: 11,
                            color: "#2563eb",
                            textDecoration: "underline",
                          }}
                        >
                          열기
                        </a>
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {g.createdAt
                          ? new Date(g.createdAt).toLocaleString("ko-KR", {
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

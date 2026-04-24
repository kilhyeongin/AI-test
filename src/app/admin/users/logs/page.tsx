// src/app/admin/users/logs/page.tsx
// 관리자 활동 로그 페이지 (OWNER만 접근 가능)

"use client";

import { useEffect, useState } from "react";
import AdminInnerTabs from "@/components/admin/AdminInnerTabs";

type LogItem = {
  _id: string;
  actorEmail: string;
  action: string;
  targetEmail?: string;
  details?: string;
  createdAt: string;
};

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/admin/logs/list", { cache: "no-store" });
        const data = await r.json();

        if (!r.ok || !data?.ok) {
          // API에서 내려준 error 문자열을 Error로 래핑
          throw new Error(data?.error || "load_failed");
        }

        setLogs(data.logs || []);
      } catch (e: any) {
        const raw = e?.message ?? "error";

        // 백엔드에서 forbidden을 내려주는 경우 사용자 친화적으로 변환
        if (raw === "forbidden") {
          setErr("권한이 없습니다. OWNER 권한만 로그를 볼 수 있습니다.");
        } else {
          setErr(raw);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div>
      {/* 관리자 내부 탭: 관리자 계정관리 / 로그 / 보안 */}
      <AdminInnerTabs />

      {/* 상단 설명 카드 */}
      <div className="admin-card" style={{ marginBottom: 14 }}>
        <h1 style={{ margin: 0, fontSize: 20 }}>관리자 활동 로그</h1>
        <p
          style={{
            marginTop: 4,
            fontSize: 13,
            color: "#6b7280",
          }}
        >
          관리자 로그인, 계정 변경 등 주요 작업 이력을 확인합니다.
        </p>
      </div>

      {/* 로딩 상태 */}
      {loading && (
        <div className="admin-card">
          <p style={{ margin: 0, fontSize: 14, color: "#6b7280" }}>
            불러오는 중...
          </p>
        </div>
      )}

      {/* 에러 상태 */}
      {err && !loading && (
        <div className="admin-card">
          <p style={{ margin: 0, fontSize: 14, color: "#b91c1c" }}>
            오류: {err}
          </p>
        </div>
      )}

      {/* 데이터 없음 */}
      {!loading && !err && logs.length === 0 && (
        <div className="admin-card">
          <p style={{ margin: 0, fontSize: 14, color: "#6b7280" }}>
            로그가 없습니다.
          </p>
        </div>
      )}

      {/* 로그 테이블 */}
      {!loading && !err && logs.length > 0 && (
        <div className="admin-card" style={{ padding: 0 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>일시</th>
                <th>실행자</th>
                <th>대상</th>
                <th>행동</th>
                <th>세부내용</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l._id}>
                  <td>{new Date(l.createdAt).toLocaleString()}</td>
                  <td>{l.actorEmail}</td>
                  <td>{l.targetEmail || "-"}</td>
                  <td>{l.action}</td>
                  <td>{l.details || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

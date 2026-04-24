// /src/app/land/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// 백엔드에서는 상태를 대문자/소문자 섞어서 줄 수도 있으니,
// UI에서는 일단 대문자로 통일해서 처리
type LandStatus = "PENDING" | "APPROVED" | "REJECTED";

type LandMe = {
  id: string;
  landName: string;
  email: string;
  status: LandStatus;
};

export default function LandDashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<LandMe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/auth/land/me", { cache: "no-store" });
        const d = await r.json().catch(() => null);

        if (!r.ok || !d?.ok) {
          // 로그인 안 되어 있으면 로그인 페이지로
          location.href = "/land/login?next=/land/dashboard";
          return;
        }

        // 응답 형태가 { ok, land: {...} } 인 경우와 { ok, landName: ... } 둘 다 커버
        const raw = d.land ? d.land : d;

        const landName =
          raw.landName || // land.landName 또는 바로 landName
          raw.name || // 혹시 name 으로 오는 경우
          "랜드사";

        // 🔥 status는 소문자/대문자 어떤 형식으로 와도 처리되게 통일
        const statusRawOriginal: string = raw.status || d.status || "PENDING";

        // 소문자, 대문자 어떤 값이 와도 대문자로 변환해 타입에 맞게 매핑
        const upper = String(statusRawOriginal).toUpperCase();

        const status: LandStatus =
          upper === "APPROVED" || upper === "REJECTED" || upper === "PENDING"
            ? (upper as LandStatus)
            : "PENDING";

        setMe({
          id: String(raw.id || raw._id || d.id || d._id || ""),
          landName,
          email: String(raw.email || d.email || ""),
          status,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div style={{ padding: 24 }}>불러오는 중…</div>;
  }

  if (!me) {
    return <div style={{ padding: 24 }}>로그인이 필요합니다.</div>;
  }

  const waiting = me.status === "PENDING";
  const rejected = me.status === "REJECTED";

  const displayName = me.landName || "랜드사";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        padding: 24,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
        }}
      >
        {/* 상단 헤더 — "{랜드명} 대시보드" */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 800,
              }}
            >
              {displayName} 대시보드
            </h1>
            <p
              style={{
                margin: "6px 0 0",
                fontSize: 13,
                color: "#6b7280",
              }}
            >
              {displayName}님, 환영합니다.
            </p>
          </div>

          <button
            onClick={() => {
              // TODO: land_session 삭제용 로그아웃 API가 생기면 여기로 교체
              location.href = "/land/login";
            }}
            style={{
              padding: "8px 16px",
              borderRadius: 999,
              border: "1px solid #e5e7eb",
              background: "#fff",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            로그아웃
          </button>
        </header>

        {/* 승인 상태 안내 */}
        {(waiting || rejected) && (
          <div
            style={{
              marginBottom: 20,
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid #fee2e2",
              background: "#fef2f2",
              color: "#b91c1c",
              fontSize: 13,
            }}
          >
            {waiting && (
              <>
                현재 계정 상태: <b>승인 대기</b>입니다. 관리자 승인 후 기능이
                활성화됩니다.
              </>
            )}
            {rejected && (
              <>
                현재 계정 상태: <b>승인 거절</b>입니다. 관리자에게 문의해주세요.
              </>
            )}
          </div>
        )}

        {/* 메인 카드 영역 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          {/* 요금표 등록 카드 */}
          <section
            style={{
              borderRadius: 16,
              border: "1px solid #e5e7eb",
              background: "#fff",
              padding: 20,
              boxShadow: "0 10px 25px rgba(15,23,42,0.05)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minHeight: 160,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  marginBottom: 8,
                }}
              >
                요금표 등록
              </div>
              <p
                style={{
                  margin: 0,
                  marginBottom: 8,
                  fontSize: 14,
                  color: "#4b5563",
                }}
              >
                시즌별/상품별 요금표를 등록하고,
                <br />
                여행사에서 바로 확인할 수 있도록 관리합니다.
              </p>
            </div>
            <div style={{ marginTop: 12 }}>
              <button
                disabled={waiting || rejected}
                onClick={() => router.push("/land/rates/new")}
                style={{
                  padding: "10px 18px",
                  borderRadius: 999,
                  border: "none",
                  cursor: waiting || rejected ? "default" : "pointer",
                  fontSize: 14,
                  fontWeight: 700,
                  background: waiting || rejected ? "#9ca3af" : "#111827",
                  color: "#fff",
                  width: "100%",
                }}
              >
                요금표 등록하기
              </button>
              {waiting && (
                <p
                  style={{
                    margin: "6px 0 0",
                    fontSize: 12,
                    color: "#6b7280",
                  }}
                >
                  승인 후 사용 가능합니다.
                </p>
              )}
            </div>
          </section>

          {/* 여행일정 등록 카드 */}
          <section
            style={{
              borderRadius: 16,
              border: "1px solid #e5e7eb",
              background: "#fff",
              padding: 20,
              boxShadow: "0 10px 25px rgba(15,23,42,0.05)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minHeight: 160,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  marginBottom: 8,
                }}
              >
                여행일정 등록
              </div>
              <p
                style={{
                  margin: 0,
                  marginBottom: 8,
                  fontSize: 14,
                  color: "#4b5563",
                }}
              >
                날짜별 상세 일정, 포함/불포함 내용을 등록해서
                <br />
                여행사와 공유할 수 있는 일정표를 만듭니다.
              </p>
            </div>
            <div style={{ marginTop: 12 }}>
              <button
                disabled={waiting || rejected}
                onClick={() => router.push("/land/itineraries/new")}
                style={{
                  padding: "10px 18px",
                  borderRadius: 999,
                  border: "none",
                  cursor: waiting || rejected ? "default" : "pointer",
                  fontSize: 14,
                  fontWeight: 700,
                  background: waiting || rejected ? "#9ca3af" : "#111827",
                  color: "#fff",
                  width: "100%",
                }}
              >
                여행일정 등록하기
              </button>
              {waiting && (
                <p
                  style={{
                    margin: "6px 0 0",
                    fontSize: 12,
                    color: "#6b7280",
                  }}
                >
                  승인 후 사용 가능합니다.
                </p>
              )}
            </div>
          </section>

          {/* 요금표 목록 / 엑셀 업로드 카드 */}
          <section
            style={{
              borderRadius: 16,
              border: "1px solid #e5e7eb",
              background: "#fff",
              padding: 20,
              boxShadow: "0 10px 25px rgba(15,23,42,0.05)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minHeight: 160,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  marginBottom: 8,
                }}
              >
                요금표 관리
              </div>
              <p
                style={{
                  margin: 0,
                  marginBottom: 8,
                  fontSize: 14,
                  color: "#4b5563",
                }}
              >
                등록된 요금표를 조회하거나,
                <br />
                엑셀로 여러 개를 한 번에 업로드할 수 있습니다.
              </p>
            </div>
            <div
              style={{
                marginTop: 12,
                display: "flex",
                gap: 8,
              }}
            >
              <button
                disabled={waiting || rejected}
                onClick={() => router.push("/land/rates")}
                style={{
                  flex: 1,
                  padding: "9px 14px",
                  borderRadius: 999,
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  cursor: waiting || rejected ? "default" : "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#111827",
                }}
              >
                요금표 목록
              </button>
              <button
                disabled={waiting || rejected}
                onClick={() => router.push("/land/rates/import")}
                style={{
                  flex: 1,
                  padding: "9px 14px",
                  borderRadius: 999,
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  cursor: waiting || rejected ? "default" : "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#111827",
                }}
              >
                엑셀 업로드
              </button>
            </div>
            {waiting && (
              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: 12,
                  color: "#6b7280",
                }}
              >
                승인 후 목록/업로드 기능을 사용할 수 있습니다.
              </p>
            )}
          </section>

          {/* 여행일정 목록 카드 */}
          <section
            style={{
              borderRadius: 16,
              border: "1px solid #e5e7eb",
              background: "#fff",
              padding: 20,
              boxShadow: "0 10px 25px rgba(15,23,42,0.05)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minHeight: 160,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  marginBottom: 8,
                }}
              >
                여행일정 관리
              </div>
              <p
                style={{
                  margin: 0,
                  marginBottom: 8,
                  fontSize: 14,
                  color: "#4b5563",
                }}
              >
                등록된 여행일정 목록을 확인하고,
                <br />
                상품별 일정표를 다시 열어볼 수 있습니다.
              </p>
            </div>
            <div style={{ marginTop: 12 }}>
              <button
                disabled={waiting || rejected}
                onClick={() => router.push("/land/itineraries")}
                style={{
                  padding: "10px 18px",
                  borderRadius: 999,
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  cursor: waiting || rejected ? "default" : "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#111827",
                  width: "100%",
                }}
              >
                여행일정 목록
              </button>
              {waiting && (
                <p
                  style={{
                    margin: "6px 0 0",
                    fontSize: 12,
                    color: "#6b7280",
                  }}
                >
                  승인 후 목록을 확인할 수 있습니다.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

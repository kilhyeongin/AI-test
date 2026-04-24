// src/app/admin/login/AdminLoginClient.tsx
"use client";

import "@/app/(styles)/checklist-layout.css";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const ADMIN_HOME = "/admin/dashboard";
const LOGIN_PATH = "/admin/login";

// ✅ 허용된 관리자 경로만 next로 인정 (없는 페이지/외부 이동 방지)
const ALLOW_PREFIXES = [
  "/admin/dashboard",
  "/admin/users",
  "/admin/checklist",
  "/admin/guide",
  "/admin/land",
  "/admin/itineraries",
  "/admin/account",
  "/admin/security",
];

// 내부 경로만 허용 + 로그인 페이지 루프 방지 + 허용 목록(allowlist)
function normalizeNext(raw: string | null) {
  if (!raw) return null;
  if (!raw.startsWith("/")) return null;        // 외부 URL 방지
  if (raw.startsWith(LOGIN_PATH)) return null;  // 로그인 페이지 루프 방지

  // ✅ 허용된 관리자 경로만 next로 인정
  const ok = ALLOW_PREFIXES.some((p) => raw === p || raw.startsWith(p + "/"));
  if (!ok) return null;

  return raw;
}

export default function AdminLoginClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState<string | null>(null);

  // 이미 로그인되어 있으면 next(있으면) 또는 기본 홈으로
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/auth/admin/me", {
          method: "GET",
          cache: "no-store",
          credentials: "include", // ✅ 쿠키 포함
        });

        const d = await r.json().catch(() => null);

        if (r.ok && d?.ok) {
          const next = normalizeNext(sp.get("next"));
          router.replace(next || ADMIN_HOME);
          return;
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [router, sp]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const r = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // ✅ Set-Cookie 저장 안정화
        body: JSON.stringify({ email, password: pw }),
      });

      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.ok) {
        setError(d?.error || "로그인에 실패했습니다.");
        return;
      }

      // ✅ 로그인 직후 /me 한 번 더 확인(쿠키 반영 확인) → 그 다음 이동
      const me = await fetch("/api/auth/admin/me", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });
      if (!me.ok) {
        setError("세션 확인에 실패했습니다. (쿠키 저장/전송 문제 가능)");
        return;
      }

      const next = normalizeNext(sp.get("next"));
      router.replace(next || ADMIN_HOME);
    } catch (e: any) {
      setError(e?.message || "알 수 없는 오류입니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div style={{ padding: 24 }}>로그인 상태 확인중…</div>;

  return (
    <div className="page">
      <div className="wrap">
        <header className="hero">
          <div className="hero-main">관리자 로그인</div>
          <div className="hero-sub">관리자 계정으로 로그인하세요.</div>
        </header>

        <main className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
          <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 14, color: "#374151" }}>이메일</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                required
                placeholder="admin@example.com"
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  padding: "10px 12px",
                }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 14, color: "#374151" }}>비밀번호</span>
              <input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.currentTarget.value)}
                required
                placeholder="••••••••"
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  padding: "10px 12px",
                }}
              />
            </label>

            {error && <div style={{ color: "#ef4444", fontSize: 14 }}>{error}</div>}

            <div className="actions" style={{ marginTop: 8 }}>
              <button type="submit" className="btn black" disabled={submitting}>
                {submitting ? "로그인 중…" : "로그인"}
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}

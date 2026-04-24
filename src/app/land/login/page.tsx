// src/app/land/login/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const LAND_HOME = "/land/dashboard";
const LOGIN_PATH = "/land/login";

// 내부 경로만 허용 + 로그인 페이지 루프 방지
function normalizeNext(raw: string | null) {
  if (!raw) return null;
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith(LOGIN_PATH)) return null;
  return raw;
}

export default function LandLoginPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const next = normalizeNext(sp.get("next")) || LAND_HOME;

  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ 진입 시 세션 확인: 이미 로그인 상태면 바로 이동
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const r = await fetch("/api/auth/land/me", {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        });

        const d = await r.json().catch(() => null);
        if (!cancelled && r.ok && d?.ok) {
          router.replace(next);
          return;
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, next]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("이메일과 비밀번호를 입력해주세요.");
      return;
    }

    setBusy(true);
    try {
      const r = await fetch("/api/auth/land/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // ✅ 쿠키 저장 안정화
        body: JSON.stringify({ email, password }),
      });

      const d = await r.json().catch(() => null);

      if (!r.ok || !d?.ok) {
        const code = d?.error || "unknown";

        if (code === "pending") {
          setError("승인 대기 중인 계정입니다. 관리자 승인 후 이용 가능합니다.");
        } else if (code === "rejected") {
          setError("승인 거절된 계정입니다. 관리자에게 문의해주세요.");
        } else if (code === "invalid_credentials") {
          setError("이메일 또는 비밀번호가 올바르지 않습니다.");
        } else if (code === "too_many_attempts") {
          setError("로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.");
        } else {
          setError(d?.error || "로그인에 실패했습니다.");
        }
        return;
      }

      // ✅ 로그인 성공 → next로 이동
      router.replace(next);
    } catch (e: any) {
      setError(e?.message || "오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  if (checking) {
    return <div style={{ padding: 24 }}>로그인 상태 확인 중...</div>;
  }

  return (
    <div style={{ maxWidth: 400, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 16 }}>
        랜드사 로그인
      </h1>

      <form onSubmit={submit}>
        <div style={{ marginBottom: 12 }}>
          <label>이메일</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 8,
              border: "1px solid #ddd",
              marginTop: 4,
            }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>비밀번호</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 8,
              border: "1px solid #ddd",
              marginTop: 4,
            }}
          />
        </div>

        {error && (
          <p style={{ color: "#dc2626", marginTop: 8, marginBottom: 8 }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          style={{
            width: "100%",
            padding: 12,
            marginTop: 8,
            background: "#111",
            color: "#fff",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
          }}
        >
          {busy ? "로그인 중..." : "로그인"}
        </button>
      </form>
    </div>
  );
}

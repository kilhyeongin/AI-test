// src/app/customer/login/CustomerLoginClient.tsx
"use client";

// 고객 로그인 페이지 (자동 로그아웃 제거, 세션 확인 우선)
// - 세션 있으면 next(또는 /customer/dashboard)로 이동
// - 세션 없으면 로그인 폼 노출
// - 강제 로그아웃이 필요할 때만 ?logout=1 로 진입

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import "@/app/customer/customer.css";
import Link from "next/link";

const DEFAULT_HOME = "/customer/dashboard";
const LOGIN_PATH = "/customer/login";

// 내부 경로만 허용하고 로그인 페이지는 제외 (루프 방지)
function normalizeNext(raw: string | null) {
  if (!raw) return null;
  if (!raw.startsWith("/")) return null; // 외부 URL 방지
  if (raw.startsWith(LOGIN_PATH)) return null; // 로그인 페이지 자체로의 루프 방지
  return raw;
}

export default function CustomerLoginClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const safeNext = normalizeNext(sp.get("next")) || DEFAULT_HOME;
  const forceLogout = sp.get("logout") === "1"; // ← 로그아웃 플래그

  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // 초기: 세션 확인 (필요 시 로그아웃)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (forceLogout) {
        await fetch("/api/auth/customer/logout", {
          method: "POST",
          cache: "no-store",
        }).catch(() => {});
        await new Promise((r) => setTimeout(r, 80)); // 쿠키 반영 대기
        if (!cancelled) setChecking(false); // 폼 표시
        return;
      }

      // 로그인 상태 확인
      const r = await fetch("/api/auth/customer/me", { cache: "no-store" });
      const data = await r.json().catch(() => null);

      if (!cancelled && data?.ok) {
        router.replace(safeNext);
        return;
      }

      if (!cancelled) setChecking(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [router, safeNext, forceLogout]);

  const canSubmit = Boolean(email) && Boolean(pw) && !loading;

  async function login() {
    if (!canSubmit) return;
    setLoading(true);
    setErr(null);

    try {
      const r = await fetch("/api/auth/customer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ loginId: email, password: pw }),
      });

      const data = await r.json().catch(() => null);
      if (!r.ok || !data?.ok) {
        setErr(data?.error || "login_failed");
        return;
      }

      router.replace(safeNext);
    } catch (e: any) {
      setErr(e?.message ?? "network_error");
    } finally {
      setLoading(false);
    }
  }

  if (checking) return <div style={{ padding: 24 }}>로그인 상태 확인 중...</div>;

  // 🔹 기존 디자인 그대로 유지
  return (
    <div className="cl-shell">
      <div className="cl-card">
        <div className="cl-logo">
          <div className="cl-logo-mark" />
          <div className="cl-logo-text">TechForest</div>
        </div>

        <input
          className="cl-input"
          placeholder="아이디"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <div className="cl-gap" />

        <input
          className="cl-input"
          type="password"
          placeholder="비밀번호"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />

        {err && (
          <p style={{ color: "#ef4444", marginTop: 10, fontSize: 14 }}>
            로그인 실패: {err}
          </p>
        )}

        <div className="cl-gap" />

        <button className="cl-btn" disabled={!canSubmit} onClick={login}>
          {loading ? "로그인 중..." : "로그인"}
        </button>

        <div className="cl-links">
          <Link href="/customer/find-id">아이디 찾기</Link>
          <span>|</span>
          <Link href="/customer/find-password">비밀번호 찾기</Link>
          <span>|</span>
          <Link href="/customer/register">회원가입</Link>
        </div>

        <div className="cl-divider">
          <span>간편로그인</span>
        </div>

        <div className="cl-social">
          <button className="cl-sns sns-naver" aria-label="네이버 로그인">
            <span>N</span>
          </button>
          <button className="cl-sns sns-kakao" aria-label="카카오 로그인">
            <span>💬</span>
          </button>
          <button className="cl-sns sns-google" aria-label="구글 로그인">
            <span>G</span>
          </button>
          <button className="cl-sns sns-facebook" aria-label="페이스북 로그인">
            <span>f</span>
          </button>
        </div>
      </div>
    </div>
  );
}

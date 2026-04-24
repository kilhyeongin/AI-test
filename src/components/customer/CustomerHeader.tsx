// src/components/customer/CustomerHeader.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Me = {
  name?: string | null;
};

export default function CustomerHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/auth/customer/me", { cache: "no-store" });
        const d = await r.json().catch(() => null);
        if (r.ok && d?.ok) setMe(d.user);
      } catch {
        // ignore
      }
    })();
  }, []);

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === "/customer") return pathname === "/customer";
    return pathname.startsWith(href);
  };

  async function handleLogout() {
    try {
      await fetch("/api/auth/customer/logout", { method: "POST" }).catch(
        () => null
      );
    } finally {
      router.push("/customer/login");
    }
  }

  const displayName = me?.name || "고객";

  // 이니셜 (동그라미 아바타 안에 표시)
  const initials =
    displayName
      .replace(/\s+/g, "")
      .slice(0, 2)
      .toUpperCase() || "GU";

  return (
    <header className="customer-header">
      <div className="customer-header-inner">
        {/* LEFT: 로고 + 서비스명 */}
        <div className="customer-header-left">
          <Link href="/customer/dashboard" className="customer-logo">
            <span className="customer-logo-mark" />
            <span className="customer-logo-text">TECH FOREST</span>
          </Link>

          {/* NAV */}
          <nav className="customer-nav">
            <Link
                href="/customer/dashboard"
                className={isActive("/customer/dashboard") ? "active" : ""}  // 경로 통일
            >
              대시보드
            </Link>
            <Link
              href="/customer/checklist"
              className={isActive("/customer/checklist") ? "active" : ""}
            >
              체크리스트
            </Link>
            {/* 나중에 필요하면 열기 */}
            {/* <Link
              href="/customer/destinations"
              className={isActive("/customer/destinations") ? "active" : ""}
            >
              여행지 정보
            </Link>
            <Link
              href="/customer/mypage"
              className={isActive("/customer/mypage") ? "active" : ""}
            >
              MY PAGE
            </Link> */}
          </nav>
        </div>

        {/* RIGHT: 유저 정보 + 로그아웃 */}
        <div className="customer-header-right">
          <div className="customer-user-chip">
            <span className="customer-user-avatar">{initials}</span>
            <div className="customer-user-meta">
              <span className="customer-user-name">{displayName}</span>
              <span className="customer-user-sub">고객 전용 페이지</span>
            </div>
          </div>
          <button
            type="button"
            className="btn line customer-logout-btn"
            onClick={handleLogout}
          >
            로그아웃
          </button>
        </div>
      </div>
    </header>
  );
}

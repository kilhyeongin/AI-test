// src/components/admin/AdminNav.tsx
// 관리자 상단 네비게이션 (로그인 상태에서만 표시)
// - /admin/login, /admin/accept 에서는 무조건 숨김
// - 세션이 없으면 숨김

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Me = { id: string; email: string; name: string; roles: string[] };

export default function AdminNav() {
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);

  // 로그인/초대 경로면 무조건 숨김
  const isPublicAdminPage =
    pathname === "/admin/login" || pathname?.startsWith("/admin/accept");

  useEffect(() => {
    if (isPublicAdminPage) {
      setReady(true);
      return;
    }
    (async () => {
      try {
        const r = await fetch("/api/auth/admin/me", { cache: "no-store" });
        const data = await r.json();
        if (r.ok && data?.ok) setMe(data.user);
      } finally {
        setReady(true);
      }
    })();
  }, [isPublicAdminPage]);

  if (!ready) return null;
  if (isPublicAdminPage) return null; // 로그인/초대 페이지 숨김
  if (!me) return null; // 세션 없으면 숨김

  async function logout() {
    await fetch("/api/auth/admin/logout", { method: "POST" });
    location.href = "/admin/login";
  }

  // 상단 탭 구성: 대시보드 / 여행안내 만들기 / 관리자
  const items = [
    { href: "/admin/dashboard", label: "대시보드" },
    { href: "/admin/guide", label: "여행안내 만들기" },
    { href: "/admin/users", label: "관리자" },
  ];

  return (
    <header className="cp-topbar">
      <nav className="cp-top-tabs">
        {items.map((it) => {
          const active = pathname.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={active ? "active" : undefined}
            >
              {it.label}
            </Link>
          );
        })}
      </nav>

      <div className="cp-right">
        <span className="cp-user">{me.name || me.email}</span>
        <button className="cp-logout" onClick={logout}>
          로그아웃
        </button>
      </div>

      <style jsx>{`
        .cp-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 16px;
          border-bottom: 1px solid #e5e7eb;
          background: #fff;
        }
        .cp-top-tabs {
          display: flex;
          gap: 12px;
        }
        .cp-top-tabs a {
          color: #0f172a;
          text-decoration: none;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 14px;
        }
        .cp-top-tabs a:hover {
          background: #f3f4f6;
        }
        .cp-top-tabs a.active {
          font-weight: 600;
          background: #e5edff;
          color: #1d4ed8;
        }
        .cp-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .cp-user {
          font-size: 13px;
          color: #374151;
        }
        .cp-logout {
          border: 1px solid #e5e7eb;
          background: #fff;
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 13px;
          cursor: pointer;
        }
        .cp-logout:hover {
          background: #f3f4f6;
        }
      `}</style>
    </header>
  );
}

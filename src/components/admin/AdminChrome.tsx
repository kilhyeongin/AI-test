"use client";

// admin.css 경로는 프로젝트 구조에 맞춰 유지
import "@/app/admin/admin.css";

import TopTabs from "@/components/admin/TopTabs";
import SideNav from "@/components/admin/SideNav";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Me = { name?: string; email: string };

export default function AdminChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = pathname === "/admin/login" || pathname?.startsWith("/admin/accept");

  // ✅ 훅은 항상 동일한 순서로 호출
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/auth/admin/me", { cache: "no-store" });
        const data = await r.json();
        if (r.ok && data?.ok) setMe({ name: data.user.name, email: data.user.email });
        else setMe(null);
      } catch {
        setMe(null);
      }
    })();
  }, []);

  async function logout() {
    await fetch("/api/auth/admin/logout", { method: "POST" });
    location.href = "/admin/login";
  }

  // ✅ 렌더만 분기 (훅 호출은 위에서 이미 끝남)
  if (isPublic) {
    return <>{children}</>;
  }

  return (
    <div className="cp-shell">
      <input type="checkbox" id="cp-nav-toggle" className="cp-nav-toggle" />

      <aside className="cp-sidebar">
        <div className="cp-brand">
          <span className="cp-dot cp-blue" />
          <span className="cp-dot cp-orange" />
          <b>CleanAdmin</b>
        </div>
        <SideNav />
        <div className="cp-sidenav-foot">© YourCompany</div>
      </aside>

      <div className="cp-main">
        <label htmlFor="cp-nav-toggle" className="cp-overlay" aria-hidden="true" />

        <header className="cp-topbar">
          <label htmlFor="cp-nav-toggle" className="cp-menu-btn" aria-label="Toggle Menu">☰</label>
          <TopTabs />
          <div className="cp-top-actions">
            <div className="cp-profile">
              <img src="https://dummyimage.com/32x32/dae2f8/ffffff&text=U" alt="user" />
              <div className="cp-profile-meta">
                <b>{me?.name || "관리자"}</b>
                <small>{me?.email || "Admin Panel"}</small>
              </div>
            </div>
            <button type="button" className="cp-btn ghost" onClick={logout}>로그아웃</button>
          </div>
        </header>

        <main className="cp-content">{children}</main>
      </div>
    </div>
  );
}

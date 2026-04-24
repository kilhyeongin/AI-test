// src/components/admin/SideNav.tsx
// 사이드바: 현재 경로에 따라 active 표시, 모바일에서 라벨 클릭 시 닫힘
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SideNav() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <nav className="cp-sidenav">
      {/* 모바일 전용 닫기 버튼 */}
      <label htmlFor="cp-nav-toggle" className="cp-close-on-mobile">
        메뉴 닫기
      </label>

      <Link
        href="/admin/dashboard"
        className={isActive("/admin/dashboard") ? "active" : undefined}
      >
        대시보드
      </Link>

      <Link
        href="/admin/guide"
        className={isActive("/admin/guide") ? "active" : undefined}
      >
        여행안내 만들기
      </Link>

      <Link
        href="/admin/users"
        className={isActive("/admin/users") ? "active" : undefined}
      >
        관리자
      </Link>

      <Link
        href="/admin/ai"
        className={isActive("/admin/ai") ? "active" : undefined}
      >
        AI 지식베이스
      </Link>

      <style jsx>{`
        .cp-sidenav {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 14px;
        }
        .cp-close-on-mobile {
          display: none;
        }
        .cp-sidenav a {
          padding: 8px 10px;
          border-radius: 8px;
          text-decoration: none;
          color: #4b5563;
        }
        .cp-sidenav a:hover {
          background: #f3f4f6;
          color: #111827;
        }
        .cp-sidenav a.active {
          background: #e5edff;
          color: #1d4ed8;
          font-weight: 600;
        }
        @media (max-width: 768px) {
          .cp-close-on-mobile {
            display: block;
            margin-bottom: 8px;
            font-size: 12px;
            color: #6b7280;
            cursor: pointer;
          }
        }
      `}</style>
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 관리자 상단 내부 탭
// - 관리자 계정관리 (/admin/users*)
// - 체크리스트 템플릿 (/admin/checklist/templates*)
// - 여행 안내 (/admin/guide*)
// - 랜드사 (/admin/land*)
// - 여행 일정표 (/admin/itineraries*)
// - 로그 (/admin/users/logs*)
// - 보안 (/admin/account/security*)
// - ✅ 보안로그 (/admin/security/auth-logs*)
type TabItem = {
  href: string;
  label: string;
  matchPrefix: string; // 활성 판정용 prefix
};

export default function AdminInnerTabs() {
  const pathname = usePathname();

  const items: TabItem[] = [
    {
      href: "/admin/users",
      label: "관리자 계정관리",
      matchPrefix: "/admin/users",
    },
    {
      href: "/admin/checklist/templates",
      label: "체크리스트 템플릿",
      matchPrefix: "/admin/checklist/templates",
    },
    {
      href: "/admin/guide",
      label: "여행 안내",
      matchPrefix: "/admin/guide",
    },
    {
      href: "/admin/land/list",
      label: "랜드사",
      matchPrefix: "/admin/land",
    },
    {
      href: "/admin/itineraries",
      label: "여행 일정표",
      matchPrefix: "/admin/itineraries",
    },
    {
      href: "/admin/users/logs",
      label: "로그",
      matchPrefix: "/admin/users/logs",
    },

    // ✅ 추가: 우리가 만든 보안로그/잠금관리 화면
    {
      href: "/admin/security/auth-logs",
      label: "보안로그",
      matchPrefix: "/admin/security/auth-logs",
    },

    // 기존 보안(계정 보안 설정 등)이 이미 있다면 유지
    {
      href: "/admin/account/security",
      label: "보안",
      matchPrefix: "/admin/account/security",
    },
  ];

  return (
    <nav className="admin-inner-tabs">
      {/* ✅ 스크롤을 담당하는 래퍼 */}
      <div className="ait-scroller">
        {items.map((it) => {
          const active =
            pathname === it.href ||
            pathname === it.matchPrefix ||
            pathname.startsWith(it.matchPrefix + "/");

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
      </div>
    </nav>
  );
}

// src/components/admin/TopTabs.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TopTabs() {
  const pathname = usePathname();

  const items = [
    { href: "/admin/dashboard", label: "대시보드" },
    { href: "/admin/guide", label: "여행안내 만들기" },
    { href: "/admin/users", label: "관리자" },
    { href: "/admin/ai", label: "AI" },
  ];

  return (
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
  );
}

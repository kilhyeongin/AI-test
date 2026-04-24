// src/app/land/layout.tsx
"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  children: ReactNode;
};

export default function LandLayout({ children }: Props) {
  const pathname = usePathname();

  const navItems = [
    { label: "대시보드", href: "/land/dashboard" },
    { label: "요금표", href: "/land/rates" },
    { label: "일정표", href: "/land/itineraries" },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 고정 헤더 */}
      <header className="fixed top-0 left-0 right-0 z-40 border-b bg-white/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between">
          {/* 로고/타이틀 자리 */}
          <Link href="/land/dashboard" className="text-sm font-semibold">
            랜드사
          </Link>

          {/* 네비게이션 탭 */}
          <nav className="flex items-center gap-4 text-sm">
            {navItems.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(item.href + "/");

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    "pb-0.5 border-b-2 transition-colors " +
                    (active
                      ? "border-black font-semibold text-black"
                      : "border-transparent text-gray-600 hover:text-black")
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* 헤더 높이만큼 위에 여백 줌 (h-12 + 여유) */}
      <main className="pt-16 pb-10">
        {children}
      </main>
    </div>
  );
}

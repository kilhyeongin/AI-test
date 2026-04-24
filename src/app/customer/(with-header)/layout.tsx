// /src/app/customer/(with-header)/layout.tsx
"use client";

import "@/app/(styles)/checklist-layout.css";
import CustomerHeader from "@/components/customer/CustomerHeader";

export default function CustomerWithHeaderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="page page-customer">
      <CustomerHeader />         {/* 고정 헤더 */}
      <main className="customer-main">{children}</main>
    </div>
  );
}

// src/app/customer/login/page.tsx
import { Suspense } from "react";
import CustomerLoginClient from "./CustomerLoginClient";

export default function CustomerLoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>로그인 화면 불러오는 중…</div>}>
      <CustomerLoginClient />
    </Suspense>
  );
}

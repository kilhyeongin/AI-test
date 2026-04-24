// src/app/admin/login/page.tsx
import { Suspense } from "react";
import AdminLoginClient from "./AdminLoginClient";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>로그인 화면 불러오는 중…</div>}>
      <AdminLoginClient />
    </Suspense>
  );
}

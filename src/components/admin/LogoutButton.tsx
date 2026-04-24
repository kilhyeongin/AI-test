// 관리자 로그아웃 버튼: 로그아웃 API 호출 → 로그인 페이지로 이동 (재사용 가능 컴포넌트)
"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function logout() {
    // 1) 로그아웃 API 호출: 서버가 admin_session 쿠키를 만료시킴
    await fetch("/api/auth/admin/logout", { method: "POST" });
    // 2) 로그인 페이지로 이동
    router.push("/admin/login");
  }

  return (
    <button
      onClick={logout}
      title="로그아웃"
      style={{
        padding: "8px 12px",
        borderRadius: 8,
        border: "1px solid #ddd",
        background: "white",
        cursor: "pointer",
      }}
    >
      로그아웃
    </button>
  );
}

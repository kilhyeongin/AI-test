// 서버 레이아웃: metadata만 가지고, 실제 UI 크롬은 클라이언트 컴포넌트로 위임
import type { Metadata } from "next";
import AdminChrome from "@/components/admin/AdminChrome";

export const metadata: Metadata = { title: "관리자" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminChrome>{children}</AdminChrome>;
}

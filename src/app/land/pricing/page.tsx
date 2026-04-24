// src/app/land/pricing/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type LandMe = {
  id: string;
  name: string;
  email: string;
};

export default function LandPricingPage() {
  const router = useRouter();
  const [me, setMe] = useState<LandMe | null>(null);
  const [loading, setLoading] = useState(true);

  async function authCheck() {
    setLoading(true);
    const r = await fetch("/api/auth/land/me", { cache: "no-store" });
    const d = await r.json().catch(() => null);
    if (!r.ok || !d?.ok) {
      router.push("/land/login?next=/land/pricing");
      return;
    }
    setMe(d.user as LandMe);
    setLoading(false);
  }

  useEffect(() => {
    authCheck();
  }, []);

  if (loading) return <div style={{ padding: 24 }}>불러오는 중…</div>;
  if (!me) return null;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 16 }}>요금표 관리</h1>
      <p style={{ fontSize: 14, color: "#6b7280" }}>
        여기에서 랜드 상품별 요금을 관리할 수 있도록 점점 확장해 나가면 된다.
      </p>

      {/* TODO: 이후 테이블, 요금 등록 폼 등 추가 예정 */}
      <div
        style={{
          marginTop: 20,
          padding: 16,
          borderRadius: 12,
          border: "1px dashed #d1d5db",
          background: "#f9fafb",
          fontSize: 14,
          color: "#6b7280",
        }}
      >
        앞으로 이 영역에 요금표 리스트 & 등록 폼을 단계적으로 추가하자.
      </div>
    </div>
  );
}

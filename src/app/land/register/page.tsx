// /src/app/land/register/page.tsx
"use client";

import { useState } from "react";

type LandRegisterForm = {
  landName: string;      // 랜드사 이름
  ownerName: string;     // 대표명
  phone: string;         // 전화번호
  email: string;         // 이메일
  homepage: string;      // 대표 URL (DB 필드: homepage)
  businessRegNo: string; // 사업자등록번호 (DB 필드: businessRegNo)
  password: string;      // 비밀번호
};

export default function LandRegisterPage() {
  const [form, setForm] = useState<LandRegisterForm>({
    landName: "",
    ownerName: "",
    phone: "",
    email: "",
    homepage: "",
    businessRegNo: "",
    password: "",
  });

  const [bizFile, setBizFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const update = (key: keyof LandRegisterForm, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  async function submit() {
    if (!bizFile) {
      alert("사업자등록증을 업로드해주세요.");
      return;
    }

    setBusy(true);
    try {
      // 1) S3 presign 요청
      const presign = await fetch("/api/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: bizFile.name,
          fileSize: bizFile.size,
          contentType: bizFile.type || "application/octet-stream",
          folder: "land-agency",
        }),
      });

      const ps = await presign.json();
      if (!presign.ok || !ps?.ok) {
        alert(ps?.error || "파일 업로드 준비 실패");
        return;
      }

      // 2) 실제 S3 업로드
      const putRes = await fetch(ps.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": bizFile.type || "application/octet-stream",
        },
        body: bizFile,
      });

      if (!putRes.ok) {
        alert("S3 업로드 실패");
        return;
      }

      const u = new URL(ps.uploadUrl as string);
      const publicUrl = `${u.origin}${u.pathname}`; // DB 저장용 public URL

      // 3) 랜드 회원가입 API 호출 (DB 저장 키와 동일하게 전송)
      const r = await fetch("/api/land/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          businessRegFileUrl: publicUrl, // DB 필드: businessRegFileUrl
        }),
      });

      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.ok) {
        alert(d?.error || "회원가입 실패");
        return;
      }

      alert("가입이 완료되었습니다. 관리자 승인 후 이용 가능합니다.");
      location.href = "/land/login";
    } catch (e: any) {
      alert(e?.message || "오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 500, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800 }}>랜드사 회원가입</h1>

      {(
        [
          ["landName", "랜드사 이름"],
          ["ownerName", "대표명"],
          ["phone", "전화번호"],
          ["email", "이메일"],
          ["homepage", "대표 URL"],
          ["businessRegNo", "사업자등록번호"],
          ["password", "비밀번호"],
        ] as const
      ).map(([key, label]) => (
        <div key={key} style={{ margin: "12px 0" }}>
          <label>{label}</label>
          <input
            type={key === "password" ? "password" : "text"}
            value={form[key]}
            onChange={(e) => update(key, e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              border: "1px solid #ddd",
              borderRadius: 8,
              marginTop: 4,
            }}
          />
        </div>
      ))}

      {/* 사업자등록증 첨부 */}
      <div style={{ margin: "12px 0" }}>
        <label>사업자등록증 업로드</label>
        <input
          type="file"
          accept="image/*,.pdf"
          onChange={(e) => setBizFile(e.target.files?.[0] || null)}
          style={{ marginTop: 6 }}
        />
      </div>

      <button
        disabled={busy}
        onClick={submit}
        style={{
          width: "100%",
          padding: 12,
          marginTop: 20,
          background: "#111",
          color: "#fff",
          borderRadius: 8,
          border: "none",
          cursor: "pointer",
        }}
      >
        {busy ? "가입 처리 중..." : "회원가입"}
      </button>
    </div>
  );
}

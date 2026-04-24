// src/app/admin/account/security/page.tsx
// 내 비밀번호 변경 (본인) — 성공 시 자동 로그아웃 후 로그인 페이지로 이동
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminInnerTabs from "@/components/admin/AdminInnerTabs";
import { AdminButton } from "@/components/admin/AdminButton";

export default function AccountSecurityPage() {
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const pwOK =
    newPassword.length >= 8 &&
    /[A-Za-z]/.test(newPassword) &&
    /\d/.test(newPassword);

  const canSubmit =
    !!currentPassword &&
    pwOK &&
    newPassword === newPassword2 &&
    !loading;

  async function changePassword() {
    if (!canSubmit) return;
    setLoading(true);
    setErr(null);
    setMsg(null);
    try {
      const r = await fetch("/api/auth/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await r.json();
      if (!r.ok || !data?.ok) {
        const e = data?.error || "change_failed";
        if (e === "weak_password") {
          setErr("비밀번호는 8자 이상이며, 영문과 숫자를 포함해야 합니다.");
        } else if (e === "wrong_password") {
          setErr("현재 비밀번호가 일치하지 않습니다.");
        } else if (e === "unauthenticated") {
          setErr("다시 로그인해주세요.");
        } else {
          setErr(e);
        }
        return;
      }
      setMsg("비밀번호가 변경되어 다시 로그인해야 합니다.");
      setTimeout(() => router.replace("/admin/login"), 800);
    } catch (e: any) {
      setErr(e?.message ?? "network_error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* 관리자 내부 탭: 관리자 계정관리 / 로그 / 보안 */}
      <AdminInnerTabs />

      <div className="admin-card" style={{ maxWidth: 520 }}>
        <h1 style={{ margin: 0, fontSize: 20 }}>내 비밀번호 변경</h1>
        <p
          style={{
            marginTop: 4,
            fontSize: 13,
            color: "#6b7280",
          }}
        >
          변경 후 보안을 위해 자동 로그아웃됩니다.
        </p>

        <label style={{ marginTop: 16, fontSize: 13 }}>현재 비밀번호</label>
        <input
          type="password"
          className="cp-input"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="현재 비밀번호"
        />

        <label style={{ marginTop: 12, fontSize: 13 }}>새 비밀번호</label>
        <input
          type="password"
          className="cp-input"
          value={newPassword}
          onChange={(e) => {
            setNewPassword(e.target.value);
            if (err) setErr(null);
          }}
          placeholder="8자 이상, 영문/숫자 포함"
        />

        <label style={{ marginTop: 12, fontSize: 13 }}>
          새 비밀번호 확인
        </label>
        <input
          type="password"
          className="cp-input"
          value={newPassword2}
          onChange={(e) => setNewPassword2(e.target.value)}
          placeholder="새 비밀번호 다시 입력"
        />

        {newPassword && newPassword2 && newPassword !== newPassword2 && (
          <p
            style={{
              color: "var(--danger)",
              fontSize: 12,
              marginTop: 6,
            }}
          >
            새 비밀번호가 일치하지 않습니다.
          </p>
        )}

        {err && (
          <p style={{ color: "var(--danger)", marginTop: 10, fontSize: 13 }}>
            오류: {err}
          </p>
        )}
        {msg && (
          <p style={{ color: "var(--green)", marginTop: 10, fontSize: 13 }}>
            {msg}
          </p>
        )}

        <div
          style={{
            height: 1,
            background: "#e5e7eb",
            margin: "18px 0 12px",
          }}
        />

        <AdminButton
          variant="primary"
          size="md"
          disabled={!canSubmit}
          onClick={changePassword}
          style={{ width: "100%" }}
        >
          {loading ? "변경 중..." : "비밀번호 변경"}
        </AdminButton>
      </div>
    </div>
  );
}

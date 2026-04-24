// 새 관리자 계정 생성 페이지 (OWNER 전용)
// - OWNER만 접근/입력 가능 (MANAGER/STAFF는 비활성화 안내)
// - 이메일, 이름, 비밀번호, 역할 필수
// - 비밀번호: 8자 이상 + 영문 + 숫자 포함
// - 생성 성공 시 역할을 한글(대표/운영자/직원)로 표기하여 안내

"use client";

import { useEffect, useMemo, useState } from "react";

// 역할 한글 표기
function roleLabelKR(role: string) {
  switch (role) {
    case "OWNER":
      return "대표";
    case "MANAGER":
      return "운영자";
    case "STAFF":
      return "직원";
    default:
      return role;
  }
}

export default function AdminUserCreatePage() {
  // 권한 가드 상태
  const [checking, setChecking] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [guardMsg, setGuardMsg] = useState<string | null>(null);

  // 입력 상태
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"OWNER" | "MANAGER" | "STAFF">("MANAGER");

  // 요청/알림 상태
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // 로그인/권한 확인
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/auth/admin/me", { cache: "no-store" });
        const data = await r.json();
        if (!r.ok || !data?.ok) {
          setGuardMsg("로그인이 필요합니다. /admin/login 으로 이동해 로그인해주세요.");
          setIsOwner(false);
          return;
        }
        const owner =
          Array.isArray(data.user?.roles) && data.user.roles.includes("OWNER");
        setIsOwner(owner);
        if (!owner) setGuardMsg("OWNER 권한이 필요합니다. OWNER 계정으로 로그인해주세요.");
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  // 비밀번호 규칙 검사
  const pwState = useMemo(() => {
    const lenOK = password.length >= 8;
    const hasLetter = /[A-Za-z]/.test(password);
    const hasDigit = /\d/.test(password);
    return { lenOK, hasLetter, hasDigit, ok: lenOK && hasLetter && hasDigit };
  }, [password]);

  // 제출 가능 여부
  const canSubmit =
    isOwner &&
    !checking &&
    email.includes("@") &&
    name.trim().length > 0 &&
    pwState.ok &&
    !!role &&
    !loading;

  // 계정 생성
  async function createUser() {
    if (!canSubmit) return;
    setLoading(true);
    setMsg(null);
    setErr(null);
    try {
      const r = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password, role }),
      });
      const data = await r.json();
      if (!r.ok || !data?.ok) {
        if (r.status === 409 && data?.error === "already_registered") {
          setErr("이미 관리자 영역에 등록된 이메일입니다.");
        } else if (r.status === 400 && data?.error === "weak_password") {
          setErr("비밀번호 규칙을 확인해주세요. (8자 이상, 영문/숫자 포함)");
        } else if (r.status === 401 && data?.error === "unauthenticated") {
          setErr("로그인이 필요합니다.");
        } else if (r.status === 403 && data?.error === "forbidden") {
          setErr("OWNER 권한이 필요합니다.");
        } else {
          setErr(data?.error || "create_failed");
        }
        return;
      }

      // ✅ 서버에서 돌려준 roles를 한글 표기로 변환하여 메시지 노출
      const rolesKR = Array.isArray(data.user?.roles)
        ? data.user.roles.map((r: string) => roleLabelKR(r)).join(", ")
        : roleLabelKR(role);

      setMsg(`계정이 생성되었습니다: ${data.user.email} (권한: ${rolesKR})`);

      // 입력 초기화
      setEmail("");
      setName("");
      setPassword("");
      setRole("MANAGER");
    } catch (e: any) {
      setErr(e?.message ?? "network_error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 520, margin: "0 auto" }}>
      <h1>관리자 계정 생성</h1>

      {/* 권한 가드 메시지 */}
      {checking && <p style={{ color: "#777" }}>권한 확인 중...</p>}
      {!checking && !isOwner && guardMsg && (
        <p style={{ color: "crimson", marginBottom: 12 }}>{guardMsg}</p>
      )}

      {/* 폼 */}
      <fieldset
        disabled={!isOwner}
        style={{ border: "none", padding: 0, margin: 0, opacity: isOwner ? 1 : 0.6 }}
      >
        {/* 이메일 */}
        <label style={{ display: "block", marginTop: 12 }}>이메일 *</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="manager@example.com"
          style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 8 }}
        />
        {email && !email.includes("@") && (
          <p style={{ color: "crimson", fontSize: 12, marginTop: 4 }}>
            올바른 이메일 형식을 입력해주세요.
          </p>
        )}

        {/* 이름 */}
        <label style={{ display: "block", marginTop: 12 }}>이름 *</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="홍길동"
          style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 8 }}
        />
        {name.trim().length === 0 && (
          <p style={{ color: "crimson", fontSize: 12, marginTop: 4 }}>
            이름을 입력해주세요.
          </p>
        )}

        {/* 비밀번호 */}
        <label style={{ display: "block", marginTop: 12 }}>비밀번호 *</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="8자 이상, 영문/숫자 포함"
          style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 8 }}
        />

        {/* 비밀번호 규칙 체크 */}
        <ul style={{ listStyle: "none", paddingLeft: 0, marginTop: 8, fontSize: 12 }}>
          <li style={{ color: pwState.lenOK ? "green" : "crimson" }}>
            {pwState.lenOK ? "✔" : "✘"} 8자 이상
          </li>
          <li style={{ color: pwState.hasLetter ? "green" : "crimson" }}>
            {pwState.hasLetter ? "✔" : "✘"} 영문 1자 이상 포함
          </li>
          <li style={{ color: pwState.hasDigit ? "green" : "crimson" }}>
            {pwState.hasDigit ? "✔" : "✘"} 숫자 1자 이상 포함
          </li>
        </ul>

        {/* 역할 */}
        <label style={{ display: "block", marginTop: 12 }}>역할 *</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as any)}
          style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 8 }}
        >
          <option value="OWNER">대표</option>
          <option value="MANAGER">운영자</option>
          <option value="STAFF">직원</option>
        </select>

        {/* 제출 버튼 */}
        <button
          disabled={!canSubmit}
          onClick={createUser}
          style={{
            marginTop: 16,
            width: "100%",
            padding: "10px 14px",
            borderRadius: 8,
            border: "none",
            background: canSubmit ? "black" : "#888",
            color: "white",
            cursor: canSubmit ? "pointer" : "not-allowed",
          }}
        >
          {loading ? "생성 중..." : "계정 생성"}
        </button>

        {/* 메시지 */}
        {msg && <p style={{ color: "green", marginTop: 12 }}>{msg}</p>}
        {err && <p style={{ color: "crimson", marginTop: 12 }}>오류: {err}</p>}
      </fieldset>
    </div>
  );
}

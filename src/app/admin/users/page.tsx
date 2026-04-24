// src/app/admin/users/page.tsx
// 관리자 계정 관리 페이지 (OWNER 전용 기능 포함: 비밀번호 변경 모달)
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminInnerTabs from "@/components/admin/AdminInnerTabs";
import { AdminButton } from "@/components/admin/AdminButton";

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

type UserItem = {
  id: string;
  email: string;
  name: string;
  roles: string[];
  status: "active" | "disabled";
};

export default function AdminUsersPage() {
  const [meRoles, setMeRoles] = useState<string[]>([]);
  const isOwner = useMemo(() => meRoles.includes("OWNER"), [meRoles]);

  const [loadingList, setLoadingList] = useState(true);
  const [rows, setRows] = useState<UserItem[]>([]);
  const [errList, setErrList] = useState<string | null>(null);

  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [targetUser, setTargetUser] = useState<UserItem | null>(null);
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const pwOk = useMemo(() => {
    const len = newPw.length >= 8;
    const letter = /[A-Za-z]/.test(newPw);
    const digit = /\d/.test(newPw);
    return len && letter && digit && newPw === newPw2;
  }, [newPw, newPw2]);

  useEffect(() => {
    (async () => {
      try {
        const meRes = await fetch("/api/auth/admin/me", { cache: "no-store" });
        const meData = await meRes.json();
        setMeRoles(meRes.ok && meData?.ok ? meData.user?.roles ?? [] : []);

        setLoadingList(true);
        setErrList(null);
        const r = await fetch("/api/admin/users/list", { cache: "no-store" });
        const data = await r.json();
        if (!r.ok || !data?.ok) throw new Error(data?.error || "list_failed");

        const mapped: UserItem[] = (Array.isArray(data.users)
          ? data.users
          : []
        ).map((u: any) => ({
          id: String(u.id ?? u._id),
          email: u.email,
          name: u.name,
          roles: Array.isArray(u.roles) ? u.roles : [],
          status: u.status === "disabled" ? "disabled" : "active",
        }));
        setRows(mapped);
      } catch (e: any) {
        setErrList(e?.message ?? "list_failed");
      } finally {
        setLoadingList(false);
      }
    })();
  }, []);

  function openPwModal(user: UserItem) {
    setTargetUser(user);
    setNewPw("");
    setNewPw2("");
    setErrMsg(null);
    setMsg(null);
    setPwModalOpen(true);
  }

  async function saveNewPassword() {
    if (!isOwner || !targetUser || !pwOk || savingPw) return;
    setSavingPw(true);
    setErrMsg(null);
    setMsg(null);
    try {
      const r = await fetch("/api/admin/users/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ userId: targetUser.id, newPassword: newPw }),
      });
      const data = await r.json();
      if (!r.ok || !data?.ok) {
        const e = data?.error || "reset_failed";
        if (e === "weak_password")
          setErrMsg(
            "비밀번호는 8자 이상이며, 영문과 숫자를 포함해야 합니다."
          );
        else if (e === "unauthenticated")
          setErrMsg("다시 로그인해주세요.");
        else if (e === "forbidden")
          setErrMsg("OWNER 권한이 필요합니다.");
        else if (e === "not_found")
          setErrMsg("해당 사용자를 찾을 수 없습니다.");
        else setErrMsg(e);
        return;
      }
      setMsg("비밀번호가 변경되었습니다. 해당 사용자는 다시 로그인해야 합니다.");
      setTimeout(() => setPwModalOpen(false), 900);
    } catch (e: any) {
      setErrMsg(e?.message ?? "network_error");
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <div>
      {/* 관리자 내부 탭 */}
      <AdminInnerTabs />

      {/* 상단 카드 헤더 */}
      <div
        className="admin-card"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 20 }}>관리자 계정 관리</h1>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 13,
              color: "#6b7280",
            }}
          >
            OWNER, 운영자, 직원 계정을 관리합니다.
          </p>
        </div>
        <Link
          href="/admin/users/new"
          className="admin-btn admin-btn-primary admin-btn-sm"
        >
          새 관리자 생성
        </Link>
      </div>

      {loadingList && (
        <p style={{ marginTop: 12, fontSize: 14, color: "#6b7280" }}>
          목록 불러오는 중...
        </p>
      )}
      {errList && (
        <p style={{ color: "#b91c1c", marginTop: 12, fontSize: 14 }}>
          오류: {errList}
        </p>
      )}

      {!loadingList && !errList && rows.length === 0 && (
        <div className="admin-card" style={{ marginTop: 12 }}>
          결과가 없습니다.
        </div>
      )}

      {!loadingList && !errList && rows.length > 0 && (
        <div className="admin-card" style={{ marginTop: 12, padding: 0 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>이름</th>
                <th>이메일</th>
                <th>권한</th>
                <th>상태</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    {(u.roles || []).map(roleLabelKR).join(", ") || "-"}
                  </td>
                  <td>
                    <span
                      className={
                        "admin-badge " +
                        (u.status === "active"
                          ? "admin-badge-success"
                          : "admin-badge-dim")
                      }
                    >
                      {u.status === "active" ? "활성" : "비활성"}
                    </span>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <AdminButton
                      variant="outline"
                      size="sm"
                      onClick={() => openPwModal(u)}
                      disabled={!isOwner}
                      title={isOwner ? "비밀번호 변경" : "OWNER만 가능"}
                      style={{
                        marginRight: 8,
                        opacity: isOwner ? 1 : 0.6,
                      }}
                    >
                      비밀번호 변경
                    </AdminButton>
                    {/* (추가 예정) 역할 변경 / 활성/비활성 토글 */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 비밀번호 변경 모달 */}
      {pwModalOpen && targetUser && (
        <div
          className="modal-backdrop"
          onClick={() => setPwModalOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 40,
          }}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 420,
              background: "#fff",
              borderRadius: 16,
              padding: 18,
              boxShadow: "0 20px 40px rgba(15,23,42,0.25)",
            }}
          >
            <h3 style={{ marginBottom: 6, fontSize: 18 }}>비밀번호 변경</h3>
            <p
              style={{
                marginTop: 0,
                marginBottom: 12,
                fontSize: 13,
                color: "#6b7280",
              }}
            >
              대상: <b>{targetUser.name}</b> ({targetUser.email})
            </p>

            <label style={{ fontSize: 13 }}>새 비밀번호</label>
            <input
              type="password"
              value={newPw}
              onChange={(e) => {
                setNewPw(e.target.value);
                setErrMsg(null);
                setMsg(null);
              }}
              placeholder="8자 이상, 영문/숫자 포함"
              style={{
                width: "100%",
                marginTop: 4,
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                fontSize: 14,
              }}
            />
            <label style={{ marginTop: 8, fontSize: 13 }}>새 비밀번호 확인</label>
            <input
              type="password"
              value={newPw2}
              onChange={(e) => {
                setNewPw2(e.target.value);
                setErrMsg(null);
                setMsg(null);
              }}
              placeholder="다시 입력"
              style={{
                width: "100%",
                marginTop: 4,
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                fontSize: 14,
              }}
            />

            <ul
              style={{
                listStyle: "none",
                paddingLeft: 0,
                marginTop: 8,
                fontSize: 12,
              }}
            >
              <li
                style={{
                  color: newPw.length >= 8 ? "#16a34a" : "#b91c1c",
                }}
              >
                {newPw.length >= 8 ? "✔" : "✘"} 8자 이상
              </li>
              <li
                style={{
                  color: /[A-Za-z]/.test(newPw) ? "#16a34a" : "#b91c1c",
                }}
              >
                {/[A-Za-z]/.test(newPw) ? "✔" : "✘"} 영문 포함
              </li>
              <li
                style={{
                  color: /\d/.test(newPw) ? "#16a34a" : "#b91c1c",
                }}
              >
                {/\d/.test(newPw) ? "✔" : "✘"} 숫자 포함
              </li>
              <li
                style={{
                  color:
                    newPw && newPw2 && newPw === newPw2
                      ? "#16a34a"
                      : "#b91c1c",
                }}
              >
                {newPw && newPw2 && newPw === newPw2 ? "✔" : "✘"} 비밀번호 일치
              </li>
            </ul>

            {msg && (
              <p style={{ color: "#16a34a", marginTop: 8, fontSize: 13 }}>
                {msg}
              </p>
            )}
            {errMsg && (
              <p style={{ color: "#b91c1c", marginTop: 8, fontSize: 13 }}>
                오류: {errMsg}
              </p>
            )}

            <div
              style={{
                height: 1,
                background: "#e5e7eb",
                margin: "14px 0 10px",
              }}
            />

            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
              }}
            >
              <AdminButton
                variant="ghost"
                size="sm"
                onClick={() => setPwModalOpen(false)}
              >
                닫기
              </AdminButton>
              <AdminButton
                variant="primary"
                size="sm"
                onClick={saveNewPassword}
                disabled={!isOwner || !pwOk || savingPw}
                style={{
                  opacity: !isOwner || !pwOk || savingPw ? 0.7 : 1,
                }}
              >
                {savingPw ? "저장 중..." : "변경 저장"}
              </AdminButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

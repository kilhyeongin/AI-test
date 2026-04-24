"use client";

import "@/app/(styles)/checklist-layout.css";
import { useEffect, useMemo, useState } from "react";
import AdminInnerTabs from "@/components/admin/AdminInnerTabs";

type Persona = "admin" | "customer" | "land";
type Action = "login_success" | "login_fail" | "logout";

type AuthLogItem = {
  _id?: string;
  ts?: string;
  persona: Persona;
  action: Action;
  identifier?: string;
  userId?: string;
  ip?: string;
  ua?: string;
  reason?: string;
};

type ThrottleStatusItem = {
  key: string;
  failCount: number;
  firstFailAt: string | null;
  lockedUntil: string | null;
  locked: boolean;
  updatedAt: string | null;
};

type Summary = {
  ok: boolean;
  hours: number;
  since: string;
  counts: Record<Action, number>;
  byPersona: Record<Persona, { login_success: number; login_fail: number }>;
  topIpsFail: { ip: string; n: number }[];
  topIdsFail: { identifier: string; n: number }[];
};

function fmt(ts?: string | null) {
  if (!ts) return "-";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts);
  return d.toLocaleString();
}

function CardStat({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        padding: 14,
        background: "#fff",
      }}
    >
      <div style={{ fontSize: 13, color: "#6b7280" }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 900, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

export default function AdminAuthLogsPage() {
  // ===== Summary =====
  const [sumHours, setSumHours] = useState(24);
  const [sumPersona, setSumPersona] = useState<"" | Persona>("");
  const [sumLoading, setSumLoading] = useState(false);
  const [sumErr, setSumErr] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);

  async function loadSummary() {
    setSumLoading(true);
    setSumErr(null);
    try {
      const sp = new URLSearchParams();
      sp.set("hours", String(sumHours));
      if (sumPersona) sp.set("persona", sumPersona);

      const r = await fetch(`/api/admin/auth-logs/summary?${sp.toString()}`, {
        cache: "no-store",
        credentials: "include",
      });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.ok) {
        setSumErr(d?.error || "summary_failed");
        setSummary(null);
        return;
      }
      setSummary(d as Summary);
    } catch (e: any) {
      setSumErr(e?.message || "network_error");
      setSummary(null);
    } finally {
      setSumLoading(false);
    }
  }

  // ===== AuthLog list =====
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<AuthLogItem[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [persona, setPersona] = useState<"" | Persona>("");
  const [action, setAction] = useState<"" | Action>("");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(100);

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    if (persona) sp.set("persona", persona);
    if (action) sp.set("action", action);
    if (q.trim()) sp.set("q", q.trim());
    sp.set("limit", String(limit));
    return sp.toString();
  }, [persona, action, q, limit]);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`/api/admin/auth-logs/list?${queryString}`, {
        cache: "no-store",
        credentials: "include",
      });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.ok) {
        setErr(d?.error || "load_failed");
        setItems([]);
        return;
      }
      setItems(Array.isArray(d.items) ? d.items : []);
    } catch (e: any) {
      setErr(e?.message || "network_error");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  // ===== Throttle reset/status =====
  const [resetPersona, setResetPersona] = useState<Persona>("customer");
  const [identifierLower, setIdentifierLower] = useState("");
  const [ip, setIp] = useState("");
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [resetErr, setResetErr] = useState<string | null>(null);
  const [resetBusy, setResetBusy] = useState(false);

  async function resetThrottle(mode: "account" | "ip" | "both") {
    setResetBusy(true);
    setResetMsg(null);
    setResetErr(null);

    try {
      const payload: any = { persona: resetPersona, mode };
      if (mode === "account" || mode === "both") payload.identifierLower = identifierLower.trim().toLowerCase();
      if (mode === "ip" || mode === "both") payload.ip = ip.trim();

      const r = await fetch("/api/admin/auth-throttle/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.ok) {
        setResetErr(d?.error || "reset_failed");
        return;
      }

      setResetMsg(`잠금 해제 완료 (deleted=${d.deleted})`);
      // 해제 후 요약/상태도 갱신
      loadSummary().catch(() => {});
    } catch (e: any) {
      setResetErr(e?.message || "network_error");
    } finally {
      setResetBusy(false);
    }
  }

  const [statusBusy, setStatusBusy] = useState(false);
  const [statusErr, setStatusErr] = useState<string | null>(null);
  const [statusItems, setStatusItems] = useState<ThrottleStatusItem[]>([]);

  async function checkStatus(mode: "account" | "ip" | "both") {
    setStatusBusy(true);
    setStatusErr(null);
    setStatusItems([]);

    try {
      const sp = new URLSearchParams();
      sp.set("persona", resetPersona);
      sp.set("mode", mode);
      if (mode === "account" || mode === "both") sp.set("identifierLower", identifierLower.trim().toLowerCase());
      if (mode === "ip" || mode === "both") sp.set("ip", ip.trim());

      const r = await fetch(`/api/admin/auth-throttle/status?${sp.toString()}`, {
        cache: "no-store",
        credentials: "include",
      });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.ok) {
        setStatusErr(d?.error || "status_failed");
        return;
      }
      setStatusItems(Array.isArray(d.items) ? d.items : []);
    } catch (e: any) {
      setStatusErr(e?.message || "network_error");
    } finally {
      setStatusBusy(false);
    }
  }

  useEffect(() => {
    loadSummary();
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="page">
      <div className="wrap">
        <AdminInnerTabs />

        <header className="hero">
          <div className="hero-main">보안 로그 / 잠금 관리</div>
          <div className="hero-sub">요약 통계 + 로그인 기록 + 잠금 상태 조회/해제</div>
        </header>

        {/* ===== 요약 통계 ===== */}
        <section className="card" style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ fontWeight: 900 }}>요약(최근 {sumHours}시간)</div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <select
                value={sumPersona}
                onChange={(e) => setSumPersona(e.target.value as any)}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
              >
                <option value="">(전체 persona)</option>
                <option value="admin">admin</option>
                <option value="customer">customer</option>
                <option value="land">land</option>
              </select>

              <input
                type="number"
                min={1}
                max={168}
                value={sumHours}
                onChange={(e) => setSumHours(Number(e.target.value))}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb", width: 110 }}
              />

              <button className="btn outline-black" onClick={loadSummary} disabled={sumLoading}>
                {sumLoading ? "갱신 중…" : "요약 갱신"}
              </button>
            </div>
          </div>

          {sumErr && <div style={{ marginTop: 10, color: "#dc2626" }}>요약 오류: {sumErr}</div>}

          {summary && (
            <>
              <div style={{ marginTop: 10, fontSize: 12, color: "#6b7280" }}>
                기준 시각: {fmt(summary.since)} 이후
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, minmax(180px, 1fr))",
                  gap: 10,
                  marginTop: 12,
                }}
              >
                <CardStat title="로그인 성공" value={String(summary.counts.login_success)} />
                <CardStat title="로그인 실패" value={String(summary.counts.login_fail)} />
                <CardStat title="로그아웃" value={String(summary.counts.logout)} />
                <CardStat
                  title="실패율"
                  value={
                    summary.counts.login_success + summary.counts.login_fail === 0
                      ? "0%"
                      : `${Math.round(
                          (summary.counts.login_fail * 100) /
                            (summary.counts.login_success + summary.counts.login_fail)
                        )}%`
                  }
                  sub="(실패 / (성공+실패))"
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginTop: 14,
                }}
              >
                <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, padding: 12 }}>
                  <div style={{ fontWeight: 900, marginBottom: 8 }}>실패 TOP IP</div>
                  {summary.topIpsFail.length === 0 ? (
                    <div style={{ color: "#6b7280" }}>데이터 없음</div>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ textAlign: "left" }}>
                          <th style={{ fontSize: 12, color: "#6b7280", padding: "6px 4px" }}>IP</th>
                          <th style={{ fontSize: 12, color: "#6b7280", padding: "6px 4px" }}>횟수</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.topIpsFail.map((r) => (
                          <tr key={r.ip}>
                            <td style={{ padding: "6px 4px", borderTop: "1px solid #f1f5f9" }}>{r.ip}</td>
                            <td style={{ padding: "6px 4px", borderTop: "1px solid #f1f5f9" }}>{r.n}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, padding: 12 }}>
                  <div style={{ fontWeight: 900, marginBottom: 8 }}>실패 TOP Identifier</div>
                  {summary.topIdsFail.length === 0 ? (
                    <div style={{ color: "#6b7280" }}>데이터 없음</div>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ textAlign: "left" }}>
                          <th style={{ fontSize: 12, color: "#6b7280", padding: "6px 4px" }}>identifier</th>
                          <th style={{ fontSize: 12, color: "#6b7280", padding: "6px 4px" }}>횟수</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.topIdsFail.map((r) => (
                          <tr key={r.identifier}>
                            <td style={{ padding: "6px 4px", borderTop: "1px solid #f1f5f9" }}>
                              {r.identifier}
                            </td>
                            <td style={{ padding: "6px 4px", borderTop: "1px solid #f1f5f9" }}>{r.n}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          )}
        </section>

        {/* ===== AuthLog 필터 ===== */}
        <section className="card" style={{ marginTop: 16 }}>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr 120px", gap: 10 }}>
              <select
                value={persona}
                onChange={(e) => setPersona(e.target.value as any)}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
              >
                <option value="">(전체 persona)</option>
                <option value="admin">admin</option>
                <option value="customer">customer</option>
                <option value="land">land</option>
              </select>

              <select
                value={action}
                onChange={(e) => setAction(e.target.value as any)}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
              >
                <option value="">(전체 action)</option>
                <option value="login_success">login_success</option>
                <option value="login_fail">login_fail</option>
                <option value="logout">logout</option>
              </select>

              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="검색: identifier/userId/ip"
                style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
              />

              <input
                type="number"
                value={limit}
                min={10}
                max={200}
                onChange={(e) => setLimit(Number(e.target.value))}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
              />
            </div>

            <div className="actions" style={{ justifyContent: "flex-end" }}>
              <button className="btn outline-black" onClick={load} disabled={loading}>
                {loading ? "불러오는 중…" : "조회"}
              </button>
            </div>

            {err && <div style={{ color: "#dc2626" }}>오류: {err}</div>}
          </div>
        </section>

        {/* ===== AuthLog 테이블 ===== */}
        <section className="card" style={{ marginTop: 16, overflowX: "auto" }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>AuthLog</div>

          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                {["시간", "persona", "action", "identifier", "userId", "ip", "reason"].map((h) => (
                  <th
                    key={h}
                    style={{
                      borderBottom: "1px solid #e5e7eb",
                      padding: "10px 8px",
                      fontSize: 13,
                      color: "#374151",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 12, color: "#6b7280" }}>
                    로그가 없습니다.
                  </td>
                </tr>
              ) : (
                items.map((it, idx) => (
                  <tr key={it._id || String(idx)}>
                    <td style={{ borderBottom: "1px solid #f1f5f9", padding: "10px 8px", fontSize: 13 }}>
                      {fmt(it.ts)}
                    </td>
                    <td style={{ borderBottom: "1px solid #f1f5f9", padding: "10px 8px", fontSize: 13 }}>
                      {it.persona}
                    </td>
                    <td style={{ borderBottom: "1px solid #f1f5f9", padding: "10px 8px", fontSize: 13 }}>
                      {it.action}
                    </td>
                    <td style={{ borderBottom: "1px solid #f1f5f9", padding: "10px 8px", fontSize: 13 }}>
                      {it.identifier || "-"}
                    </td>
                    <td style={{ borderBottom: "1px solid #f1f5f9", padding: "10px 8px", fontSize: 13 }}>
                      {it.userId || "-"}
                    </td>
                    <td style={{ borderBottom: "1px solid #f1f5f9", padding: "10px 8px", fontSize: 13 }}>
                      {it.ip || "-"}
                    </td>
                    <td style={{ borderBottom: "1px solid #f1f5f9", padding: "10px 8px", fontSize: 13 }}>
                      {it.reason || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        {/* ===== 잠금 상태 조회 + 잠금 해제 ===== */}
        <section className="card" style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>잠금 상태 조회 / 잠금 해제</div>

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 1fr", gap: 10 }}>
              <select
                value={resetPersona}
                onChange={(e) => setResetPersona(e.target.value as Persona)}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
              >
                <option value="admin">admin</option>
                <option value="customer">customer</option>
                <option value="land">land</option>
              </select>

              <input
                value={identifierLower}
                onChange={(e) => setIdentifierLower(e.target.value)}
                placeholder="identifierLower (예: emailLower / loginIdLower)"
                style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
              />

              <input
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                placeholder="IP (예: 1.2.3.4)"
                style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
              />
            </div>

            <div className="actions" style={{ gap: 8, justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn outline-black" disabled={statusBusy} onClick={() => checkStatus("account")}>
                  상태(계정)
                </button>
                <button className="btn outline-black" disabled={statusBusy} onClick={() => checkStatus("ip")}>
                  상태(IP)
                </button>
                <button className="btn outline-black" disabled={statusBusy} onClick={() => checkStatus("both")}>
                  상태(둘 다)
                </button>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn outline-black" disabled={resetBusy} onClick={() => resetThrottle("account")}>
                  해제(계정)
                </button>
                <button className="btn outline-black" disabled={resetBusy} onClick={() => resetThrottle("ip")}>
                  해제(IP)
                </button>
                <button className="btn black" disabled={resetBusy} onClick={() => resetThrottle("both")}>
                  둘 다 해제
                </button>
              </div>
            </div>

            {statusErr && <div style={{ color: "#dc2626" }}>상태 조회 오류: {statusErr}</div>}
            {statusItems.length > 0 && (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 780 }}>
                  <thead>
                    <tr style={{ textAlign: "left" }}>
                      {["key", "failCount", "locked", "lockedUntil", "updatedAt"].map((h) => (
                        <th
                          key={h}
                          style={{
                            borderBottom: "1px solid #e5e7eb",
                            padding: "10px 8px",
                            fontSize: 13,
                            color: "#374151",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {statusItems.map((s) => (
                      <tr key={s.key}>
                        <td style={{ borderBottom: "1px solid #f1f5f9", padding: "10px 8px", fontSize: 13 }}>
                          {s.key}
                        </td>
                        <td style={{ borderBottom: "1px solid #f1f5f9", padding: "10px 8px", fontSize: 13 }}>
                          {s.failCount}
                        </td>
                        <td style={{ borderBottom: "1px solid #f1f5f9", padding: "10px 8px", fontSize: 13 }}>
                          {s.locked ? "YES" : "NO"}
                        </td>
                        <td style={{ borderBottom: "1px solid #f1f5f9", padding: "10px 8px", fontSize: 13 }}>
                          {fmt(s.lockedUntil)}
                        </td>
                        <td style={{ borderBottom: "1px solid #f1f5f9", padding: "10px 8px", fontSize: 13 }}>
                          {fmt(s.updatedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {resetMsg && <div style={{ color: "#16a34a" }}>{resetMsg}</div>}
            {resetErr && <div style={{ color: "#dc2626" }}>해제 오류: {resetErr}</div>}
          </div>
        </section>
      </div>
    </div>
  );
}

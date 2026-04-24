// 고객 회원가입 페이지 (회원가입 후 로그인 페이지로 이동)
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import "@/app/customer/customer.css";
import Link from "next/link";

export default function CustomerRegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const pwOK = pw.length >= 8;
  const canSubmit = name && email && pwOK && pw === pw2 && !loading;

  async function register() {
    if (!canSubmit) return;
    setLoading(true); setErr(null); setMsg(null);
    try {
      const r = await fetch("/api/auth/customer/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password: pw }),
      });
      const data = await r.json();
      if (!r.ok || !data?.ok) {
        const e = data?.error || "register_failed";
        setErr(e === "email_exists" ? "이미 가입된 이메일입니다." :
               e === "weak_password" ? "비밀번호는 8자 이상 입력하세요." : e);
        return;
      }
      setMsg("회원가입이 완료되었습니다. 로그인 해주세요.");
      setTimeout(()=>router.replace("/customer/login"), 800);
    } catch (e:any) { setErr(e?.message ?? "network_error"); }
    finally { setLoading(false); }
  }

  return (
    <div className="cl-shell">
      <div className="cl-card">
        <div className="cl-logo"><div className="cl-logo-mark" /><div className="cl-logo-text">TECHFOREST</div></div>
        <input className="cl-input" placeholder="이름" value={name} onChange={e=>setName(e.target.value)} />
        <div className="cl-gap" />
        <input className="cl-input" placeholder="이메일(아이디)" value={email} onChange={e=>setEmail(e.target.value)} />
        <div className="cl-gap" />
        <input className="cl-input" type="password" placeholder="비밀번호 (8자 이상)" value={pw} onChange={e=>setPw(e.target.value)} />
        <div className="cl-gap" />
        <input className="cl-input" type="password" placeholder="비밀번호 확인" value={pw2} onChange={e=>setPw2(e.target.value)} />
        {pw && pw2 && pw !== pw2 && (
          <p style={{ color:"#ef4444", fontSize:12, marginTop:6 }}>비밀번호가 일치하지 않습니다.</p>
        )}
        {err && <p style={{ color:"#ef4444", marginTop:10 }}>{err}</p>}
        {msg && <p style={{ color:"#16a34a", marginTop:10 }}>{msg}</p>}
        <div className="cl-gap" />
        <button className="cl-btn" disabled={!canSubmit} onClick={register}>
          {loading ? "가입 중..." : "회원가입"}
        </button>
        <div className="cl-links" style={{ marginTop:12 }}>
          <span>이미 계정이 있나요?</span>
          <Link href="/customer/login" style={{ marginLeft:6 }}>로그인</Link>
        </div>
      </div>
    </div>
  );
}

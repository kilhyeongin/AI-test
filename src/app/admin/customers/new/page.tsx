// 관리자: 고객 생성 폼 (응답 JSON 안전 파싱 포함)
"use client";
import { useState } from "react";

export default function AdminCreateCustomerPage() {
  const [email, setEmail] = useState("");
  const [name, setName]   = useState("");
  const [pw, setPw]       = useState("");
  const [msg, setMsg]     = useState<string | null>(null);
  const [err, setErr]     = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true); setMsg(null); setErr(null);
    try {
      const r = await fetch("/api/admin/customers/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password: pw }),
      });

      // ✅ 응답이 JSON인지 먼저 확인
      const ct = r.headers.get("content-type") || "";
      let data: any = null;
      if (ct.includes("application/json")) {
        data = await r.json();
      } else {
        const txt = await r.text(); // 디버그 도움
        setErr(`non_json_response_${r.status}: ${txt.slice(0,150)}...`);
        return;
      }

      if (!r.ok || !data?.ok) {
        setErr(data?.error || `create_failed_${r.status}`);
        return;
      }

      setMsg(`고객 생성 완료: ${email}`);
      setEmail(""); setName(""); setPw("");
    } catch (e:any) {
      setErr(e?.message ?? "network_error");
    } finally {
      setLoading(false);
    }
  }

  const can = !!email && !!pw && !loading;

  return (
    <div style={{ padding:24, maxWidth:520, margin:"0 auto" }}>
      <h1>고객 생성</h1>

      <label style={{display:"block", marginTop:10}}>이메일</label>
      <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="user@example.com"
             style={{width:"100%", padding:10, border:"1px solid #ddd", borderRadius:8}} />

      <label style={{display:"block", marginTop:10}}>이름</label>
      <input value={name} onChange={e=>setName(e.target.value)} placeholder="홍길동"
             style={{width:"100%", padding:10, border:"1px solid #ddd", borderRadius:8}} />

      <label style={{display:"block", marginTop:10}}>임시 비밀번호</label>
      <input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="임시 비밀번호"
             style={{width:"100%", padding:10, border:"1px solid #ddd", borderRadius:8}} />

      {err && <p style={{color:"crimson", marginTop:10, whiteSpace:"pre-wrap"}}>오류: {err}</p>}
      {msg && <p style={{color:"#0a7", marginTop:10}}>{msg}</p>}

      <button onClick={submit} disabled={!can}
              style={{marginTop:14, padding:"10px 14px", border:"none", borderRadius:8,
                      background: can ? "#111" : "#aaa", color:"#fff", cursor: can ? "pointer":"not-allowed", width:"100%"}}>
        {loading ? "생성 중..." : "고객 생성"}
      </button>
    </div>
  );
}

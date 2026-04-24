// /src/app/admin/customers/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Item = {
  id: string;
  name: string;
  email?: string;
};

export default function AdminCustomersPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(
        `/api/admin/customers/list?q=${encodeURIComponent(q)}&sort=recent`,
        { cache: "no-store" }
      );
      const data = await r.json();
      if (!r.ok || !data?.ok) throw new Error(data?.error || "failed");

      const mapped: Item[] = (data.items || []).map((c: any) => ({
        id: String(c.id),
        name: c.name || "이름없음",
        email: c.email || "",
      }));
      setItems(mapped);
    } catch (e: any) {
      setErr(e?.message ?? "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    load();
  }

  return (
    <div className="wrap">
      <header className="hd">
        <button
          className="back"
          onClick={() => router.push("/admin/dashboard")}
        >
          ←
        </button>
        <h1>고객 관리</h1>
        <Link
          href="/admin/customers/new"
          className="add"
          aria-label="새 고객 추가"
        >
          ＋
        </Link>
      </header>

      {/* 검색바 */}
      <form className="searchbar" onSubmit={onSearch}>
        <span className="icon">🔍</span>
        <input
          placeholder="이름 또는 이메일로 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="search-btn" type="submit">
          검색
        </button>
      </form>

      {loading && <p className="muted">불러오는 중...</p>}
      {err && <p className="err">오류: {err}</p>}
      {!loading && !err && items.length === 0 && (
        <p className="muted">고객이 없습니다.</p>
      )}

      <ul className="list">
        {items.map((c) => (
          <li key={c.id} className="card">
            <div className="info">
              <div className="name">{c.name}</div>
              {c.email && <div className="email">{c.email}</div>}
            </div>
            <div className="side">
              {/* ✅ 여기서 목록 페이지로 이동 */}
              <Link
                className="btn primary"
                href={`/admin/customers/${c.id}/checklist/list`}
              >
                관리
              </Link>
            </div>
          </li>
        ))}
      </ul>

      <style jsx>{`
        :root {
          --ink: #0f172a;
          --mut: #64748b;
          --line: #e5e7eb;
          --bg: #f5f6fa;
          --panel: #fff;
          --shadow: 0 8px 20px rgba(0, 0, 0, 0.05);
          --blue: #3b82f6;
        }
        .wrap {
          max-width: 780px;
          margin: 0 auto;
          padding: 16px;
          color: var(--ink);
        }
        .hd {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .hd h1 {
          font-size: 18px;
          margin: 0;
        }
        .back,
        .add {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1px solid var(--line);
          background: #fff;
        }
        .add {
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          color: #111;
          font-size: 20px;
        }

        .searchbar {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 10px 12px;
          box-shadow: var(--shadow);
          margin-bottom: 12px;
        }
        .searchbar input {
          border: none;
          outline: none;
          flex: 1;
          font-size: 14px;
        }
        .search-btn {
          border: 1px solid var(--line);
          background: #fff;
          border-radius: 10px;
          padding: 8px 12px;
          cursor: pointer;
        }

        .list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .card {
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 12px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: var(--shadow);
        }
        .info .name {
          font-weight: 800;
          margin-bottom: 4px;
        }
        .info .email {
          font-size: 13px;
          color: var(--mut);
        }
        .side {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .btn {
          border-radius: 10px;
          padding: 6px 12px;
          cursor: pointer;
          border: 1px solid var(--line);
          background: #fff;
          font-size: 14px;
          text-decoration: none;
        }
        .btn.primary {
          background: var(--blue);
          color: #fff;
          border: none;
        }
        .muted {
          color: var(--mut);
          margin-top: 8px;
        }
        .err {
          color: #dc2626;
          margin-top: 8px;
        }
      `}</style>
    </div>
  );
}

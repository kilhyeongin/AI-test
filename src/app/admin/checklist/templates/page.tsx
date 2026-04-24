// /src/app/admin/checklist/templates/page.tsx
// 관리자용 체크리스트 템플릿 목록 페이지

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ChecklistTemplateSummary = {
  id: string;
  name: string;
  description?: string;
  items: {
    key: string;
    title: string;
  }[];
  createdAt?: string;
};

export default function AdminChecklistTemplateListPage() {
  const [templates, setTemplates] = useState<ChecklistTemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setErr(null);

      const r = await fetch("/api/admin/checklist-templates", {
        cache: "no-store",
      });

      const data = await r.json().catch(() => null);
      if (!r.ok || !data?.ok)
        throw new Error(data?.error || "템플릿 목록 조회 실패");

      setTemplates(data.templates || []);
    } catch (e: any) {
      setErr(e.message || "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="tpl-wrap">
      <header className="tpl-head">
        <div className="tpl-head-left">
          <h1 className="tpl-title">체크리스트 템플릿 관리</h1>
          <p className="tpl-desc">
            자주 사용하는 체크리스트 조합을 템플릿으로 등록해 두고, 고객별
            체크리스트 생성 시 선택해서 사용할 수 있습니다.
          </p>
        </div>

        <Link href="/admin/checklist/templates/new" className="btn black tpl-create">
          + 새 템플릿 만들기
        </Link>
      </header>

      <section className="tpl-panel">
        {loading && <p className="tpl-muted">템플릿 불러오는 중...</p>}

        {err && !loading && <p className="tpl-error">오류: {err}</p>}

        {!loading && !err && templates.length === 0 && (
          <p className="tpl-muted">
            아직 등록된 템플릿이 없습니다. 상단의 &quot;새 템플릿 만들기&quot;를 눌러
            첫 템플릿을 생성해 주세요.
          </p>
        )}

        {!loading && !err && templates.length > 0 && (
          <ul className="tpl-list">
            {templates.map((tpl) => {
              const created =
                tpl.createdAt &&
                new Date(tpl.createdAt).toLocaleDateString("ko-KR", {
                  year: "2-digit",
                  month: "2-digit",
                  day: "2-digit",
                });

              return (
                <li key={tpl.id} className="tpl-card">
                  {/* 상단(좌: 텍스트, 우: 메타) */}
                  <div className="tpl-card-top">
                    <div className="tpl-main">
                      <div className="tpl-name">
                        <Link
                          href={`/admin/checklist/templates/${tpl.id}`}
                          className="tpl-name-link"
                        >
                          {tpl.name}
                        </Link>
                      </div>

                      {tpl.description && (
                        <div className="tpl-sub">{tpl.description}</div>
                      )}

                      <div className="tpl-chips">
                        {tpl.items.slice(0, 6).map((item) => (
                          <span key={item.key} className="tpl-chip">
                            {item.title}
                          </span>
                        ))}

                        {tpl.items.length > 6 && (
                          <span className="tpl-chip-more">
                            + {tpl.items.length - 6}개 더
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="tpl-meta">
                      <div className="tpl-meta-row">
                        <span className="tpl-meta-label">항목수</span>
                        <span className="tpl-meta-val">{tpl.items.length}</span>
                      </div>
                      {created && (
                        <div className="tpl-meta-row">
                          <span className="tpl-meta-label">생성일</span>
                          <span className="tpl-meta-val">{created}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 하단: 우측 버튼 (모바일에서도 안정적으로 보이게 분리) */}
                  <div className="tpl-card-bottom">
                    <Link
                      href={`/admin/checklist/templates/${tpl.id}`}
                      className="btn line tpl-detail"
                    >
                      상세 보기
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ✅ 기존 틀 유지: btn/black/line은 전역 사용, 여기서는 레이아웃만 다듬음 */}
      <style jsx>{`
        .tpl-wrap {
          max-width: 960px;
          margin: 0 auto;
          padding: clamp(14px, 2.6vw, 24px);
        }

        .tpl-head {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 12px;
          align-items: start;
          margin-bottom: 16px;
        }

        .tpl-title {
          margin: 0;
          font-size: clamp(18px, 2.2vw, 22px);
          font-weight: 800;
          letter-spacing: -0.02em;
        }

        .tpl-desc {
          margin: 6px 0 0;
          font-size: 13px;
          color: #6b7280;
          line-height: 1.45;
        }

        .tpl-create {
          align-self: start;
          white-space: nowrap;
        }

        .tpl-panel {
          background: #ffffff;
          border-radius: 18px;
          border: 1px solid #e5e7eb;
          padding: clamp(14px, 2.2vw, 20px);
        }

        .tpl-muted {
          font-size: 13px;
          color: #6b7280;
          margin: 0;
        }

        .tpl-error {
          font-size: 13px;
          color: #b91c1c;
          margin: 0;
        }

        .tpl-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .tpl-card {
          border-radius: 14px;
          border: 1px solid #e5e7eb;
          background: #f9fafb;
          padding: 14px 16px;
        }

        .tpl-card-top {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 14px;
          align-items: start;
        }

        .tpl-main {
          min-width: 0; /* ✅ 긴 텍스트 깨짐 방지 */
        }

        .tpl-name {
          font-size: 15px;
          font-weight: 750;
          margin-bottom: 4px;
          line-height: 1.25;
          overflow-wrap: anywhere; /* ✅ 아주 긴 텍스트도 깨짐 방지 */
        }

        .tpl-name-link {
          text-decoration: none;
          color: #111827;
        }

        .tpl-sub {
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 8px;
          line-height: 1.35;
        }

        .tpl-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          min-width: 0;
        }

        .tpl-chip,
        .tpl-chip-more {
          display: inline-flex;
          align-items: center;
          padding: 3px 9px;
          border-radius: 999px;
          font-size: 12px;
          line-height: 1.1;
          border: 1px solid #d1d5db;
          background: #ffffff;
          color: #374151;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .tpl-chip-more {
          border-style: dashed;
          background: #f3f4f6;
          color: #4b5563;
        }

        .tpl-meta {
          min-width: 140px;
          text-align: right;
          font-size: 11px;
          color: #6b7280;
          display: flex;
          flex-direction: column;
          gap: 6px;
          align-items: flex-end;
          white-space: nowrap;
        }

        .tpl-meta-row {
          display: inline-flex;
          gap: 8px;
          align-items: baseline;
        }

        .tpl-meta-label {
          color: #6b7280;
        }

        .tpl-meta-val {
          font-weight: 600;
          color: #374151;
        }

        .tpl-card-bottom {
          display: flex;
          justify-content: flex-end;
          margin-top: 10px;
        }

        .tpl-detail {
          white-space: nowrap;
        }

        /* ===== Mobile ===== */
        @media (max-width: 720px) {
          .tpl-head {
            grid-template-columns: 1fr;
          }

          .tpl-create {
            justify-self: end;
          }

          .tpl-card-top {
            grid-template-columns: 1fr; /* ✅ 메타를 아래로 내림 */
          }

          .tpl-meta {
            width: 100%;
            min-width: 0;
            flex-direction: row;
            justify-content: flex-start;
            align-items: center;
            gap: 12px;
            text-align: left;
            white-space: normal;
          }

          .tpl-meta-row {
            gap: 6px;
          }

          .tpl-card-bottom {
            justify-content: flex-end;
          }
        }

        @media (max-width: 420px) {
          .tpl-card {
            padding: 12px 14px;
          }

          .tpl-name {
            font-size: 14px;
          }

          .tpl-chip,
          .tpl-chip-more {
            font-size: 11.5px;
            padding: 3px 8px;
          }
        }
      `}</style>
    </div>
  );
}

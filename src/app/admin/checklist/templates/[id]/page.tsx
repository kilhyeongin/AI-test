// /src/app/admin/checklist/templates/[id]/page.tsx
// 관리자용 체크리스트 템플릿 상세 / 수정 / 삭제 페이지
// - 초기: 읽기 전용 상세 화면
// - "수정하기" 버튼 클릭 시 편집 모드로 전환

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type TemplateItem = {
  key: string;
  title: string;
  defaultRole: "admin" | "customer";
  defaultKind: "ADMIN_UPLOAD_VIEW" | "CLIENT_UPLOAD_REVIEW" | "PAYMENT_PIPELINE";
  area: "main" | "extra";
};

type TemplateDetail = {
  id: string;
  name: string;
  description: string;
  items: TemplateItem[];
  createdAt?: string;
};

export default function AdminChecklistTemplateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [tpl, setTpl] = useState<TemplateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // 편집 모드 여부
  const [editMode, setEditMode] = useState(false);

  // 폼 값 (편집 모드일 때 사용)
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<TemplateItem[]>([]);

  async function load() {
    try {
      setLoading(true);
      setErr(null);

      const r = await fetch(`/api/admin/checklist-templates/${id}`, {
        cache: "no-store",
      });
      const data = await r.json().catch(() => null);

      if (!r.ok || !data?.ok || !data.template) {
        throw new Error(data?.error || "템플릿 조회 실패");
      }

      const t = data.template as TemplateDetail;
      setTpl(t);

      // 폼 값 초기화
      setName(t.name || "");
      setDescription(t.description || "");
      setItems(t.items || []);
    } catch (e: any) {
      setErr(e.message || "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!id) return;
    load();
  }, [id]);

  // 항목 추가
  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        key: `item_${prev.length + 1}`,
        title: "",
        defaultRole: "admin",
        defaultKind: "ADMIN_UPLOAD_VIEW",
        area: "main",
      },
    ]);
  }

  // 항목 삭제
  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  // 항목 수정
  function updateItem<K extends keyof TemplateItem>(
    idx: number,
    field: K,
    value: TemplateItem[K]
  ) {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it))
    );
  }

  // 수정 저장
  async function handleSave() {
    if (!name.trim()) {
      alert("템플릿 이름을 입력해 주세요.");
      return;
    }
    if (!items.length) {
      alert("최소 1개 이상의 항목이 필요합니다.");
      return;
    }

    try {
      setSaving(true);
      setErr(null);

      const r = await fetch(`/api/admin/checklist-templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          items,
        }),
      });

      const data = await r.json().catch(() => null);
      if (!r.ok || !data?.ok) {
        throw new Error(data?.error || "저장 실패");
      }

      alert("템플릿이 저장되었습니다.");
      setEditMode(false);
      // 다시 로드해서 정규화된 값 반영
      load();
    } catch (e: any) {
      console.error(e);
      setErr(e.message || "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  // 수정 취소 (원래 상세 값으로 되돌리기)
  function handleCancelEdit() {
    if (!tpl) return;
    setName(tpl.name || "");
    setDescription(tpl.description || "");
    setItems(tpl.items || []);
    setEditMode(false);
  }

  // 삭제
  async function handleDelete() {
    if (!confirm("정말 이 템플릿을 삭제하시겠습니까?")) return;

    try {
      setDeleting(true);
      setErr(null);

      const r = await fetch(`/api/admin/checklist-templates/${id}`, {
        method: "DELETE",
      });

      const data = await r.json().catch(() => null);
      if (!r.ok || !data?.ok) {
        throw new Error(data?.error || "삭제 실패");
      }

      alert("템플릿이 삭제되었습니다.");
      router.push("/admin/checklist/templates");
    } catch (e: any) {
      console.error(e);
      setErr(e.message || "삭제 중 오류가 발생했습니다.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: 24,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>
            체크리스트 템플릿 {editMode ? "수정" : "상세"}
          </h1>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 13,
              color: "#6b7280",
            }}
          >
            {editMode
              ? "템플릿 이름, 설명, 항목 구성을 수정한 뒤 저장할 수 있습니다."
              : "템플릿 구성을 확인하고, 필요하다면 수정하기 버튼으로 편집할 수 있습니다."}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/admin/checklist/templates" className="btn line">
            목록으로
          </Link>

          {!loading && tpl && !editMode && (
            <button
              type="button"
              className="btn black"
              onClick={() => setEditMode(true)}
            >
              수정하기
            </button>
          )}
        </div>
      </header>

      <section
        style={{
          background: "#ffffff",
          borderRadius: 18,
          border: "1px solid #e5e7eb",
          padding: 20,
        }}
      >
        {loading && (
          <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
            템플릿 불러오는 중...
          </p>
        )}

        {err && !loading && (
          <p style={{ fontSize: 13, color: "#b91c1c", marginBottom: 12 }}>
            오류: {err}
          </p>
        )}

        {!loading && tpl && (
          <>
            {/* ----- 상세 보기 모드 ----- */}
            {!editMode && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      marginBottom: 4,
                    }}
                  >
                    템플릿 이름
                  </div>
                  <div style={{ fontSize: 15 }}>{tpl.name}</div>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      marginBottom: 4,
                    }}
                  >
                    설명
                  </div>
                  <div style={{ fontSize: 13, color: "#4b5563", whiteSpace: "pre-line" }}>
                    {tpl.description || "—"}
                  </div>
                </div>

                {tpl.createdAt && (
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    생성일:{" "}
                    {new Date(tpl.createdAt).toLocaleString("ko-KR", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                )}

                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 8,
                    }}
                  >
                    <h2
                      style={{
                        margin: 0,
                        fontSize: 15,
                        fontWeight: 700,
                      }}
                    >
                      템플릿 항목 ({tpl.items.length}개)
                    </h2>
                  </div>

                  {tpl.items.length === 0 && (
                    <p
                      style={{
                        fontSize: 13,
                        color: "#6b7280",
                        margin: "8px 0",
                      }}
                    >
                      등록된 항목이 없습니다.
                    </p>
                  )}

                  {tpl.items.length > 0 && (
                    <div
                      style={{
                        borderRadius: 12,
                        border: "1px solid #e5e7eb",
                        overflow: "hidden",
                      }}
                    >
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          fontSize: 13,
                        }}
                      >
                        <thead>
                          <tr
                            style={{
                              background: "#f3f4f6",
                              borderBottom: "1px solid #e5e7eb",
                            }}
                          >
                            <th
                              style={{
                                padding: "8px 10px",
                                textAlign: "left",
                                width: 40,
                              }}
                            >
                              #
                            </th>
                            <th
                              style={{
                                padding: "8px 10px",
                                textAlign: "left",
                              }}
                            >
                              제목
                            </th>
                            <th
                              style={{
                                padding: "8px 10px",
                                textAlign: "left",
                                width: 80,
                              }}
                            >
                              역할
                            </th>
                            <th
                              style={{
                                padding: "8px 10px",
                                textAlign: "left",
                                width: 120,
                              }}
                            >
                              종류
                            </th>
                            <th
                              style={{
                                padding: "8px 10px",
                                textAlign: "left",
                                width: 80,
                              }}
                            >
                              영역
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {tpl.items.map((item, idx) => (
                            <tr
                              key={idx}
                              style={{
                                borderBottom: "1px solid #e5e7eb",
                              }}
                            >
                              <td
                                style={{
                                  padding: "6px 10px",
                                  verticalAlign: "top",
                                }}
                              >
                                {idx + 1}
                              </td>
                              <td
                                style={{
                                  padding: "6px 10px",
                                }}
                              >
                                {item.title || <span style={{ color: "#9ca3af" }}>—</span>}
                              </td>
                              <td
                                style={{
                                  padding: "6px 10px",
                                }}
                              >
                                {item.defaultRole === "admin" ? "관리자" : "고객"}
                              </td>
                              <td
                                style={{
                                  padding: "6px 10px",
                                }}
                              >
                                {item.defaultKind === "ADMIN_UPLOAD_VIEW" &&
                                  "관리자 업로드 안내"}
                                {item.defaultKind === "CLIENT_UPLOAD_REVIEW" &&
                                  "고객 업로드 안내"}
                                {item.defaultKind === "PAYMENT_PIPELINE" &&
                                  "결제/정산 단계"}
                              </td>
                              <td
                                style={{
                                  padding: "6px 10px",
                                }}
                              >
                                {item.area === "main" ? "메인" : "추가"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div
                  style={{
                    marginTop: 20,
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 8,
                  }}
                >
                  <button
                    type="button"
                    className="btn outline-black"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? "삭제 중..." : "템플릿 삭제"}
                  </button>
                </div>
              </div>
            )}

            {/* ----- 수정 모드 ----- */}
            {editMode && (
              <>
                {/* 기본 정보 입력 */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 600,
                        marginBottom: 4,
                      }}
                    >
                      템플릿 이름
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      style={{
                        width: "100%",
                        borderRadius: 8,
                        border: "1px solid #d1d5db",
                        padding: "8px 10px",
                        fontSize: 14,
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 600,
                        marginBottom: 4,
                      }}
                    >
                      설명 (선택)
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      style={{
                        width: "100%",
                        borderRadius: 8,
                        border: "1px solid #d1d5db",
                        padding: "8px 10px",
                        fontSize: 13,
                        resize: "vertical",
                      }}
                    />
                  </div>
                </div>

                {/* 항목 리스트 편집 */}
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <h2
                      style={{
                        margin: 0,
                        fontSize: 15,
                        fontWeight: 700,
                      }}
                    >
                      템플릿 항목
                    </h2>
                    <button
                      type="button"
                      className="btn black"
                      onClick={addItem}
                    >
                      + 항목 추가
                    </button>
                  </div>

                  {items.length === 0 && (
                    <p
                      style={{
                        fontSize: 13,
                        color: "#6b7280",
                        margin: "8px 0",
                      }}
                    >
                      아직 항목이 없습니다. &quot;항목 추가&quot; 버튼을 눌러
                      추가해 주세요.
                    </p>
                  )}

                  {items.length > 0 && (
                    <div
                      style={{
                        borderRadius: 12,
                        border: "1px solid #e5e7eb",
                        overflow: "hidden",
                      }}
                    >
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          fontSize: 13,
                        }}
                      >
                        <thead>
                          <tr
                            style={{
                              background: "#f3f4f6",
                              borderBottom: "1px solid #e5e7eb",
                            }}
                          >
                            <th
                              style={{
                                padding: "8px 10px",
                                textAlign: "left",
                                width: 40,
                              }}
                            >
                              #
                            </th>
                            <th
                              style={{
                                padding: "8px 10px",
                                textAlign: "left",
                              }}
                            >
                              제목
                            </th>
                            <th
                              style={{
                                padding: "8px 10px",
                                textAlign: "left",
                                width: 80,
                              }}
                            >
                              역할
                            </th>
                            <th
                              style={{
                                padding: "8px 10px",
                                textAlign: "left",
                                width: 120,
                              }}
                            >
                              종류
                            </th>
                            <th
                              style={{
                                padding: "8px 10px",
                                textAlign: "left",
                                width: 80,
                              }}
                            >
                              영역
                            </th>
                            <th
                              style={{
                                padding: "8px 10px",
                                textAlign: "right",
                                width: 60,
                              }}
                            >
                              삭제
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item, idx) => (
                            <tr
                              key={idx}
                              style={{
                                borderBottom: "1px solid #e5e7eb",
                              }}
                            >
                              <td
                                style={{
                                  padding: "6px 10px",
                                  verticalAlign: "top",
                                }}
                              >
                                {idx + 1}
                              </td>
                              <td
                                style={{
                                  padding: "6px 10px",
                                }}
                              >
                                <input
                                  type="text"
                                  value={item.title}
                                  onChange={(e) =>
                                    updateItem(idx, "title", e.target.value)
                                  }
                                  placeholder="항목 제목"
                                  style={{
                                    width: "100%",
                                    borderRadius: 6,
                                    border: "1px solid #d1d5db",
                                    padding: "4px 8px",
                                    fontSize: 13,
                                  }}
                                />
                              </td>
                              <td
                                style={{
                                  padding: "6px 10px",
                                }}
                              >
                                <select
                                  value={item.defaultRole}
                                  onChange={(e) =>
                                    updateItem(
                                      idx,
                                      "defaultRole",
                                      e.target
                                        .value as TemplateItem["defaultRole"]
                                    )
                                  }
                                  style={{
                                    width: "100%",
                                    borderRadius: 6,
                                    border: "1px solid #d1d5db",
                                    padding: "4px 6px",
                                    fontSize: 12,
                                  }}
                                >
                                  <option value="admin">관리자</option>
                                  <option value="customer">고객</option>
                                </select>
                              </td>
                              <td
                                style={{
                                  padding: "6px 10px",
                                }}
                              >
                                <select
                                  value={item.defaultKind}
                                  onChange={(e) =>
                                    updateItem(
                                      idx,
                                      "defaultKind",
                                      e.target
                                        .value as TemplateItem["defaultKind"]
                                    )
                                  }
                                  style={{
                                    width: "100%",
                                    borderRadius: 6,
                                    border: "1px solid #d1d5db",
                                    padding: "4px 6px",
                                    fontSize: 12,
                                  }}
                                >
                                  <option value="ADMIN_UPLOAD_VIEW">
                                    관리자 업로드 안내
                                  </option>
                                  <option value="CLIENT_UPLOAD_REVIEW">
                                    고객 업로드 안내
                                  </option>
                                  <option value="PAYMENT_PIPELINE">
                                    결제/정산 단계
                                  </option>
                                </select>
                              </td>
                              <td
                                style={{
                                  padding: "6px 10px",
                                }}
                              >
                                <select
                                  value={item.area}
                                  onChange={(e) =>
                                    updateItem(
                                      idx,
                                      "area",
                                      e.target.value as TemplateItem["area"]
                                    )
                                  }
                                  style={{
                                    width: "100%",
                                    borderRadius: 6,
                                    border: "1px solid #d1d5db",
                                    padding: "4px 6px",
                                    fontSize: 12,
                                  }}
                                >
                                  <option value="main">메인</option>
                                  <option value="extra">추가</option>
                                </select>
                              </td>
                              <td
                                style={{
                                  padding: "6px 10px",
                                  textAlign: "right",
                                }}
                              >
                                <button
                                  type="button"
                                  className="btn line"
                                  onClick={() => removeItem(idx)}
                                >
                                  삭제
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 하단 버튼들 */}
                <div
                  style={{
                    marginTop: 20,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="btn black"
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? "저장 중..." : "저장"}
                    </button>
                    <button
                      type="button"
                      className="btn line"
                      onClick={handleCancelEdit}
                      disabled={saving}
                    >
                      취소
                    </button>
                  </div>

                  <button
                    type="button"
                    className="btn outline-black"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? "삭제 중..." : "템플릿 삭제"}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}

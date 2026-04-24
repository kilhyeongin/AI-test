import Link from "next/link";
import "@/app/(styles)/checklist-layout.css";

export default function AdminNotFound() {
  return (
    <div className="page">
      <div className="wrap">
        <header className="hero">
          <div className="hero-main">페이지를 찾을 수 없습니다</div>
          <div className="hero-sub">
            입력한 주소가 잘못되었거나, 페이지가 이동/삭제되었을 수 있습니다.
          </div>
        </header>

        <main className="card" style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ color: "#374151" }}>
              아래 메뉴로 이동하거나 상단 탭에서 원하는 기능을 선택하세요.
            </div>

            <div className="actions" style={{ justifyContent: "flex-start", gap: 8, flexWrap: "wrap" }}>
              <Link className="btn black" href="/admin/dashboard">
                관리자 홈
              </Link>
              <Link className="btn outline-black" href="/admin/users">
                계정관리
              </Link>
              <Link className="btn outline-black" href="/admin/checklist/templates">
                체크리스트 템플릿
              </Link>
              <Link className="btn outline-black" href="/admin/itineraries">
                여행 일정표
              </Link>
              <Link className="btn outline-black" href="/admin/land/list">
                랜드사
              </Link>
            </div>

            <div style={{ fontSize: 12, color: "#6b7280" }}>
              접근 권한이 없는 경우에도 로그인 페이지로 이동할 수 있습니다.
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

import Link from "next/link";
import "@/app/(styles)/checklist-layout.css";

export default function LandNotFound() {
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
              아래 메뉴로 이동하거나 다시 로그인해 주세요.
            </div>

            <div className="actions" style={{ justifyContent: "flex-start", gap: 8, flexWrap: "wrap" }}>
              <Link className="btn black" href="/land/dashboard">
                랜드 홈
              </Link>
              <Link className="btn outline-black" href="/land/login">
                로그인
              </Link>
              <Link className="btn outline-black" href="/land/register">
                회원가입
              </Link>
            </div>

            <div style={{ fontSize: 12, color: "#6b7280" }}>
              승인 대기/거절 계정은 로그인 후에도 접근이 제한될 수 있습니다.
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

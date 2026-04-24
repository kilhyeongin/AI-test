import Link from "next/link";
import "@/app/customer/customer.css";

export default function CustomerNotFound() {
  return (
    <div className="cl-shell">
      <div className="cl-card">
        <div className="cl-logo">
          <div className="cl-logo-mark" />
          <div className="cl-logo-text">TechForest</div>
        </div>

        <div style={{ fontSize: 18, fontWeight: 800, marginTop: 6 }}>
          페이지를 찾을 수 없습니다
        </div>
        <div style={{ color: "#6b7280", marginTop: 8, lineHeight: 1.5 }}>
          입력한 주소가 잘못되었거나, 페이지가 이동/삭제되었을 수 있습니다.
        </div>

        <div className="cl-gap" />

        <div style={{ display: "grid", gap: 10 }}>
          <Link className="cl-btn" href="/customer/dashboard">
            고객 홈으로
          </Link>

          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/customer/checklist">체크리스트</Link>
            <span style={{ color: "#d1d5db" }}>|</span>
            <Link href="/customer/login">로그인</Link>
          </div>
        </div>

        <div className="cl-divider" style={{ marginTop: 18 }}>
          <span>안내</span>
        </div>

        <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>
          로그인 전용 페이지에 접근하면 로그인 화면으로 이동합니다.
        </div>
      </div>
    </div>
  );
}

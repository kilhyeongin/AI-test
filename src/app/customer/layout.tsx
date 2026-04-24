// src/app/customer/layout.tsx
export const metadata = {
  title: "고객 영역",
};

export default function CustomerBaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 여기서는 cl-shell 같은 거 안 씀
  // 로그인/회원가입 페이지 안에서 customer.css와 cl-shell을 직접 사용
  return <>{children}</>;
}

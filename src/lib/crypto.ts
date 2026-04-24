// 비밀번호 해시/검증 유틸 (bcrypt)
// - hashPassword: 신규 저장 시 해시 생성
// - verifyPassword: 로그인 시 평문 vs 해시 비교

import bcrypt from "bcryptjs";

// 신규 계정/비밀번호 변경 시 사용
export async function hashPassword(pw: string) {
  return await bcrypt.hash(pw, 10);
}

// 로그인 검증 시 사용 (평문 비번 vs DB의 hash)
export async function verifyPassword(plain: string, hash: string) {
  return await bcrypt.compare(plain, hash);
}
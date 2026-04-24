// 여행지·용어 동의어 사전
// key = 정규화된 표준어, value = 해당 표준어로 인식할 단어들
export const TRAVEL_SYNONYMS: Record<string, string[]> = {
  // 국가
  일본: ["japan", "일몬", "일뵨", "jp", "재팬"],
  중국: ["china", "중궁", "cn", "차이나"],
  태국: ["thailand", "타이", "태국", "방콕", "푸켓", "치앙마이", "파타야"],
  베트남: ["vietnam", "비엣남", "다낭", "호치민", "하노이", "나트랑", "호이안"],
  인도네시아: ["indonesia", "발리", "자카르타", "lombok", "롬복"],
  필리핀: ["philippines", "필리핀", "세부", "보라카이", "마닐라"],
  싱가포르: ["singapore", "싱가폴", "싱가포르"],
  말레이시아: ["malaysia", "말레이시아", "쿠알라룸푸르", "코타키나발루", "랑카위"],
  홍콩: ["hongkong", "hong kong", "홍콩"],
  대만: ["taiwan", "타이완", "타이뻬이", "타이페이"],
  유럽: ["europe", "유럽", "서유럽", "동유럽"],
  프랑스: ["france", "파리", "프랑스"],
  이탈리아: ["italy", "이탈리아", "로마", "피렌체", "베네치아", "밀라노"],
  스페인: ["spain", "스페인", "바르셀로나", "마드리드"],
  영국: ["uk", "england", "영국", "런던"],
  독일: ["germany", "독일", "베를린", "뮌헨"],
  스위스: ["switzerland", "스위스", "취리히"],
  터키: ["turkey", "튀르키예", "이스탄불"],
  미국: ["usa", "america", "미국", "뉴욕", "라스베가스", "하와이", "로스앤젤레스", "엘에이"],
  캐나다: ["canada", "캐나다", "밴쿠버", "토론토"],
  호주: ["australia", "호주", "시드니", "멜버른"],
  뉴질랜드: ["new zealand", "뉴질랜드"],
  제주: ["제주도", "제주", "jeju"],
  // 도시 (일본)
  도쿄: ["tokyo", "도쿄", "동경"],
  오사카: ["osaka", "오사카", "대판"],
  교토: ["kyoto", "교토"],
  후쿠오카: ["fukuoka", "후쿠오카"],
  삿포로: ["sapporo", "삿포로"],
  오키나와: ["okinawa", "오키나와"],
  // 여행 유형
  패키지: ["패키지", "단체여행", "투어", "tour"],
  허니문: ["허니문", "신혼여행", "honeymoon"],
  가족여행: ["가족여행", "패밀리", "family", "아이와함께", "아이동반"],
  배낭여행: ["배낭여행", "자유여행", "자유투어"],
  // 기간 표현
  "1박2일": ["1박2일", "1박 2일", "하루", "당일"],
  "2박3일": ["2박3일", "2박 3일"],
  "3박4일": ["3박4일", "3박 4일"],
  "4박5일": ["4박5일", "4박 5일"],
  "5박6일": ["5박6일", "5박 6일"],
  "6박7일": ["6박7일", "6박 7일"],
  "7박8일": ["7박8일", "7박 8일"],
  "10일": ["10일", "열흘"],
  // 동남아 묶음
  동남아: ["동남아", "동남아시아", "southeast asia", "아세안"],
};

// 입력 텍스트를 소문자·공백 정규화
function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, "").trim();
}

// Levenshtein 거리 계산 (오타 보정용)
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// 단어 하나가 동의어 사전의 어떤 표준어에 해당하는지 반환
// 오타 허용: 길이 4 이상이면 편집거리 1 이내, 길이 6 이상이면 2 이내
function matchSynonym(word: string): string | null {
  const norm = normalize(word);
  for (const [standard, variants] of Object.entries(TRAVEL_SYNONYMS)) {
    for (const v of variants) {
      const normV = normalize(v);
      if (normV === norm) return standard;
      const maxDist = norm.length >= 6 ? 2 : norm.length >= 4 ? 1 : 0;
      if (maxDist > 0 && levenshtein(norm, normV) <= maxDist) return standard;
    }
  }
  return null;
}

// 여러 키워드에서 표준어 목록 추출
export function expandKeywords(keywords: string[]): string[] {
  const result = new Set<string>();
  for (const kw of keywords) {
    result.add(kw); // 원본 유지
    const matched = matchSynonym(kw);
    if (matched) result.add(matched);
  }
  return Array.from(result);
}

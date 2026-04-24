// src/lib/airCodes.ts
// ---------------------------------------------
// 항공사/공항 코드 → 한글 이름/메타 정보 공용 유틸
// (표현/도메인 로직 담당, 파싱 로직과 분리)
// ---------------------------------------------

import type { PnrParsedSegment } from "@/lib/pnrParser";

// ================================
// 항공사 코드 → 한글명
// (한국 + 동북아 + 동남아 + 미주 + 유럽 + 중동 등 실사용 위주)
// ================================
export const AIRLINE_NAME_KO: Record<string, string> = {
  // 한국 국적사
  KE: "대한항공",
  OZ: "아시아나항공",
  LJ: "진에어",
  "7C": "제주항공",
  TW: "티웨이항공",
  BX: "에어부산",
  ZE: "이스타항공",
  YP: "에어프레미아",
  RS: "에어서울",

  // 일본
  NH: "전일본공수(ANA)",
  JL: "일본항공(JAL)",
  MM: "피치항공",
  GK: "제트스타 재팬",
  BC: "스카이마크항공",
  JW: "바닐라에어",
  "6J": "솔라시드에어",

  // 중국 본토
  CA: "중국국제항공",
  MU: "중국동방항공",
  CZ: "중국남방항공",
  FM: "상하이항공",
  HU: "하이난항공",
  MF: "샤먼항공",
  SC: "산동항공",
  JD: "베이징캐피탈항공",
  "9C": "스프링항공",
  OQ: "충칭항공",
  PN: "웨스트에어",
  HO: "준야오항공",

  // 홍콩/마카오/대만
  CX: "캐세이퍼시픽항공",
  KA: "캐세이드래곤항공",
  UO: "홍콩익스프레스",
  HX: "홍콩항공",
  NX: "마카오항공",
  CI: "중화항공",
  BR: "에바항공",
  IT: "타이거에어 타이완",
  GE: "트랜스아시아항공",

  // 동남아 (싱가포르/말레이시아/태국/베트남/필리핀/인도네시아 등)
  SQ: "싱가포르항공",
  TR: "스쿠트",
  MI: "실크에어",
  MH: "말레이시아항공",
  OD: "말린도에어",
  AK: "에어아시아",
  FD: "타이 에어아시아",
  QZ: "에어아시아 인도네시아",
  XT: "에어아시아 엑스",
  GA: "가루다인도네시아항공",
  ID: "바틱에어",
  JT: "라이온에어",
  SL: "타이 라이온에어",
  SJ: "스리위자야항공",
  VN: "베트남항공",
  VJ: "비엣젯항공",
  QH: "밤부항공",
  PR: "필리핀항공",
  "5J": "세부퍼시픽항공",
  Z2: "에어아시아 필리핀",
  BI: "로열 브루나이항공",

  // 인도/남아시아
  AI: "에어인디아",
  UK: "비스타라",
  "6E": "인디고",
  G8: "고에어",
  UL: "스리랑카항공",
  BG: "비만방글라데시항공",

  // 중동/터키
  QR: "카타르항공",
  EK: "에미레이트항공",
  EY: "에티하드항공",
  TK: "터키항공",
  WY: "오만항공",
  SV: "사우디아항공",
  RJ: "로열요르단항공",
  KU: "쿠웨이트항공",
  GF: "걸프항공",
  ME: "중동항공",

  // 유럽 (Lufthansa 그룹, AF-KLM, IAG, 기타)
  LH: "루프트한자 독일항공",
  LX: "스위스 국제항공",
  OS: "오스트리아항공",
  SN: "브뤼셀항공",
  EW: "유로윙스",
  KL: "KLM 네덜란드항공",
  AF: "에어프랑스",
  AZ: "ITA 에어웨이즈",
  BA: "영국항공",
  IB: "이베리아항공",
  VY: "부엘링항공",
  AY: "핀에어",
  SK: "스칸디나비아항공",
  DY: "노르웨이항공",
  LO: "LOT 폴란드항공",
  TP: "TAP 포르투갈항공",
  OK: "체코항공",
  OSY: "오스트리아항공(코드쉐어)",
  BT: "에어발틱",
  RO: "타로마항공",
  PS: "우크라이나항공",
  A3: "에게안항공",
  OA: "올림픽항공",
  EI: "에어링구스",
  W6: "위즈에어",
  FR: "라이언에어",
  U2: "이지젯항공",
  X3: "TUI플라이 독일",

  // 러시아/동유럽/중앙아시아
  SU: "아에로플로트 러시아항공",
  S7: "S7 항공",
  HY: "우즈베키스탄항공",
  KC: "에어아스타나",

  // 미주
  AA: "아메리칸항공",
  UA: "유나이티드항공",
  DL: "델타항공",
  HA: "하와이안항공",
  B6: "젯블루항공",
  AS: "알래스카항공",
  WN: "사우스웨스트항공",
  NK: "스피리트항공",
  F9: "프론티어항공",
  AC: "에어캐나다",
  WS: "웨스트젯",
  AM: "아에로멕시코",
  AV: "아비앙카",
  LA: "LATAM항공",
  CM: "코파항공",
  G3: "골항공(브라질)",

  // 오세아니아
  QF: "콴타스항공",
  JQ: "제트스타항공",
  NZ: "에어뉴질랜드",
  VA: "버진오스트레일리아",

  // 아프리카
  ET: "에티오피아항공",
  MS: "이집트항공",
  KQ: "케냐항공",
  SA: "남아프리카항공",
  MK: "에어모리셔스",
  TU: "튀니스항공",
  AT: "로열에어모로코",
};

// ================================
// 공항 코드 → 한글 도시/공항명
// (주요 허브 + 한국 여행사 실사용 노선 위주 확장)
// ================================
export const AIRPORT_NAME_KO: Record<string, string> = {
  // ===== 한국 국내 =====
  ICN: "인천",
  GMP: "서울(김포)",
  PUS: "부산(김해)",
  CJU: "제주",
  TAE: "대구",
  CJJ: "청주",
  KWJ: "광주",
  USN: "울산",
  RSU: "여수",
  KPO: "포항",
  KUV: "군산",
  WJU: "원주",
  YNY: "양양",
  HIN: "사천",

  // ===== 일본 =====
  NRT: "도쿄(나리타)",
  HND: "도쿄(하네다)",
  KIX: "오사카(간사이)",
  ITM: "오사카(이타미)",
  CTS: "삿포로(신치토세)",
  FUK: "후쿠오카",
  NGO: "나고야(츄부)",
  OKA: "오키나와(나하)",

  // ===== 중국 본토 =====
  PEK: "베이징(수도)",
  PKX: "베이징(다싱)",
  PVG: "상하이(푸둥)",
  SHA: "상하이(홍차오)",
  CAN: "광저우",
  SZX: "선전",
  XMN: "샤먼",
  HGH: "항저우",
  TAO: "칭다오",
  DLC: "다롄",
  NKG: "난징",
  TNA: "지난",
  FOC: "푸저우",
  KMG: "쿤밍",
  CTU: "청두",
  TFU: "톈푸(청두 신공항)",
  CKG: "충칭",
  XIY: "시안",
  WUH: "우한",
  CSX: "창사",
  NGB: "닝보",
  TSN: "톈진",
  SYX: "싼야",
  HRB: "하얼빈",

  // ===== 홍콩/마카오/대만 =====
  HKG: "홍콩",
  MFM: "마카오",
  TPE: "타이베이(타오위안)",
  TSA: "타이베이(송산)",
  KHH: "가오슝",

  // ===== 태국 =====
  BKK: "방콕(수완나품)",
  DMK: "방콕(돈므앙)",
  CNX: "치앙마이",
  HKT: "푸껫",
  USM: "코사무이",
  KBV: "끄라비",

  // ===== 베트남 =====
  SGN: "호치민",
  HAN: "하노이",
  DAD: "다낭",
  CXR: "나트랑(깜라인)",
  PQC: "푸꾸옥",

  // ===== 싱가포르/말레이시아/브루나이/미얀마 =====
  SIN: "싱가포르(창이)",
  KUL: "쿠알라룸푸르",
  PEN: "페낭",
  LGK: "랑카위",
  BKI: "코타키나발루",
  BWN: "반다르스리브가완(브루나이)",
  RGN: "양곤",

  // ===== 필리핀 =====
  MNL: "마닐라",
  CEB: "세부",
  KLO: "칼리보(보라카이)",
  MPH: "카티클란(보라카이)",
  PPS: "푸에르토 프린세사(팔라완)",
  CRK: "클락",

  // ===== 인도네시아 =====
  DPS: "발리(덴파사르)",
  SUB: "수라바야",
  JOG: "욕야카르타",
  CGK: "자카르타(수카르노하타)",

  // ===== 인도/남아시아 =====
  DEL: "델리",
  BOM: "뭄바이",
  BLR: "벵갈루루",
  MAA: "첸나이",
  COK: "코치",
  CCU: "콜카타",
  HYD: "하이데라바드",
  GOI: "고아",
  DAC: "다카(방글라데시)",
  CMB: "콜롬보(스리랑카)",
  KTM: "카트만두(네팔)",
  MLE: "말레(몰디브)",

  // ===== 하와이/괌/사이판/남태평양 =====
  HNL: "호놀룰루",
  KOA: "코나",
  OGG: "마우이(카훌루이)",
  ITO: "히로",
  GUM: "괌",
  SPN: "사이판",
  ROR: "팔라우(코로르)",

  // ===== 유럽 주요 허브/노선 =====
  LHR: "런던(히스로)",
  LGW: "런던(개트윅)",
  MAN: "맨체스터",
  CDG: "파리(샤를드골)",
  ORY: "파리(오를리)",
  AMS: "암스테르담(스키폴)",
  FRA: "프랑크푸르트",
  MUC: "뮌헨",
  DUS: "뒤셀도르프",
  BER: "베를린(브란덴부르크)",
  HAM: "함부르크",
  ZRH: "취리히",
  GVA: "제네바",
  FCO: "로마(피우미치노)",
  MXP: "밀라노(말펜사)",
  VCE: "베네치아(마르코폴로)",
  BCN: "바르셀로나",
  MAD: "마드리드",
  LIS: "리스본",
  OPO: "포르투",
  VIE: "비엔나",
  BRU: "브뤼셀",
  CPH: "코펜하겐",
  OSL: "오슬로",
  ARN: "스톡홀름(알란다)",
  HEL: "헬싱키",
  ATH: "아테네",
  IST: "이스탄불(신공항)",
  DUB: "더블린",
  WAW: "바르샤바",
  PRG: "프라하",
  BUD: "부다페스트",
  ZAG: "자그레브",

  // ===== 중동/아프리카 =====
  DOH: "도하(하마드)",
  DXB: "두바이",
  DWC: "두바이(알막툼)",
  AUH: "아부다비",
  MCT: "무스카트",
  RUH: "리야드",
  JED: "제다",
  AMM: "암만",
  BEY: "베이루트",
  CAI: "카이로",
  JNB: "요하네스버그",
  CPT: "케이프타운",
  NBO: "나이로비",
  ADD: "아디스아바바",

  // ===== 미주(미국/캐나다/중남미) =====
  JFK: "뉴욕(JFK)",
  LGA: "뉴욕(라과디아)",
  EWR: "뉴어크",
  LAX: "로스앤젤레스",
  SFO: "샌프란시스코",
  SEA: "시애틀",
  PDX: "포틀랜드",
  DEN: "덴버",
  PHX: "피닉스",
  IAH: "휴스턴(인터콘티넨털)",
  DFW: "댈러스/포트워스",
  ATL: "애틀랜타",
  MCO: "올랜도",
  MIA: "마이애미",
  BOS: "보스턴",
  IAD: "워싱턴(덜레스)",
  DCA: "워싱턴 내셔널",
  ORD: "시카고(오헤어)",
  MSP: "미니애폴리스",
  DTW: "디트로이트",
  CLT: "샬럿",
  YVR: "밴쿠버",
  YYZ: "토론토",
  YUL: "몬트리올",
  YYC: "캘거리",
  MEX: "멕시코시티",
  CUN: "칸쿤",
  LIM: "리마",
  GRU: "상파울루",
  GIG: "리우데자네이루",
  EZE: "부에노스아이레스",

  // ===== 오세아니아 =====
  SYD: "시드니",
  MEL: "멜번",
  BNE: "브리즈번",
  CNS: "케언즈",
  PER: "퍼스",
  ADL: "애들레이드",
  AKL: "오클랜드",
  CHC: "크라이스트처치",
  ZQN: "퀸스타운",
};

// ================================
// 공항 코드 → (도시, 국가) 메타 (여행지 자동 추론용)
// ================================
export type AirportMeta = { cityKo: string; countryKo: string };

export const AIRPORT_META_KO: Record<string, AirportMeta> = {
  // ===== 한국 =====
  ICN: { cityKo: "인천", countryKo: "대한민국" },
  GMP: { cityKo: "서울", countryKo: "대한민국" },
  PUS: { cityKo: "부산", countryKo: "대한민국" },
  CJU: { cityKo: "제주", countryKo: "대한민국" },
  TAE: { cityKo: "대구", countryKo: "대한민국" },
  CJJ: { cityKo: "청주", countryKo: "대한민국" },
  KWJ: { cityKo: "광주", countryKo: "대한민국" },
  USN: { cityKo: "울산", countryKo: "대한민국" },
  RSU: { cityKo: "여수", countryKo: "대한민국" },
  KPO: { cityKo: "포항", countryKo: "대한민국" },

  // ===== 일본 =====
  NRT: { cityKo: "도쿄", countryKo: "일본" },
  HND: { cityKo: "도쿄", countryKo: "일본" },
  KIX: { cityKo: "오사카", countryKo: "일본" },
  CTS: { cityKo: "삿포로", countryKo: "일본" },
  FUK: { cityKo: "후쿠오카", countryKo: "일본" },
  NGO: { cityKo: "나고야", countryKo: "일본" },
  OKA: { cityKo: "오키나와", countryKo: "일본" },

  // ===== 중국/홍콩/대만 =====
  PEK: { cityKo: "베이징", countryKo: "중국" },
  PKX: { cityKo: "베이징", countryKo: "중국" },
  PVG: { cityKo: "상하이", countryKo: "중국" },
  SHA: { cityKo: "상하이", countryKo: "중국" },
  CAN: { cityKo: "광저우", countryKo: "중국" },
  SZX: { cityKo: "선전", countryKo: "중국" },
  XMN: { cityKo: "샤먼", countryKo: "중국" },
  HGH: { cityKo: "항저우", countryKo: "중국" },
  TAO: { cityKo: "칭다오", countryKo: "중국" },
  DLC: { cityKo: "다롄", countryKo: "중국" },
  NKG: { cityKo: "난징", countryKo: "중국" },
  TNA: { cityKo: "지난", countryKo: "중국" },
  FOC: { cityKo: "푸저우", countryKo: "중국" },
  KMG: { cityKo: "쿤밍", countryKo: "중국" },
  CTU: { cityKo: "청두", countryKo: "중국" },
  TFU: { cityKo: "청두", countryKo: "중국" },
  CKG: { cityKo: "충칭", countryKo: "중국" },
  XIY: { cityKo: "시안", countryKo: "중국" },
  WUH: { cityKo: "우한", countryKo: "중국" },
  HKG: { cityKo: "홍콩", countryKo: "홍콩(중국)" },
  MFM: { cityKo: "마카오", countryKo: "마카오(중국)" },
  TPE: { cityKo: "타이베이", countryKo: "대만" },
  TSA: { cityKo: "타이베이", countryKo: "대만" },
  KHH: { cityKo: "가오슝", countryKo: "대만" },

  // ===== 태국 =====
  BKK: { cityKo: "방콕", countryKo: "태국" },
  DMK: { cityKo: "방콕", countryKo: "태국" },
  CNX: { cityKo: "치앙마이", countryKo: "태국" },
  HKT: { cityKo: "푸껫", countryKo: "태국" },
  USM: { cityKo: "코사무이", countryKo: "태국" },
  KBV: { cityKo: "끄라비", countryKo: "태국" },

  // ===== 베트남 =====
  SGN: { cityKo: "호치민", countryKo: "베트남" },
  HAN: { cityKo: "하노이", countryKo: "베트남" },
  DAD: { cityKo: "다낭", countryKo: "베트남" },
  CXR: { cityKo: "나트랑", countryKo: "베트남" },
  PQC: { cityKo: "푸꾸옥", countryKo: "베트남" },

  // ===== 싱가포르/말레이시아/브루나이/미얀마 =====
  SIN: { cityKo: "싱가포르", countryKo: "싱가포르" },
  KUL: { cityKo: "쿠알라룸푸르", countryKo: "말레이시아" },
  PEN: { cityKo: "페낭", countryKo: "말레이시아" },
  LGK: { cityKo: "랑카위", countryKo: "말레이시아" },
  BKI: { cityKo: "코타키나발루", countryKo: "말레이시아" },
  BWN: { cityKo: "반다르스리브가완", countryKo: "브루나이" },
  RGN: { cityKo: "양곤", countryKo: "미얀마" },

  // ===== 필리핀 =====
  MNL: { cityKo: "마닐라", countryKo: "필리핀" },
  CEB: { cityKo: "세부", countryKo: "필리핀" },
  KLO: { cityKo: "칼리보", countryKo: "필리핀" },
  MPH: { cityKo: "보라카이", countryKo: "필리핀" },
  PPS: { cityKo: "푸에르토 프린세사", countryKo: "필리핀" },
  CRK: { cityKo: "클락", countryKo: "필리핀" },

  // ===== 인도네시아 =====
  DPS: { cityKo: "발리", countryKo: "인도네시아" },
  SUB: { cityKo: "수라바야", countryKo: "인도네시아" },
  JOG: { cityKo: "욕야카르타", countryKo: "인도네시아" },
  CGK: { cityKo: "자카르타", countryKo: "인도네시아" },

  // ===== 인도/남아시아 =====
  DEL: { cityKo: "델리", countryKo: "인도" },
  BOM: { cityKo: "뭄바이", countryKo: "인도" },
  BLR: { cityKo: "벵갈루루", countryKo: "인도" },
  MAA: { cityKo: "첸나이", countryKo: "인도" },
  COK: { cityKo: "코치", countryKo: "인도" },
  CCU: { cityKo: "콜카타", countryKo: "인도" },
  HYD: { cityKo: "하이데라바드", countryKo: "인도" },
  GOI: { cityKo: "고아", countryKo: "인도" },
  DAC: { cityKo: "다카", countryKo: "방글라데시" },
  CMB: { cityKo: "콜롬보", countryKo: "스리랑카" },
  KTM: { cityKo: "카트만두", countryKo: "네팔" },
  MLE: { cityKo: "말레", countryKo: "몰디브" },

  // ===== 하와이/괌/사이판/남태평양 =====
  HNL: { cityKo: "호놀룰루", countryKo: "미국(하와이)" },
  KOA: { cityKo: "코나", countryKo: "미국(하와이)" },
  OGG: { cityKo: "마우이", countryKo: "미국(하와이)" },
  ITO: { cityKo: "히로", countryKo: "미국(하와이)" },
  GUM: { cityKo: "괌", countryKo: "미국(괌)" },
  SPN: { cityKo: "사이판", countryKo: "미국(북마리아나)" },
  ROR: { cityKo: "코로르", countryKo: "팔라우" },

  // ===== 유럽 =====
  LHR: { cityKo: "런던", countryKo: "영국" },
  LGW: { cityKo: "런던", countryKo: "영국" },
  MAN: { cityKo: "맨체스터", countryKo: "영국" },
  CDG: { cityKo: "파리", countryKo: "프랑스" },
  ORY: { cityKo: "파리", countryKo: "프랑스" },
  AMS: { cityKo: "암스테르담", countryKo: "네덜란드" },
  FRA: { cityKo: "프랑크푸르트", countryKo: "독일" },
  MUC: { cityKo: "뮌헨", countryKo: "독일" },
  DUS: { cityKo: "뒤셀도르프", countryKo: "독일" },
  BER: { cityKo: "베를린", countryKo: "독일" },
  HAM: { cityKo: "함부르크", countryKo: "독일" },
  ZRH: { cityKo: "취리히", countryKo: "스위스" },
  GVA: { cityKo: "제네바", countryKo: "스위스" },
  FCO: { cityKo: "로마", countryKo: "이탈리아" },
  MXP: { cityKo: "밀라노", countryKo: "이탈리아" },
  VCE: { cityKo: "베네치아", countryKo: "이탈리아" },
  BCN: { cityKo: "바르셀로나", countryKo: "스페인" },
  MAD: { cityKo: "마드리드", countryKo: "스페인" },
  LIS: { cityKo: "리스본", countryKo: "포르투갈" },
  OPO: { cityKo: "포르투", countryKo: "포르투갈" },
  VIE: { cityKo: "비엔나", countryKo: "오스트리아" },
  BRU: { cityKo: "브뤼셀", countryKo: "벨기에" },
  CPH: { cityKo: "코펜하겐", countryKo: "덴마크" },
  OSL: { cityKo: "오슬로", countryKo: "노르웨이" },
  ARN: { cityKo: "스톡홀름", countryKo: "스웨덴" },
  HEL: { cityKo: "헬싱키", countryKo: "핀란드" },
  ATH: { cityKo: "아테네", countryKo: "그리스" },
  IST: { cityKo: "이스탄불", countryKo: "튀르키예" },
  DUB: { cityKo: "더블린", countryKo: "아일랜드" },
  WAW: { cityKo: "바르샤바", countryKo: "폴란드" },
  PRG: { cityKo: "프라하", countryKo: "체코" },
  BUD: { cityKo: "부다페스트", countryKo: "헝가리" },
  ZAG: { cityKo: "자그레브", countryKo: "크로아티아" },

  // ===== 중동/아프리카 =====
  DOH: { cityKo: "도하", countryKo: "카타르" },
  DXB: { cityKo: "두바이", countryKo: "아랍에미리트" },
  DWC: { cityKo: "두바이", countryKo: "아랍에미리트" },
  AUH: { cityKo: "아부다비", countryKo: "아랍에미리트" },
  MCT: { cityKo: "무스카트", countryKo: "오만" },
  RUH: { cityKo: "리야드", countryKo: "사우디아라비아" },
  JED: { cityKo: "제다", countryKo: "사우디아라비아" },
  AMM: { cityKo: "암만", countryKo: "요르단" },
  BEY: { cityKo: "베이루트", countryKo: "레바논" },
  CAI: { cityKo: "카이로", countryKo: "이집트" },
  JNB: { cityKo: "요하네스버그", countryKo: "남아프리카공화국" },
  CPT: { cityKo: "케이프타운", countryKo: "남아프리카공화국" },
  NBO: { cityKo: "나이로비", countryKo: "케냐" },
  ADD: { cityKo: "아디스아바바", countryKo: "에티오피아" },

  // ===== 미주 =====
  JFK: { cityKo: "뉴욕", countryKo: "미국" },
  LGA: { cityKo: "뉴욕", countryKo: "미국" },
  EWR: { cityKo: "뉴어크", countryKo: "미국" },
  LAX: { cityKo: "로스앤젤레스", countryKo: "미국" },
  SFO: { cityKo: "샌프란시스코", countryKo: "미국" },
  SEA: { cityKo: "시애틀", countryKo: "미국" },
  PDX: { cityKo: "포틀랜드", countryKo: "미국" },
  DEN: { cityKo: "덴버", countryKo: "미국" },
  PHX: { cityKo: "피닉스", countryKo: "미국" },
  IAH: { cityKo: "휴스턴", countryKo: "미국" },
  DFW: { cityKo: "댈러스/포트워스", countryKo: "미국" },
  ATL: { cityKo: "애틀랜타", countryKo: "미국" },
  MCO: { cityKo: "올랜도", countryKo: "미국" },
  MIA: { cityKo: "마이애미", countryKo: "미국" },
  BOS: { cityKo: "보스턴", countryKo: "미국" },
  IAD: { cityKo: "워싱턴 D.C.", countryKo: "미국" },
  DCA: { cityKo: "워싱턴 D.C.", countryKo: "미국" },
  ORD: { cityKo: "시카고", countryKo: "미국" },
  MSP: { cityKo: "미니애폴리스", countryKo: "미국" },
  DTW: { cityKo: "디트로이트", countryKo: "미국" },
  CLT: { cityKo: "샬럿", countryKo: "미국" },
  YVR: { cityKo: "밴쿠버", countryKo: "캐나다" },
  YYZ: { cityKo: "토론토", countryKo: "캐나다" },
  YUL: { cityKo: "몬트리올", countryKo: "캐나다" },
  YYC: { cityKo: "캘거리", countryKo: "캐나다" },
  MEX: { cityKo: "멕시코시티", countryKo: "멕시코" },
  CUN: { cityKo: "칸쿤", countryKo: "멕시코" },
  LIM: { cityKo: "리마", countryKo: "페루" },
  GRU: { cityKo: "상파울루", countryKo: "브라질" },
  GIG: { cityKo: "리우데자네이루", countryKo: "브라질" },
  EZE: { cityKo: "부에노스아이레스", countryKo: "아르헨티나" },

  // ===== 오세아니아 =====
  SYD: { cityKo: "시드니", countryKo: "호주" },
  MEL: { cityKo: "멜번", countryKo: "호주" },
  BNE: { cityKo: "브리즈번", countryKo: "호주" },
  CNS: { cityKo: "케언즈", countryKo: "호주" },
  PER: { cityKo: "퍼스", countryKo: "호주" },
  ADL: { cityKo: "애들레이드", countryKo: "호주" },
  AKL: { cityKo: "오클랜드", countryKo: "뉴질랜드" },
  CHC: { cityKo: "크라이스트처치", countryKo: "뉴질랜드" },
  ZQN: { cityKo: "퀸스타운", countryKo: "뉴질랜드" },
};

// 우리 기준 '집(한국)' 공항들
export const HOME_AIRPORTS = new Set<string>(["ICN", "GMP", "PUS", "CJU"]);

// ================================
// 헬퍼 함수들
// ================================
export function getAirlineNameKo(code: string): string {
  const key = (code || "").toUpperCase();
  return AIRLINE_NAME_KO[key] ?? key;
}

export function getAirportNameKo(code: string): string {
  const key = (code || "").toUpperCase();
  return AIRPORT_NAME_KO[key] ?? key;
}

/**
 * 현재 PNR 세그먼트들에서 여행 목적지 추론
 * - 집(HOME_AIRPORTS) ↔ 해외(AIRPORT_META_KO) 패턴 기준
 */
export function inferDestinationFromParsed(
  parsed: PnrParsedSegment[],
): { airportCode: string; cityKo: string; countryKo: string } | null {
  for (const seg of parsed) {
    const from = seg.from.toUpperCase();
    const to = seg.to.toUpperCase();

    const fromHome = HOME_AIRPORTS.has(from);
    const toHome = HOME_AIRPORTS.has(to);

    const fromMeta = AIRPORT_META_KO[from];
    const toMeta = AIRPORT_META_KO[to];

    // 집 → 해외
    if (fromHome && !toHome && toMeta) {
      return {
        airportCode: to,
        cityKo: toMeta.cityKo,
        countryKo: toMeta.countryKo,
      };
    }

    // 해외 → 집
    if (!fromHome && toHome && fromMeta) {
      return {
        airportCode: from,
        cityKo: fromMeta.cityKo,
        countryKo: fromMeta.countryKo,
      };
    }
  }

  // 위 조건에 안 걸리면 1구간 도착지 기준으로라도 추론
  if (parsed.length > 0) {
    const firstTo = parsed[0].to.toUpperCase();
    const meta = AIRPORT_META_KO[firstTo];
    if (meta) {
      return {
        airportCode: firstTo,
        cityKo: meta.cityKo,
        countryKo: meta.countryKo,
      };
    }
  }

  return null;
}

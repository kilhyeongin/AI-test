// src/lib/pnrParser.ts
// ---------------------------------------------
// GDS PNR 텍스트 → 항공편 세그먼트 배열로 파싱하는 공용 모듈
// (언어/표현과 무관한 순수 파서)
// ---------------------------------------------

export type PnrParsedSegment = {
  airline: string; // 항공사 코드 (예: KE)
  flightNo: string; // 편명 (예: KE931)
  from: string; // 출발 공항 코드 (예: ICN)
  to: string; // 도착 공항 코드 (예: FCO)
  date: string; // 출발일 YYYY-MM-DD
  depTime: string; // 출발시각 HH:MM
  arrTime: string; // 도착시각 HH:MM
};

type RawSegment = {
  airline: string;
  flightNo: string;
  from: string;
  to: string;
  dateRaw: string;
  depTime: string;
  arrTime: string;
};

/** 0900, 09:00 → 09:00 */
function normalizeTime(t: string): string {
  const clean = t.replace(":", "").trim();
  if (clean.length !== 4 || /\D/.test(clean)) return t.trim();
  return `${clean.slice(0, 2)}:${clean.slice(2)}`;
}

/** "23MAY", "23MAY25", "2025-05-23" 등 → YYYY-MM-DD */
function convertPnrDateToken(token: string): string {
  const trimmed = token.trim().toUpperCase();

  // 이미 YYYY-MM-DD 형태
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // 23MAY, 23MAY25
  const m = trimmed.match(/^(\d{2})([A-Z]{3})(\d{2})?$/);
  if (m) {
    const [, dd, mmmRaw, yy] = m;
    const mmm = mmmRaw.toUpperCase();
    const monthMap: Record<string, string> = {
      JAN: "01",
      FEB: "02",
      MAR: "03",
      APR: "04",
      MAY: "05",
      JUN: "06",
      JUL: "07",
      AUG: "08",
      SEP: "09",
      OCT: "10",
      NOV: "11",
      DEC: "12",
    };
    const month = monthMap[mmm];
    if (!month) return trimmed;

    let year: number;
    if (yy) {
      year = 2000 + parseInt(yy, 10);
    } else {
      year = new Date().getFullYear();
    }

    return `${year}-${month}-${dd}`;
  }

  return trimmed;
}

/** 패턴 A (예: 2 KE931E 23MAY ICNFCO HK1 1320 1925) */
function parsePatternA(line: string): RawSegment | null {
  const re =
    /^\s*\d+\s+([A-Z0-9]{2}\d{2,4})\s+[A-Z]\s+(\d{2}[A-Z]{3})\s+([A-Z]{3})([A-Z]{3})\s+[A-Z]{2}\d?\s+(\d{4})\s+(\d{4})/;
  const m = line.match(re);
  if (!m) return null;

  const [, flight, dateToken, from, to, dep, arr] = m;
  const airline = flight.slice(0, 2);

  return {
    airline,
    flightNo: flight,
    from,
    to,
    dateRaw: dateToken,
    depTime: dep,
    arrTime: arr,
  };
}

/** 패턴 B (질문 주신 SAMPLE 라인 형태)
 *  2 KE 931 E 23MAY 2 ICNFOC HK1 1300 1925 23MAY E KE/ V7GEYG
 *  3 KE 932 E 28MAY 7 FOCICN HK1 2115 1540 29MAY E KE/ V7GEYG
 */
function parsePatternB(line: string): RawSegment | null {
  const re =
    /^\s*\d+\s+([A-Z0-9]{2})\s+(\d{2,4})\s+[A-Z]\s+(\d{2}[A-Z]{3})\s+\d\s+([A-Z]{3})([A-Z]{3})\s+[A-Z]{2}\d?\s+(\d{4})\s+(\d{4})/;
  const m = line.match(re);
  if (!m) return null;

  const [, airline, flightNum, dateToken, from, to, dep, arr] = m;

  return {
    airline,
    flightNo: airline + flightNum,
    from,
    to,
    dateRaw: dateToken,
    depTime: dep,
    arrTime: arr,
  };
}

/** 패턴 C (조금 느슨한 일반 패턴) */
function parsePatternC(line: string): RawSegment | null {
  const re =
    /^\s*(?:\d+\s+)?([A-Z0-9]{2}\d{2,4})\s+(?:[A-Z]\s+)?([A-Z]{3})\s+([A-Z]{3})\s+(\d{2}[A-Z]{3}|\d{4}-\d{2}-\d{2})\s+(\d{4}|\d{2}:\d{2})\s+(\d{4}|\d{2}:\d{2})/;
  const m = line.match(re);
  if (!m) return null;

  const [, flight, from, to, dateToken, dep, arr] = m;
  const airline = flight.slice(0, 2);

  return {
    airline,
    flightNo: flight,
    from,
    to,
    dateRaw: dateToken,
    depTime: dep,
    arrTime: arr,
  };
}

/** 패턴 D (날짜 뒤에 6자리 공항코드 붙는 형태)
 *  1. QR 859 M 18OCT ICNDOH HK2 0120 0550 O* SU 1
 */
function parsePatternD(line: string): RawSegment | null {
  const re =
    /^\s*\d+\.?\s+([A-Z0-9]{2})\s+(\d{1,4})\s+[A-Z]\s+(\d{2}[A-Z]{3})\s+([A-Z]{6})\s+[A-Z0-9]+\s+(\d{4})\s+(\d{4})/;
  const m = line.match(re);
  if (!m) return null;

  const [, airline, flightNum, dateToken, airportGroup, dep, arr] = m;

  return {
    airline,
    flightNo: airline + flightNum,
    from: airportGroup.slice(0, 3),
    to: airportGroup.slice(3),
    dateRaw: dateToken,
    depTime: dep,
    arrTime: arr,
  };
}

/** 가장 느슨한 패턴:
 *  - 앞 숫자/클래스/요일 등 여러 토큰을 허용
 *  - 공항코드는 6자리(출+도착) 또는 3+3 구조 허용
 *  - 뒤쪽에서 시간 2개(출발/도착)만 골라서 사용
 */
function parseLoosePattern(line: string): RawSegment | null {
  // 앞의 순번 제거
  let cleaned = line.replace(/^\s*\d+\s+/, "");
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  const tokens = cleaned.split(" ");
  if (tokens.length < 5) return null;

  let airline = "";
  let flightNo = "";
  let idx = 0;

  // 1) 항공사 + 편명
  const t0 = tokens[0];
  const flightLike = t0.match(/^([A-Z0-9]{2})(\d{2,4})$/);
  if (flightLike) {
    airline = flightLike[1];
    flightNo = t0;
    idx = 1;
  } else if (
    tokens.length >= 2 &&
    /^[A-Z0-9]{2}$/.test(tokens[0]) &&
    /^\d{2,4}$/.test(tokens[1])
  ) {
    airline = tokens[0];
    flightNo = airline + tokens[1];
    idx = 2;
  } else {
    return null;
  }

  // 2) 클래스(한 글자) 스킵
  if (idx < tokens.length && /^[A-Z]$/.test(tokens[idx])) {
    idx += 1;
  }

  if (idx >= tokens.length) return null;

  // 3) 날짜 토큰
  let dateToken = tokens[idx++];
  // 날짜 뒤 요일 숫자(예: 2, 3, 7 등) 스킵
  if (
    idx < tokens.length &&
    /^\d{1}$/.test(tokens[idx]) &&
    !/\d{2}[A-Z]{3}/.test(dateToken)
  ) {
    idx += 1;
  }

  // 날짜가 23 MAY처럼 쪼개져 있으면 붙여보기
  if (
    !/^\d{2}[A-Z]{3}$/.test(dateToken) &&
    !/^\d{4}-\d{2}-\d{2}$/.test(dateToken)
  ) {
    const next = tokens[idx] || "";
    const concat = (dateToken + next).toUpperCase();
    if (/^\d{2}[A-Z]{3}$/.test(concat)) {
      dateToken = concat;
      idx += 1;
    }
  }

  if (
    !/^\d{2}[A-Z]{3}$/.test(dateToken) &&
    !/^\d{4}-\d{2}-\d{2}$/.test(dateToken)
  ) {
    return null;
  }

  if (idx >= tokens.length) return null;

  // 4) 공항 코드
  let from = "";
  let to = "";
  const airportToken = tokens[idx++];

  if (/^[A-Z]{6}$/.test(airportToken)) {
    // ICNFOC 형태
    from = airportToken.slice(0, 3);
    to = airportToken.slice(3);
  } else if (
    /^[A-Z]{3}$/.test(airportToken) &&
    idx < tokens.length &&
    /^[A-Z]{3}$/.test(tokens[idx])
  ) {
    // ICN FOC 형태
    from = airportToken;
    to = tokens[idx++];
  } else {
    return null;
  }

  // 5) 나머지에서 시간 2개 찾기
  const rest = tokens.slice(idx);
  const timeCandidates = rest.filter((t) =>
    /^(\d{4}|\d{2}:\d{2})$/.test(t),
  );

  let dep = "";
  let arr = "";
  if (timeCandidates.length >= 2) {
    dep = timeCandidates[0];
    arr = timeCandidates[1];
  }

  return {
    airline,
    flightNo,
    from,
    to,
    dateRaw: dateToken,
    depTime: dep,
    arrTime: arr,
  };
}

/** 한 줄에서 여러 패턴 시도 */
function parseLine(line: string): RawSegment | null {
  const parsers = [
    parsePatternA,
    parsePatternB,
    parsePatternC,
    parsePatternD,
    parseLoosePattern,
  ];
  for (const fn of parsers) {
    const seg = fn(line);
    if (seg) return seg;
  }
  return null;
}

/** 여러 줄 PNR 텍스트 → 공용 PnrParsedSegment 배열 */
export function parsePnrText(pnr: string): PnrParsedSegment[] {
  const lines = pnr.split(/\r?\n/).map((l) => l.trim());
  const rawSegments: RawSegment[] = [];

  for (const line of lines) {
    if (!line) continue;
    const seg = parseLine(line);
    if (seg) rawSegments.push(seg);
  }

  return rawSegments.map((r) => ({
    airline: r.airline,
    flightNo: r.flightNo,
    from: r.from,
    to: r.to,
    date: convertPnrDateToken(r.dateRaw),
    depTime: normalizeTime(r.depTime),
    arrTime: normalizeTime(r.arrTime),
  }));
}

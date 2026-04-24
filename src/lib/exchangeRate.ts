// 1시간 캐시 (서버 인스턴스 메모리)
let rateCache: { rates: Record<string, number>; date: string; fetchedAt: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000;

// 기본 fallback 환율 (fetch 실패 시 사용)
const FALLBACK_RATES: Record<string, number> = {
  KRW: 1,
  USD: 1370,
  JPY: 9,
  EUR: 1480,
  GBP: 1720,
  THB: 38,
  SGD: 1010,
  HKD: 175,
  CNY: 189,
  AUD: 880,
};

export type ExchangeRates = {
  rates: Record<string, number>; // 각 통화 1단위 → 원화
  date: string;
  isFallback: boolean;
};

export async function getExchangeRates(): Promise<ExchangeRates> {
  if (rateCache && Date.now() - rateCache.fetchedAt < CACHE_TTL) {
    return { rates: rateCache.rates, date: rateCache.date, isFallback: false };
  }

  try {
    // USD 기준으로 주요 통화 + KRW 한 번에 조회
    const res = await fetch(
      "https://api.frankfurter.app/latest?from=USD&to=KRW,EUR,JPY,GBP,THB,SGD,HKD,CNY,AUD",
      { next: { revalidate: 0 } }
    );
    if (!res.ok) throw new Error("fetch failed");

    const data = await res.json();
    const usdToKrw: number = data.rates.KRW;

    // 각 통화 1단위 → KRW 계산 (USD 기준 교차 환율)
    const rates: Record<string, number> = { KRW: 1, USD: Math.round(usdToKrw) };
    for (const [cur, usdRate] of Object.entries(data.rates as Record<string, number>)) {
      if (cur === "KRW") continue;
      rates[cur] = Math.round(usdToKrw / usdRate);
    }

    rateCache = { rates, date: data.date, fetchedAt: Date.now() };
    return { rates, date: data.date, isFallback: false };
  } catch {
    console.error("[exchangeRate] fetch 실패, fallback 사용");
    const today = new Date().toISOString().slice(0, 10);
    return { rates: FALLBACK_RATES, date: today, isFallback: true };
  }
}

// 시스템 프롬프트용 환율 텍스트 생성
export function buildRatePrompt({ rates, date, isFallback }: ExchangeRates): string {
  const label = isFallback ? "참고 환율 (네트워크 오류로 근사값 사용)" : `실시간 환율 (${date} 기준)`;
  const rateLines = [
    `1 USD ≈ ${rates.USD?.toLocaleString()}원`,
    `1 JPY ≈ ${rates.JPY?.toLocaleString()}원`,
    `1 EUR ≈ ${rates.EUR?.toLocaleString()}원`,
    `1 GBP ≈ ${rates.GBP?.toLocaleString()}원`,
    `1 THB ≈ ${rates.THB?.toLocaleString()}원`,
    `1 SGD ≈ ${rates.SGD?.toLocaleString()}원`,
    `1 HKD ≈ ${rates.HKD?.toLocaleString()}원`,
    `1 CNY ≈ ${rates.CNY?.toLocaleString()}원`,
    `1 AUD ≈ ${rates.AUD?.toLocaleString()}원`,
  ].join(" | ");

  return `[${label}]\n${rateLines}`;
}

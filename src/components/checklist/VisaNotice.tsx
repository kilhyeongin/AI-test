"use client";

type VisaSite = {
  id: string;
  title: string;       // 예: "미주 비자 - ESTA"
  subtitle?: string;   // 예: "하와이 / 칸쿤"
  url: string;
};

const DEFAULT_NOTICE = `
발리 비자는 공항 도착 후 발급 가능하나 대기줄이 길어 시간이 지연되실 수 있습니다.
여권, 현지 투숙 정보, 신용 카드 정보를 등록하신 뒤
출발 전 전자도착비자를 발급받으시길 권고드립니다.
`.trim();

const DEFAULT_SITES: VisaSite[] = [
  {
    id: "esta",
    title: "미주 비자 - ESTA",
    subtitle: "하와이 / 칸쿤",
    url: "https://esta.cbp.dhs.gov/",
  },
  {
    id: "voa",
    title: "인도네시아 비자 - VOA",
    subtitle: "발리",
    url: "https://evisa.imigrasi.go.id/",
  },
];

type Props = {
  noticeText?: string;
  sites?: VisaSite[];
};

export function VisaNotice({ noticeText = DEFAULT_NOTICE, sites = DEFAULT_SITES }: Props) {
  return (
    <section className="visa-info">
      <div className="visa-info-title">📢 안내사항</div>
      <p className="visa-info-body">{noticeText}</p>

      <div className="visa-list">
        {sites.map((site) => (
          <div key={site.id} className="visa-item">
            <div className="visa-item-txt">
              <div className="visa-item-title">{site.title}</div>
              {site.subtitle && (
                <div className="visa-item-sub">{site.subtitle}</div>
              )}
            </div>
            <a
              href={site.url}
              target="_blank"
              rel="noreferrer"
              className="btn white small"
            >
              발급
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}

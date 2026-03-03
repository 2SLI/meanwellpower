import { Link } from 'react-router-dom';

const companyInfo = [
  { label: '상호명', value: '비트로닉' },
  { label: '대표자', value: '이영애' },
  { label: '사업자등록번호', value: '8810902996' },
  { label: '통신판매업번호', value: '2025-충남천안-2381' }
];

const contactInfo = [
  { label: '고객센터', value: '010-6358-3144', href: 'tel:01063583144' },
  { label: '이메일', value: 'hclee@l-light.co.kr', href: 'mailto:hclee@l-light.co.kr' },
  { label: '주소', value: '충청남도 천안시 서북구 미라16길 33-4 비 102호 (우 : 31167)' }
];

const channelLinks = [
  { label: '네이버 블로그', href: 'https://blog.naver.com/meanwell_power' },
  { label: '네이버 스마트스토어', href: 'https://smartstore.naver.com/meanwellpower' }
];

function SiteFooter() {
  return (
    <footer className="mt-14 border-t border-[var(--line)] bg-[#0f1b34] text-white">
      <div className="mx-auto grid w-full max-w-[1320px] gap-8 px-6 py-10 sm:px-10 lg:grid-cols-[1.1fr_0.9fr]">
        <section>
          <p className="text-xs font-semibold tracking-[0.16em] text-white/70">MEANWELL POWER</p>
          <h2 className="mt-2 font-brand text-2xl tracking-[0.05em] text-[var(--gold)]">민웰파워</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/80">
            민웰(MEAN WELL) SMPS 전원공급장치 B2B 공급 전문. 제품 문의, 납기 상담, 대량 견적 요청을 빠르게 지원합니다.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/products" className="rounded-md border border-white/25 px-3 py-1.5 text-xs font-semibold text-white/90 hover:bg-white/10">
              제품목록
            </Link>
            <Link to="/business" className="rounded-md border border-white/25 px-3 py-1.5 text-xs font-semibold text-white/90 hover:bg-white/10">
              기업구매
            </Link>
            <Link to="/contact" className="rounded-md border border-white/25 px-3 py-1.5 text-xs font-semibold text-white/90 hover:bg-white/10">
              문의하기
            </Link>
          </div>
        </section>

        <section className="grid gap-5 sm:grid-cols-2">
          <div className="rounded-xl border border-white/15 bg-white/5 p-4">
            <p className="text-xs font-semibold tracking-[0.12em] text-white/70">회사 정보</p>
            <div className="mt-3 space-y-2">
              {companyInfo.map((row) => (
                <p key={row.label} className="text-sm text-white/90">
                  <span className="font-semibold text-white">{row.label}</span> : {row.value}
                </p>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/15 bg-white/5 p-4">
            <p className="text-xs font-semibold tracking-[0.12em] text-white/70">연락처</p>
            <div className="mt-3 space-y-2">
              {contactInfo.map((row) => (
                <p key={row.label} className="text-sm text-white/90">
                  <span className="font-semibold text-white">{row.label}</span> :{' '}
                  {row.href ? (
                    <a href={row.href} className="text-[var(--gold)] hover:underline">
                      {row.value}
                    </a>
                  ) : (
                    row.value
                  )}
                </p>
              ))}
            </div>

            <div className="mt-4 border-t border-white/10 pt-3">
              <p className="text-xs font-semibold tracking-[0.12em] text-white/70">공식 채널</p>
              <div className="mt-2 flex flex-col gap-2">
                {channelLinks.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold text-[var(--gold)] hover:underline"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="border-t border-white/10 py-4">
        <p className="mx-auto w-full max-w-[1320px] px-6 text-xs text-white/65 sm:px-10">
          © {new Date().getFullYear()} 민웰파워. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export default SiteFooter;

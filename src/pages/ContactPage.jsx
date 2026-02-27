import { Link } from 'react-router-dom';

const contactCards = [
  {
    title: '고객센터',
    description: '제품 문의, 발주/납기 상담은 전화로 빠르게 안내드립니다.',
    value: '010-6358-3144',
    href: 'tel:01063583144',
    badge: 'CALL'
  },
  {
    title: '이메일',
    description: 'BOM/대량견적 요청은 이메일로 파일/모델명 보내주시면 됩니다.',
    value: 'hclee@l-light.co.kr',
    href: 'mailto:hclee@l-light.co.kr',
    badge: 'MAIL'
  }
];

const companyInfo = [
  { label: '상호명', value: '비트로닉' },
  { label: '대표자', value: '이영애' },
  { label: '고객센터', value: '010-6358-3144' },
  { label: '사업자등록번호', value: '8810902996' },
  { label: '통신판매업번호', value: '2025-충남천안-2381' },
  { label: 'e-mail', value: 'hclee@l-light.co.kr' },
  {
    label: '사업장 소재지',
    value: '충청남도 천안시 서북구 미라16길 33-4 비 102호 (우 : 31167)'
  }
];

const notes = [
  '계좌이체 입금 확인 후 출고가 진행됩니다.',
  '정식 발주/거래 문서는 내부 시스템(eCount) 기준으로 발행됩니다.',
  '대량 견적은 BOM(모델명/수량) 공유 시 가장 빠르게 진행됩니다.'
];

function ContactPage() {
  const address = '충청남도 천안시 서북구 미라16길 33-4 비 102호 (우 : 31167)';
  const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1240px] px-6 pb-20 pt-28 sm:px-10">
      {/* HERO (BusinessPage 느낌 그대로) */}
      <section className="relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[linear-gradient(155deg,#0c1831_0%,#182b4d_60%,#233b65_100%)] p-8 text-white shadow-[0_30px_70px_-45px_rgba(8,14,30,0.85)] sm:p-12">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-20 left-0 h-56 w-56 rounded-full bg-[var(--gold)]/25 blur-2xl" />

        <div className="relative max-w-3xl">
          <p className="text-xs font-semibold tracking-[0.18em] text-white/75">CONTACT</p>
          <h1 className="mt-3 font-brand text-4xl tracking-[0.06em] sm:text-5xl">문의 / 회사 정보</h1>
          <p className="mt-4 text-sm leading-relaxed text-white/85 sm:text-base">
            제품 문의, 발주/납기 상담, 대량 견적(BOM) 요청은 아래 채널로 연락해 주세요.
            <br />
            확인 후 빠르게 안내드리겠습니다.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href="tel:01063583144"
              className="rounded-md bg-[var(--gold)] px-6 py-3 text-sm font-bold tracking-[0.05em] text-[#101a2f] transition hover:brightness-95"
            >
              고객센터 전화
            </a>
            <a
              href="mailto:hclee@l-light.co.kr"
              className="rounded-md border border-white/35 px-6 py-3 text-sm font-semibold tracking-[0.05em] text-white transition hover:bg-white/10"
            >
              이메일 문의
            </a>
            <Link
              to="/"
              className="rounded-md border border-white/20 bg-black/10 px-6 py-3 text-sm font-semibold tracking-[0.05em] text-white/90 transition hover:bg-white/5"
            >
              MEANWELL SMPS
            </Link>
          </div>
        </div>
      </section>

      {/* QUICK CARDS */}
      <section className="mt-8 grid gap-4 md:grid-cols-2">
        {contactCards.map((item) => (
          <a
            key={item.title}
            href={item.href}
            className="group rounded-2xl border border-[var(--line)] bg-white p-7 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.45)] transition hover:-translate-y-[1px] hover:shadow-[0_24px_52px_-36px_rgba(15,23,42,0.5)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold tracking-[0.15em] text-[var(--muted)]">{item.badge}</p>
                <h2 className="mt-2 font-brand text-3xl tracking-[0.05em] text-[var(--navy)]">{item.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">{item.description}</p>
              </div>
              <div className="rounded-xl border border-[var(--line)] bg-[#f7f9fc] px-3 py-2 text-xs font-semibold tracking-[0.08em] text-[var(--navy)]">
                바로 연결
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-[var(--navy)] px-4 py-3 text-white">
              <p className="text-xs font-semibold tracking-[0.12em] text-white/70">CONTACT</p>
              <p className="mt-1 font-brand text-xl tracking-[0.04em] text-white group-hover:underline">
                {item.value}
              </p>
            </div>
          </a>
        ))}
      </section>

      {/* INFO + SIDE (BusinessPage처럼 2컬럼) */}
      <section className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        {/* LEFT: 회사 정보 */}
        <div className="space-y-4">
          <article className="rounded-2xl border border-[var(--line)] bg-white p-7 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.45)]">
            <p className="text-xs font-semibold tracking-[0.15em] text-[var(--muted)]">COMPANY INFORMATION</p>
            <h3 className="mt-2 font-brand text-3xl tracking-[0.05em] text-[var(--navy)]">비트로닉</h3>
            <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
              B2B 납품 및 구매 상담을 위한 기본 회사 정보입니다.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {companyInfo.map((row) => (
                <div
                  key={row.label}
                  className="rounded-xl border border-[var(--line)] bg-[#fbfbfd] px-4 py-3"
                >
                  <p className="text-[11px] font-semibold tracking-[0.14em] text-[var(--muted)]">{row.label}</p>
                  <p className="mt-2 break-words text-sm font-semibold text-[var(--navy)]">{row.value}</p>
                </div>
              ))}
            </div>
          </article>

          {/* MAP */}
          <article className="rounded-2xl border border-[var(--line)] bg-white p-7 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.45)]">
            <p className="text-xs font-semibold tracking-[0.15em] text-[var(--muted)]">LOCATION</p>
            <h3 className="mt-2 font-brand text-3xl tracking-[0.05em] text-[var(--navy)]">오시는 길</h3>
            <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
              아래 지도에서 사업장 위치를 확인할 수 있습니다.
            </p>

            <div className="mt-5 overflow-hidden rounded-2xl border border-[var(--line)]">
              <iframe
                title="비트로닉 위치"
                src={mapSrc}
                className="h-[360px] w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-[var(--navy)] px-4 py-2 text-xs font-semibold tracking-[0.07em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white"
              >
                지도에서 열기
              </a>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-[var(--line)] px-4 py-2 text-xs font-semibold tracking-[0.07em] text-[var(--navy)] transition hover:bg-[#f7f9fc]"
              >
                길찾기
              </a>
            </div>
          </article>
        </div>

        {/* RIGHT: 안내/CTA (BusinessPage 사이드 카드 느낌) */}
        <aside className="rounded-2xl border border-[var(--line)] bg-white p-7 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.45)]">
          <p className="text-xs font-semibold tracking-[0.15em] text-[var(--muted)]">GUIDE</p>
          <h3 className="mt-2 font-brand text-3xl tracking-[0.05em] text-[var(--navy)]">문의 가이드</h3>

          <div className="mt-5 space-y-2">
            {notes.map((item) => (
              <div
                key={item}
                className="rounded-xl border border-[var(--line)] bg-[#f7f9fc] px-4 py-3 text-sm font-semibold text-[var(--navy)]"
              >
                {item}
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl bg-[var(--navy)] p-5 text-white">
            <p className="text-xs font-semibold tracking-[0.12em] text-white/75">B2B DESK</p>
            <p className="mt-2 text-sm leading-relaxed text-white/85">
              로그인 후 견적 요청을 남기면 보다 빠르게 처리할 수 있습니다.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                to="/login"
                className="inline-block rounded-md bg-[var(--gold)] px-4 py-2 text-xs font-bold tracking-[0.05em] text-[#101a2f]"
              >
                로그인
              </Link>
              <Link
                to="/quotes/requests"
                className="inline-block rounded-md border border-white/25 bg-black/10 px-4 py-2 text-xs font-bold tracking-[0.05em] text-white"
              >
                견적요청 내역
              </Link>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-[var(--line)] bg-white p-5">
            <p className="text-xs font-semibold tracking-[0.12em] text-[var(--muted)]">FAST ACTION</p>
            <div className="mt-3 grid gap-2">
              <a
                href="tel:01063583144"
                className="rounded-md border border-[var(--line)] px-4 py-3 text-sm font-semibold text-[var(--navy)] transition hover:bg-[#f7f9fc]"
              >
                고객센터 연결
              </a>
              <a
                href="mailto:hclee@l-light.co.kr?subject=%EA%B2%AC%EC%A0%81%20%EC%9A%94%EC%B2%AD&body=%EB%AA%A8%EB%8D%B8%EB%AA%85%2F%EC%88%98%EB%9F%89%2F%EB%82%A9%EA%B8%B0%20%EC%A1%B0%EA%B1%B4%EC%9D%84%20%EC%A0%81%EC%96%B4%EC%A3%BC%EC%8B%9C%EB%A9%B4%20%EB%B9%A0%EB%A5%B4%EA%B2%8C%20%ED%9A%8C%EC%8B%A0%EB%93%9C%EB%A6%BD%EB%8B%88%EB%8B%A4."
                className="rounded-md border border-[var(--line)] px-4 py-3 text-sm font-semibold text-[var(--navy)] transition hover:bg-[#f7f9fc]"
              >
                이메일로 견적 요청
              </a>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

export default ContactPage;

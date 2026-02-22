import { Link } from 'react-router-dom';

const strengths = [
  {
    title: '정품 민웰 파워만 취급',
    description:
      '민웰파워는 산업 현장에서 검증된 Mean Well 정품 라인업을 중심으로 공급합니다. 정품 시리얼과 사양 기준으로 선별하여 납품합니다.'
  },
  {
    title: '합리적인 가격 정책',
    description:
      '공급가와 도매가를 분리해 투명하게 제시하고, 발주 규모와 프로젝트 조건에 맞춰 최적의 단가를 제안합니다.'
  },
  {
    title: '기술 검토 + 납기 대응',
    description:
      '단순 판매를 넘어 대체품 검토, 출력 사양 확인, 납기 관리까지 함께 지원해 실제 현장 운영 부담을 줄여드립니다.'
  }
];

const principles = [
  '정품 중심 공급',
  '가격 투명성',
  '빠른 견적 회신',
  '산업 현장 맞춤 제안'
];

function BusinessPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-[1240px] px-6 pb-20 pt-28 sm:px-10">
      <section className="relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[linear-gradient(155deg,#0c1831_0%,#182b4d_60%,#233b65_100%)] p-8 text-white shadow-[0_30px_70px_-45px_rgba(8,14,30,0.85)] sm:p-12">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-20 left-0 h-56 w-56 rounded-full bg-[var(--gold)]/25 blur-2xl" />

        <div className="relative max-w-3xl">
          <p className="text-xs font-semibold tracking-[0.18em] text-white/75">BUSINESS</p>
          <h1 className="mt-3 font-brand text-4xl tracking-[0.06em] sm:text-5xl">민웰파워</h1>
          <p className="mt-4 text-sm leading-relaxed text-white/85 sm:text-base">
            산업용 전원 솔루션 전문 공급사로서 정품 민웰 파워를 안정적으로 제공하고, 합리적인 가격 정책으로 고객사의
            조달 효율을 높입니다.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/"
              className="rounded-md bg-[var(--gold)] px-6 py-3 text-sm font-bold tracking-[0.05em] text-[#101a2f] transition hover:brightness-95"
            >
              MEANWELL SMPS 보기
            </Link>
            <Link
              to="/login"
              className="rounded-md border border-white/35 px-6 py-3 text-sm font-semibold tracking-[0.05em] text-white transition hover:bg-white/10"
            >
              사업자 로그인
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-[var(--line)] bg-white p-7 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.45)]">
          <p className="text-xs font-semibold tracking-[0.15em] text-[var(--muted)]">CORE MESSAGE 01</p>
          <h2 className="mt-2 font-brand text-3xl tracking-[0.05em] text-[var(--navy)]">정품 민웰 파워 판매</h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
            검증된 유통 라인 기반으로 정품 Mean Well 제품만 공급합니다. 핵심 전원 장치의 신뢰성과 안전성을 우선으로
            제안합니다.
          </p>
        </article>

        <article className="rounded-2xl border border-[var(--line)] bg-white p-7 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.45)]">
          <p className="text-xs font-semibold tracking-[0.15em] text-[var(--muted)]">CORE MESSAGE 02</p>
          <h2 className="mt-2 font-brand text-3xl tracking-[0.05em] text-[var(--navy)]">합리적인 가격</h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
            공급가/도매가를 명확히 분리해 안내하고, 규모별 구매 조건에 맞춘 가격 전략으로 불필요한 조달 비용을 줄입니다.
          </p>
        </article>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          {strengths.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[0_14px_34px_-30px_rgba(15,23,42,0.42)]"
            >
              <h3 className="font-brand text-2xl tracking-[0.04em] text-[var(--navy)]">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{item.description}</p>
            </article>
          ))}
        </div>

        <aside className="rounded-2xl border border-[var(--line)] bg-white p-7 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.45)]">
          <p className="text-xs font-semibold tracking-[0.15em] text-[var(--muted)]">BUSINESS PRINCIPLES</p>
          <h3 className="mt-2 font-brand text-3xl tracking-[0.05em] text-[var(--navy)]">핵심 운영 기준</h3>

          <div className="mt-5 space-y-2">
            {principles.map((item) => (
              <div key={item} className="rounded-xl border border-[var(--line)] bg-[#f7f9fc] px-4 py-3 text-sm font-semibold text-[var(--navy)]">
                {item}
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl bg-[var(--navy)] p-5 text-white">
            <p className="text-xs font-semibold tracking-[0.12em] text-white/75">CONTACT DESK</p>
            <p className="mt-2 text-sm leading-relaxed text-white/85">
              B2B 구매/대량 발주 문의는 로그인 후 견적 요청을 남겨주시면 빠르게 회신드립니다.
            </p>
            <Link
              to="/login"
              className="mt-4 inline-block rounded-md bg-[var(--gold)] px-4 py-2 text-xs font-bold tracking-[0.05em] text-[#101a2f]"
            >
              견적 문의 시작
            </Link>
          </div>
        </aside>
      </section>
    </main>
  );
}

export default BusinessPage;

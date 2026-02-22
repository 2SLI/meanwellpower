import { Link } from 'react-router-dom';

// ✅ public/assets/value-auth-guide.jpg 로 넣어줘 (세로 1장짜리 이미지)
const GUIDE_IMAGE = '/assets/value-auth-guide.jpg';

// ✅ Mean Well 정품 조회 링크는 나중에 정확한 URL로 교체
const MEANWELL_SN_CHECK_URL = 'https://www.meanwell.com/'; // TODO: 정확한 S/N Check URL로 교체

const points = [
  {
    title: '100% 정품만 취급',
    description: '정품 라인업 중심으로 공급합니다. 시리얼 넘버 기반으로 정품 여부 확인이 가능합니다.'
  },
  {
    title: '시리얼 넘버로 확인',
    description: '민웰(Mean Well) 공식 채널의 S/N Check 기능을 통해 조회 가능합니다.'
  },
  {
    title: '구매 리스크 최소화',
    description: '가품/병행 리스크를 줄이고, 현장 품질·안전 기준을 충족하는 제품만 공급합니다.'
  }
];

const steps = [
  { step: '01', title: '시리얼 넘버 확인', desc: '제품 라벨(본체/케이스)에 표기된 S/N을 확인합니다.' },
  { step: '02', title: '시리얼 입력/조회', desc: '민웰 공식 홈페이지 S/N Check에 입력하여 조회합니다.' },
  { step: '03', title: '정품 여부 확인', desc: '모델/제조 정보가 일치하는지 확인합니다.' }
];

const notes = [
  '시리얼 조회 결과가 확인되지 않으면 즉시 문의해 주세요.',
  '모델명/제조 정보가 상이한 경우 출고/구매를 중지하세요.',
  '대량 발주 시에도 동일하게 시리얼 기준 확인이 가능합니다.'
];

function ValuePage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-[1240px] px-6 pb-20 pt-28 sm:px-10">
      {/* HERO (BusinessPage 톤) */}
      <section className="relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[linear-gradient(155deg,#0c1831_0%,#182b4d_60%,#233b65_100%)] p-8 text-white shadow-[0_30px_70px_-45px_rgba(8,14,30,0.85)] sm:p-12">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-20 left-0 h-56 w-56 rounded-full bg-[var(--gold)]/25 blur-2xl" />

        <div className="relative max-w-3xl">
          <p className="text-xs font-semibold tracking-[0.18em] text-white/75">VALUE / AUTHENTICITY</p>
          <h1 className="mt-3 font-brand text-4xl tracking-[0.06em] sm:text-5xl">100% 정품만 취급합니다</h1>
          <p className="mt-4 text-sm leading-relaxed text-white/85 sm:text-base">
            민웰파워의 모든 제품은 시리얼 넘버(S/N)로 정품 여부 확인이 가능합니다.
            <br />
            구매 전/후에도 검증 가능한 공급 구조를 지향합니다.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href={MEANWELL_SN_CHECK_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-[var(--gold)] px-6 py-3 text-sm font-bold tracking-[0.05em] text-[#101a2f] transition hover:brightness-95"
            >
              정품 조회 바로가기
            </a>
            <Link
              to="/contact"
              className="rounded-md border border-white/35 px-6 py-3 text-sm font-semibold tracking-[0.05em] text-white transition hover:bg-white/10"
            >
              문의하기
            </Link>
            <Link
              to="/"
              className="rounded-md border border-white/20 bg-black/10 px-6 py-3 text-sm font-semibold tracking-[0.05em] text-white/90 transition hover:bg-white/5"
            >
              MEANWELL SMPS
            </Link>
          </div>
        </div>
      </section>

      {/* POINT CARDS */}
      <section className="mt-8 grid gap-4 md:grid-cols-3">
        {points.map((item) => (
          <article
            key={item.title}
            className="rounded-2xl border border-[var(--line)] bg-white p-7 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.45)]"
          >
            <p className="text-xs font-semibold tracking-[0.15em] text-[var(--muted)]">POINT</p>
            <h2 className="mt-2 font-brand text-2xl tracking-[0.05em] text-[var(--navy)]">{item.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">{item.description}</p>
          </article>
        ))}
      </section>

      {/* GUIDE + SIDE (세로 1장 이미지 크게) */}
      <section className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        {/* LEFT: 세로 이미지 */}
        <article className="rounded-2xl border border-[var(--line)] bg-white p-7 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.45)]">
          <p className="text-xs font-semibold tracking-[0.15em] text-[var(--muted)]">AUTHENTICITY GUIDE</p>
          <h3 className="mt-2 font-brand text-3xl tracking-[0.05em] text-[var(--navy)]">정품 확인 가이드</h3>
          <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
            아래 안내 이미지 기준으로 시리얼을 확인하고, 공식 채널에서 조회해 주세요.
          </p>

          <div className="mt-5 overflow-hidden rounded-2xl border border-[var(--line)] bg-[#fbfbfd]">
            <img
              src={GUIDE_IMAGE}
              alt="100% 정품 취급 및 정품 확인 방법 안내"
              className="w-full object-contain"
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href={MEANWELL_SN_CHECK_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-[var(--navy)] px-4 py-2 text-xs font-semibold tracking-[0.07em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white"
            >
              S/N Check 열기
            </a>
            <Link
              to="/contact"
              className="rounded-md border border-[var(--line)] px-4 py-2 text-xs font-semibold tracking-[0.07em] text-[var(--navy)] transition hover:bg-[#f7f9fc]"
            >
              확인이 어려우면 문의
            </Link>
          </div>

          <p className="mt-3 text-xs font-semibold tracking-[0.12em] text-[var(--muted)]">
            *모델별 라벨 위치/표기 형식은 일부 상이할 수 있습니다.
          </p>
        </article>

        {/* RIGHT: 3-step + 안내/CTA */}
        <aside className="rounded-2xl border border-[var(--line)] bg-white p-7 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.45)]">
          <p className="text-xs font-semibold tracking-[0.15em] text-[var(--muted)]">3-STEP CHECK</p>
          <h3 className="mt-2 font-brand text-3xl tracking-[0.05em] text-[var(--navy)]">확인 절차</h3>

          <div className="mt-5 space-y-3">
            {steps.map((s) => (
              <div key={s.step} className="rounded-xl border border-[var(--line)] bg-[#f7f9fc] px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-[var(--navy)] px-3 py-1 text-xs font-bold tracking-[0.12em] text-white">
                    {s.step}
                  </div>
                  <p className="text-sm font-semibold text-[var(--navy)]">{s.title}</p>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{s.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-[var(--line)] bg-white p-5">
            <p className="text-xs font-semibold tracking-[0.12em] text-[var(--muted)]">CHECKLIST</p>
            <div className="mt-3 space-y-2">
              {notes.map((n) => (
                <div
                  key={n}
                  className="rounded-xl border border-[var(--line)] bg-[#fbfbfd] px-4 py-3 text-sm font-semibold text-[var(--navy)]"
                >
                  {n}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-[var(--navy)] p-5 text-white">
            <p className="text-xs font-semibold tracking-[0.12em] text-white/75">NEED HELP?</p>
            <p className="mt-2 text-sm leading-relaxed text-white/85">
              조회 결과 캡처와 모델명을 함께 보내주시면 더 빠르게 확인해드립니다.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                to="/contact"
                className="inline-block rounded-md bg-[var(--gold)] px-4 py-2 text-xs font-bold tracking-[0.05em] text-[#101a2f]"
              >
                연락처 보기
              </Link>
              <Link
                to="/"
                className="inline-block rounded-md border border-white/25 bg-black/10 px-4 py-2 text-xs font-bold tracking-[0.05em] text-white"
              >
                제품 보러가기
              </Link>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

export default ValuePage;
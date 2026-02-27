import { Suspense, lazy, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const CatalogSection = lazy(() => import('../components/CatalogSection'));

const stats = [
  { value: '3,500+', label: '누적 납품 품목', hint: '산업 현장 납품 기준' },
  { value: '24h', label: '평균 견적 회신', hint: '영업일 기준' },
  { value: '99.4%', label: '정시 출고율', hint: '내부 출고 KPI' }
];

function HomePage({ user, profile }) {
  const navigate = useNavigate();

  const handleShopNow = () => {
    navigate('/products');
  };

  const heroImage =
    'https://images.unsplash.com/photo-1565441510492-6d290c4ee641?auto=format&fit=crop&w=2400&q=80';

  const statsCards = useMemo(
    () =>
      stats.map((item) => (
        <article
          key={item.label}
          className="group rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_50px_-36px_rgba(15,23,42,0.42)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-brand text-2xl font-bold tracking-[0.05em] text-[var(--navy)] sm:text-[28px]">
                {item.value}
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--ink)]/80">{item.label}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">{item.hint}</p>
            </div>
            <div className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--line)] bg-[#f7f9fc] text-[var(--navy)] shadow-[0_10px_24px_-20px_rgba(15,23,42,0.35)] transition group-hover:translate-y-[-1px]">
              <span className="h-2 w-2 rounded-full bg-[var(--gold)]" />
            </div>
          </div>
        </article>
      )),
    []
  );

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-[var(--navy)]">
        <div className="relative h-[78vh] min-h-[560px]">
          <img
            src={heroImage}
            alt="민웰파워 메인 배너"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,18,41,0.65)_0%,rgba(9,18,41,0.72)_40%,rgba(9,18,41,0.78)_100%)]" />
          <div className="absolute inset-y-0 left-0 w-[56%] bg-gradient-to-r from-[rgba(8,16,37,0.82)] to-transparent" />

          {/* subtle lights */}
          <div className="pointer-events-none absolute -top-24 left-10 h-72 w-72 rounded-full bg-[var(--gold)]/14 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 right-10 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

          <div className="relative mx-auto flex h-full w-full max-w-[1320px] items-center px-6 pt-16 sm:px-10">
            <div className="animate-rise max-w-2xl text-white">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-semibold tracking-[0.18em] text-white/85 backdrop-blur">
                B2B INDUSTRIAL POWER SUPPLY
                <span className="h-1 w-1 rounded-full bg-[var(--gold)]" />
                MEAN WELL
              </div>

              <h1 className="mt-5 font-brand text-4xl font-extrabold leading-[1.05] tracking-[0.06em] sm:text-6xl">
                MEANWELL POWER
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
                정품 Mean Well 전원 제품을 안정적으로 공급하고, 납기/대체품 검토/프로젝트 단가까지 한 번에 지원합니다.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  onClick={handleShopNow}
                  className="rounded-md bg-[var(--gold)] px-7 py-3.5 text-sm font-bold tracking-[0.06em] text-[#101a2f] shadow-[0_18px_40px_-26px_rgba(245,196,49,0.55)] transition hover:brightness-95"
                >
                  제품 카탈로그 보기
                </button>

                

                <div className="flex items-center gap-2 text-xs font-semibold text-white/70">
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-300/80" />
                  재고 확인 후 이카운트로 발주/견적서 발송
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <main className="relative z-10 -mt-14 pb-20">
        <div className="mx-auto w-full max-w-[1240px] px-6 sm:px-10">
          {/* STATS */}
          <section className="animate-rise grid gap-4 md:grid-cols-3">{statsCards}</section>

          {/* CATALOG */}
          <section className="mt-14">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-[0.15em] text-[var(--muted)]">MEANWELL</p>
                <h2 className="mt-2 font-brand text-2xl tracking-[0.04em] text-[var(--navy)] sm:text-3xl">
                 ONLINE CATALOG
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
                  모델명 / 스펙 / 카테고리로 빠르게 검색하고, 상세 페이지에서 납기 및 가격 정책을 확인하세요.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to="/products"
                  className="rounded-md border border-[var(--line)] bg-white px-4 py-2 text-xs font-semibold tracking-[0.06em] text-[var(--navy)] shadow-[0_14px_30px_-26px_rgba(15,23,42,0.25)] transition hover:bg-[#f7f9fc]"
                >
                  전체 보기
                </Link>
              </div>
            </div>

            <div id="online-catalog" className="mt-6 scroll-mt-28">
              <Suspense
                fallback={
                  <div className="rounded-2xl border border-[var(--line)] bg-white p-8 text-sm text-[var(--muted)]">
                    카탈로그를 불러오는 중입니다...
                  </div>
                }
              >
                <CatalogSection user={user} profile={profile} title="MEANWELL SMPS" showHeader={false} />
              </Suspense>
            </div>
          </section>

          {/* B2B CTA */}
          <section className="mt-12 animate-rise overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--navy)] p-8 text-white shadow-[0_28px_60px_-40px_rgba(8,14,30,0.75)] sm:p-10">
            <div className="pointer-events-none absolute" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-semibold tracking-[0.16em] text-white/80">
                B2B PROCUREMENT SUPPORT
                <span className="h-1 w-1 rounded-full bg-[var(--gold)]" />
                FAST RESPONSE
              </div>

              <h3 className="mt-4 font-brand text-2xl tracking-[0.05em] sm:text-3xl">대량 견적 및 프로젝트 납품</h3>

              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/80 sm:text-base">
                BOM 기반 대체품 검토, 월 정기 발주, 긴급 재고 대응까지 한 번에 지원합니다. 산업 현장 일정에 맞춘 안정적인
                전원 공급 체계를 제안합니다.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  to="/quotes/requests"
                  className="inline-flex rounded-md bg-[var(--gold)] px-7 py-3 text-sm font-bold tracking-[0.06em] text-[#101a2f] transition hover:brightness-95"
                >
                  견적 요청하기
                </Link>
                <Link
                  to="/contact"
                  className="inline-flex rounded-md border border-white/25 bg-white/5 px-7 py-3 text-sm font-semibold tracking-[0.06em] text-white transition hover:bg-white/10"
                >
                  문의하기
                </Link>

                <p className="text-xs font-semibold text-white/65">
                  평균 견적 회신 24h · 정시 출고율 99.4%
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

export default HomePage;

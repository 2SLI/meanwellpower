import CatalogSection from '../components/CatalogSection';

function ProductPage({ user, profile }) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-[1240px] px-6 pb-20 pt-28 sm:px-10">
      <section className="relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[linear-gradient(155deg,#0c1831_0%,#182b4d_60%,#233b65_100%)] p-8 text-white shadow-[0_30px_70px_-45px_rgba(8,14,30,0.85)] sm:p-12">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-20 left-0 h-56 w-56 rounded-full bg-[var(--gold)]/25 blur-2xl" />

        <div className="relative max-w-3xl">
          <p className="text-xs font-semibold tracking-[0.18em] text-white/75">PRODUCTS</p>
          <h1 className="mt-3 font-brand text-4xl tracking-[0.06em] sm:text-5xl">MEANWELL SMPS</h1>
          <p className="mt-4 text-sm leading-relaxed text-white/85 sm:text-base">
            모델명, 스펙, 카테고리로 검색하고 제품 상세에서 가격/납기 정보를 확인하세요.
          </p>
        </div>
      </section>

      <div className="mt-8">
        <CatalogSection user={user} profile={profile} title="MEANWELL SMPS" showHeader={false} />
      </div>
    </main>
  );
}

export default ProductPage;
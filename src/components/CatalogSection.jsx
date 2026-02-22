import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { canViewWholesalePrice } from '../lib/roles';
import { getCatalogProducts, subscribeCatalogUpdates } from '../lib/productCatalog';

function CatalogSection({ user, profile, title = 'MEANWELL SMPS', showHeader = true, scrollId }) {
  const [catalogProducts, setCatalogProducts] = useState(() => getCatalogProducts());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    return subscribeCatalogUpdates(() => {
      setCatalogProducts(getCatalogProducts());
    });
  }, []);

  const filteredProducts = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();

    if (!keyword) {
      return catalogProducts;
    }

    return catalogProducts.filter((product) =>
      [product.brand, product.model, product.category, product.spec].join(' ').toLowerCase().includes(keyword)
    );
  }, [catalogProducts, searchQuery]);

  return (
    <section id={scrollId} className={scrollId ? 'scroll-mt-28' : undefined}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {showHeader ? (
            <>
              <p className="text-xs font-semibold tracking-[0.15em] text-[var(--muted)]">FEATURED PRODUCTS</p>
              <h2 className="mt-2 font-brand text-2xl tracking-[0.04em] text-[var(--navy)] sm:text-3xl">{title}</h2>
            </>
          ) : (
            <h2 className="font-brand text-2xl tracking-[0.04em] text-[var(--navy)] sm:text-3xl">{title}</h2>
          )}
        </div>

        <div className="w-full max-w-sm">
          <label className="mb-1.5 block text-xs font-semibold tracking-[0.08em] text-[var(--muted)]">상품 검색</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="모델명, 스펙, 카테고리 검색"
            className="form-input bg-white"
          />
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {filteredProducts.map((product, index) => (
          <article
            key={product.slug}
            className="animate-rise rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.4)]"
            style={{ animationDelay: `${90 + index * 70}ms` }}
          >
            <Link to={`/products/${product.slug}`} className="mb-5 block overflow-hidden rounded-xl border border-[var(--line)]">
              <img
                src={product.image}
                alt={`${product.model} 제품 이미지`}
                className="h-44 w-full object-cover transition duration-500 hover:scale-[1.03]"
              />
            </Link>

            <p className="text-xs font-semibold tracking-[0.15em] text-[var(--muted)]">MEAN WELL</p>
            <Link
              to={`/products/${product.slug}`}
              className="mt-2 block font-brand text-2xl tracking-[0.05em] text-[var(--navy)] hover:underline"
            >
              {product.model}
            </Link>
            <p className="mt-2 text-sm text-[var(--muted)]">{product.spec}</p>

            <div className="mt-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#7c8492]">
                  공급가 : <span className="line-through">{product.supplyPrice}</span>
                </p>

                {canViewWholesalePrice(profile?.role) ? (
                  <p className="mt-1 font-brand text-xl font-bold text-[var(--navy)]">도매가 : {product.wholesalePrice}</p>
                ) : user ? (
                  <p className="mt-1 font-brand text-xl font-bold text-amber-600">도매가 승인대기중</p>
                ) : (
                  <p className="mt-1 font-brand text-xl font-bold text-red-600">도매가 로그인</p>
                )}

                <p className="mt-1 text-[11px] font-semibold tracking-[0.06em] text-[var(--muted)]">부가세 별도</p>
                <p className="mt-1 text-xs text-[var(--muted)]">{product.leadTime}</p>
              </div>

              <Link
                to={`/products/${product.slug}`}
                className="rounded-md border border-[var(--navy)] px-4 py-2 text-xs font-semibold tracking-[0.07em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white"
              >
                상세보기
              </Link>
            </div>
          </article>
        ))}

        {filteredProducts.length === 0 ? (
          <div className="rounded-2xl border border-[var(--line)] bg-white p-8 text-sm text-[var(--muted)] lg:col-span-2">
            검색 결과가 없습니다. 다른 키워드로 검색해 주세요.
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default CatalogSection;
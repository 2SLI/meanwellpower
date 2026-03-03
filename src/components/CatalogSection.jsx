import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCatalogProducts, subscribeCatalogUpdates } from '../lib/productCatalog';
import { formatSupplyPriceLabel } from '../lib/priceFormat';

function CatalogSection({ title = 'MEANWELL SMPS', showHeader = true, scrollId }) {
  const sectionRef = useRef(null);
  const [catalogProducts, setCatalogProducts] = useState(() => getCatalogProducts());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPrefix, setSelectedPrefix] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  const PAGE_SIZE = 16;
  const PAGE_BUTTON_GROUP_SIZE = 8;

  useEffect(() => {
    return subscribeCatalogUpdates(() => {
      setCatalogProducts(getCatalogProducts());
    });
  }, []);

  const prefixCategories = useMemo(() => {
    const set = new Set();
    catalogProducts.forEach((product) => {
      const model = String(product.model || '').trim().toUpperCase();
      const prefix = model.slice(0, 3).replace(/[^A-Z]/g, '');
      if (prefix.length === 3) {
        set.add(prefix);
      }
    });
    return ['ALL', ...[...set].sort()];
  }, [catalogProducts]);

  const filteredProducts = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();

    return catalogProducts.filter((product) => {
      const model = String(product.model || '').trim().toUpperCase();
      const prefix = model.slice(0, 3).replace(/[^A-Z]/g, '');
      const matchPrefix = selectedPrefix === 'ALL' || prefix === selectedPrefix;

      if (!matchPrefix) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      return [product.brand, product.model, product.category, product.spec].join(' ').toLowerCase().includes(keyword);
    });
  }, [catalogProducts, searchQuery, selectedPrefix]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, currentPage]);

  const pageButtonNumbers = useMemo(() => {
    const groupIndex = Math.floor((currentPage - 1) / PAGE_BUTTON_GROUP_SIZE);
    const start = groupIndex * PAGE_BUTTON_GROUP_SIZE + 1;
    const end = Math.min(totalPages, start + PAGE_BUTTON_GROUP_SIZE - 1);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedPrefix]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const moveToPage = (nextPage) => {
    const bounded = Math.max(1, Math.min(totalPages, nextPage));
    if (bounded === currentPage) {
      return;
    }

    setCurrentPage(bounded);
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section ref={sectionRef} id={scrollId} className={scrollId ? 'scroll-mt-28' : undefined}>
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

      <div className="mt-4 flex flex-wrap gap-2">
        {prefixCategories.map((prefix) => (
          <button
            key={prefix}
            type="button"
            onClick={() => setSelectedPrefix(prefix)}
            className={`rounded-md border px-3 py-1.5 text-xs font-semibold tracking-[0.04em] transition ${
              selectedPrefix === prefix
                ? 'border-[var(--navy)] bg-[var(--navy)] text-white'
                : 'border-[var(--line)] bg-white text-[var(--navy)] hover:border-[var(--navy)]/40'
            }`}
          >
            {prefix === 'ALL' ? '전체' : prefix}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {paginatedProducts.map((product, index) => (
          <article
            key={product.slug}
            className="animate-rise rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.4)]"
            style={{ animationDelay: `${90 + index * 70}ms` }}
          >
            <Link to={`/products/${product.slug}`} className="mb-5 block overflow-hidden rounded-xl border border-[var(--line)]">
              <img
                src={product.image}
                alt={`${product.model} 제품 이미지`}
                loading="lazy"
                decoding="async"
                className="aspect-square w-full object-cover transition duration-500 hover:scale-[1.03]"
              />
            </Link>

            <p className="text-xs font-semibold tracking-[0.15em] text-[var(--muted)]">{product.brand || 'MEAN WELL'}</p>
            <Link
              to={`/products/${product.slug}`}
              className="mt-2 block font-brand text-2xl tracking-[0.05em] text-[var(--navy)] hover:underline"
            >
              {product.model}
            </Link>
            <p className="mt-2 text-sm text-[var(--muted)]">{product.spec || '-'}</p>

            <div className="mt-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-red-600">
                  공급가 : {formatSupplyPriceLabel(product.supplyPrice)}
                </p>

                <p className="mt-1 text-[11px] font-semibold tracking-[0.06em] text-[var(--muted)]">부가세 별도</p>
                <p className="mt-1 text-xs text-[var(--muted)]">{product.leadTime || '-'}</p>
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

      {filteredProducts.length > PAGE_SIZE ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => moveToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="rounded-md border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--navy)] disabled:opacity-40"
          >
            이전
          </button>

          {pageButtonNumbers.map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              onClick={() => moveToPage(pageNumber)}
              className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${
                currentPage === pageNumber
                  ? 'border-[var(--navy)] bg-[var(--navy)] text-white'
                  : 'border-[var(--line)] bg-white text-[var(--navy)]'
              }`}
            >
              {pageNumber}
            </button>
          ))}

          <button
            type="button"
            onClick={() => moveToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="rounded-md border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--navy)] disabled:opacity-40"
          >
            다음
          </button>
        </div>
      ) : null}
    </section>
  );
}

export default CatalogSection;

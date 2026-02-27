import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { getDownloadURL, listAll, ref } from 'firebase/storage';
import { getCatalogProductBySlug, subscribeCatalogUpdates } from '../lib/productCatalog';
import { commonDetailImagePath, storage } from '../lib/firebase';
import {
  openOrderListModal,
  readOrderListItems,
  subscribeOrderListUpdates,
  writeOrderListItems
} from '../lib/orderRequests';

let commonDetailImageUrlPromise = null;
let commonDetailImageUrlCache = null;
let globalNoticeUrlsPromise = null;
let globalNoticeUrlsCache = null;

function loadCommonDetailImageUrl() {
  if (!storage || !commonDetailImagePath) {
    return Promise.resolve('');
  }

  if (commonDetailImageUrlCache !== null) {
    return Promise.resolve(commonDetailImageUrlCache);
  }

  if (!commonDetailImageUrlPromise) {
    commonDetailImageUrlPromise = getDownloadURL(ref(storage, commonDetailImagePath))
      .then((url) => {
        commonDetailImageUrlCache = url;
        return url;
      })
      .catch(() => {
        commonDetailImageUrlCache = '';
        return '';
      });
  }

  return commonDetailImageUrlPromise;
}

async function loadGlobalNoticeUrls() {
  if (!storage) {
    return [];
  }

  if (Array.isArray(globalNoticeUrlsCache)) {
    return globalNoticeUrlsCache;
  }

  if (!globalNoticeUrlsPromise) {
    globalNoticeUrlsPromise = listAll(ref(storage, 'products/notice'))
      .then(async (listed) => {
        const items = [...(listed?.items || [])].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
        const urls = await Promise.all(items.map((item) => getDownloadURL(item).catch(() => '')));
        globalNoticeUrlsCache = urls.map((url) => String(url || '').trim()).filter(Boolean).slice(0, 5);
        return globalNoticeUrlsCache;
      })
      .catch(() => {
        globalNoticeUrlsCache = [];
        return globalNoticeUrlsCache;
      });
  }

  return globalNoticeUrlsPromise;
}

function isImageUrl(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) {
    return false;
  }
  if (text.includes('firebasestorage.googleapis.com')) {
    return true;
  }
  return /\.(png|jpe?g|webp|gif|bmp|svg)(\?|#|$)/.test(text);
}

function parsePriceValue(value) {
  return Number(String(value ?? '').replace(/[^\d]/g, '')) || 0;
}

function ProductDetailPage({ user, profile }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [catalogVersion, setCatalogVersion] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [orderItems, setOrderItems] = useState(() => readOrderListItems());
  const [orderNotice, setOrderNotice] = useState('');
  const [orderNoticeType, setOrderNoticeType] = useState('success');
  const [commonDetailImageUrl, setCommonDetailImageUrl] = useState('');
  const [globalNoticeUrls, setGlobalNoticeUrls] = useState([]);

  useEffect(() => {
    return subscribeCatalogUpdates(() => {
      setCatalogVersion((prev) => prev + 1);
    });
  }, []);

  useEffect(() => {
    return subscribeOrderListUpdates(() => {
      setOrderItems(readOrderListItems());
    });
  }, []);

  useEffect(() => {
    let canceled = false;

    loadCommonDetailImageUrl().then((url) => {
      if (!canceled) {
        setCommonDetailImageUrl(url);
      }
    });

    return () => {
      canceled = true;
    };
  }, []);

  useEffect(() => {
    let canceled = false;

    loadGlobalNoticeUrls().then((urls) => {
      if (!canceled) {
        setGlobalNoticeUrls(urls);
      }
    });

    return () => {
      canceled = true;
    };
  }, []);

  const product = useMemo(() => getCatalogProductBySlug(slug), [slug, catalogVersion]);
  const [selectedImage, setSelectedImage] = useState(() => product?.image ?? product?.detailImages?.[0] ?? '');
  const orderUnitPriceLabel = product?.supplyPrice;
  const orderUnitPriceValue = parsePriceValue(orderUnitPriceLabel);
  const productNotices = useMemo(
    () =>
      [product?.notice_1, product?.notice_2, product?.notice_3, product?.notice_4, product?.notice_5]
        .map((item) => String(item || '').trim())
        .filter(Boolean),
    [product]
  );
  const notices = productNotices.length > 0 ? productNotices : globalNoticeUrls;
  const detailText = String(product?.detail ?? '').trim();
  const isDetailTokenOnly = /^spec[_ -]?\d+$/i.test(detailText);
  const detailSectionImages = useMemo(() => {
    const list = [];
    const first = String(product?.detailImage ?? '').trim() || commonDetailImageUrl;
    if (first) {
      list.push(first);
    }
    (product?.detailImages || []).forEach((item) => {
      const url = String(item || '').trim();
      if (url && !list.includes(url)) {
        list.push(url);
      }
    });
    return list;
  }, [product, commonDetailImageUrl]);

  useEffect(() => {
    setSelectedImage(product?.image ?? product?.detailImages?.[0] ?? '');
    setQuantity(1);
  }, [product]);

  const syncOrderItems = (nextItems) => {
    setOrderItems(nextItems);
    writeOrderListItems(nextItems);
  };

  const handleAddToOrderList = () => {
    if (!product) {
      return;
    }
    if (!user) {
      navigate('/login');
      return;
    }

    const next = [...orderItems];
    const existingIndex = next.findIndex((item) => item.slug === product.slug);

    if (existingIndex >= 0) {
      const existing = next[existingIndex];
      next[existingIndex] = {
        ...existing,
        quantity: existing.quantity + quantity,
        unitPriceLabel: orderUnitPriceLabel,
        unitPriceValue: orderUnitPriceValue,
        image: product.image
      };
    } else {
      next.push({
        slug: product.slug,
        model: product.model,
        image: product.image,
        quantity,
        unitPriceLabel: orderUnitPriceLabel,
        unitPriceValue: orderUnitPriceValue
      });
    }

    syncOrderItems(next);
    setOrderNotice('');
    openOrderListModal();
  };

  if (!product) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1240px] px-6 pb-20 pt-28 sm:px-10">
      <div className="mb-6 flex items-center gap-2 text-xs text-[var(--muted)]">
        <Link to="/" className="hover:underline">
          홈
        </Link>
        <span>/</span>
        <span>{product.model}</span>
      </div>

      <section className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="rounded-2xl border border-[var(--line)] bg-white p-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.45)] sm:p-6">
          <div className="overflow-hidden rounded-xl border border-[var(--line)]">
            <img
              src={selectedImage}
              alt={`${product.model} 상세 이미지`}
              decoding="async"
              className="aspect-square w-full bg-white object-contain"
            />
          </div>

        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.45)] sm:p-8">
          <p className="text-xs font-semibold tracking-[0.15em] text-[var(--muted)]">{product.brand}</p>
          <h1 className="mt-2 font-brand text-3xl tracking-[0.05em] text-[var(--navy)]">{product.model}</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {product.category} / {product.spec}
          </p>

          <p className="mt-5 text-sm leading-relaxed text-[var(--muted)]">{product.description}</p>

          <div className="mt-6 rounded-xl border border-[var(--line)] bg-[#f7f9fc] p-4">
            <p className="text-sm font-semibold text-[#7c8492]">
              공급가 : {product.supplyPrice || '-'}
            </p>
            <p className="mt-1 text-xs font-semibold tracking-[0.08em] text-[var(--muted)]">부가세 별도</p>
            <p className="mt-2 text-xs font-semibold tracking-[0.06em] text-[var(--muted)]">{product.leadTime}</p>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {(product.features || []).map((feature) => (
              <span
                key={feature}
                className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--navy)]"
              >
                {feature}
              </span>
            ))}
          </div>

          <div className="mt-7">
            <p className="text-xs font-semibold tracking-[0.08em] text-[var(--muted)]">수량</p>
            <div className="mt-2 inline-flex items-center overflow-hidden rounded-md border border-[var(--line)] bg-white">
              <button
                type="button"
                onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                className="h-10 w-10 border-r border-[var(--line)] text-lg font-semibold text-[var(--navy)]"
              >
                -
              </button>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setQuantity(Number.isFinite(value) && value > 0 ? Math.floor(value) : 1);
                }}
                className="h-10 w-16 border-0 text-center text-sm font-semibold text-[var(--navy)] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setQuantity((prev) => prev + 1)}
                className="h-10 w-10 border-l border-[var(--line)] text-lg font-semibold text-[var(--navy)]"
              >
                +
              </button>
            </div>
          </div>

          <div className="mt-7">
            <button
              onClick={handleAddToOrderList}
              className="rounded-md bg-[var(--gold)] px-6 py-3 text-sm font-bold tracking-[0.05em] text-[#101a2f] transition hover:brightness-95"
            >
              상품 추가 ({quantity})
            </button>
          </div>
          {orderNotice ? (
            <p className={`mt-3 text-sm font-medium ${orderNoticeType === 'error' ? 'text-red-600' : 'text-emerald-700'}`}>{orderNotice}</p>
          ) : null}
        </div>
      </section>

      {notices.length > 0 || detailText || detailSectionImages.length > 0 ? (
        <section className="mt-8 rounded-2xl border border-[var(--line)] bg-white p-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.45)] sm:p-6">
          <p className="text-xs font-semibold tracking-[0.12em] text-[var(--muted)]">NOTICE & DETAIL</p>
          <h2 className="mt-2 font-brand text-2xl tracking-[0.05em] text-[var(--navy)]">상품 안내</h2>

          {notices.length > 0 ? (
            <div className="mt-4 space-y-2">
              {notices.map((notice, index) => (
                isImageUrl(notice) ? (
                  <div key={`${index}-${notice}`} className="overflow-hidden rounded-lg border border-[var(--line)] bg-white">
                    <img
                      src={notice}
                      alt={`notice-${index + 1}`}
                      loading="lazy"
                      decoding="async"
                      className="w-full object-contain"
                    />
                  </div>
                ) : (
                  <div key={`${index}-${notice}`} className="rounded-lg border border-[var(--line)] bg-[#f8fbff] px-4 py-3 text-sm font-medium text-[var(--ink)]">
                    {notice}
                  </div>
                )
              ))}
            </div>
          ) : null}

          <div className="mt-5 rounded-xl border border-[var(--line)] bg-white p-4">
            <p className="text-xs font-semibold tracking-[0.1em] text-[var(--muted)]">DETAIL</p>

            {detailText && !isDetailTokenOnly ? (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--muted)]">{detailText}</p>
            ) : null}

            {detailSectionImages.length > 0 ? (
              <div className={detailText && !isDetailTokenOnly ? 'mt-4 space-y-3' : 'mt-3 space-y-3'}>
                {detailSectionImages.map((imageUrl, index) => (
                  <div key={`${index}-${imageUrl}`} className="overflow-hidden rounded-xl border border-[var(--line)] bg-white">
                    <img
                      src={imageUrl}
                      alt={`${product.model} 상세 안내 ${index + 1}`}
                      loading="lazy"
                      decoding="async"
                      className="w-full object-contain"
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </main>
  );
}

export default ProductDetailPage;

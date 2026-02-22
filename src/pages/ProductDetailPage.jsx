import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { canViewWholesalePrice } from '../lib/roles';
import { getCatalogProductBySlug, subscribeCatalogUpdates } from '../lib/productCatalog';
import {
  openOrderListModal,
  readOrderListItems,
  subscribeOrderListUpdates,
  writeOrderListItems
} from '../lib/orderRequests';

function parsePriceValue(value) {
  return Number(String(value ?? '').replace(/[^\d]/g, '')) || 0;
}

function ProductDetailPage({ user, profile }) {
  const { slug } = useParams();
  const [catalogVersion, setCatalogVersion] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [orderItems, setOrderItems] = useState(() => readOrderListItems());
  const [orderNotice, setOrderNotice] = useState('');

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

  const product = useMemo(() => getCatalogProductBySlug(slug), [slug, catalogVersion]);
  const [selectedImage, setSelectedImage] = useState(() => product?.detailImages?.[0] ?? product?.image ?? '');
  const isWholesaleAvailable = canViewWholesalePrice(profile?.role);
  const orderUnitPriceLabel = isWholesaleAvailable ? product?.wholesalePrice : product?.supplyPrice;
  const orderUnitPriceValue = parsePriceValue(orderUnitPriceLabel);

  useEffect(() => {
    setSelectedImage(product?.detailImages?.[0] ?? product?.image ?? '');
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
    setOrderNotice('상품이 발주 예정 목록에 추가되었습니다.');
    openOrderListModal();
  };

  if (!product) {
    return <Navigate to="/" replace />;
  }

  const specRows = [
    ['입력 전압', product.specs.input],
    ['출력 전압', product.specs.outputVoltage],
    ['출력 전류', product.specs.outputCurrent],
    ['정격 출력', product.specs.power],
    ['효율', product.specs.efficiency],
    ['동작 온도', product.specs.operatingTemp]
  ];

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
            <img src={selectedImage} alt={`${product.model} 상세 이미지`} className="h-[340px] w-full object-cover sm:h-[460px]" />
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {product.detailImages.map((image) => (
              <button
                key={image}
                onClick={() => setSelectedImage(image)}
                className={`overflow-hidden rounded-lg border transition ${
                  selectedImage === image ? 'border-[var(--gold)]' : 'border-[var(--line)] hover:border-[#9aa6b8]'
                }`}
              >
                <img src={image} alt={`${product.model} 썸네일`} className="h-20 w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.45)] sm:p-8">
          <p className="text-xs font-semibold tracking-[0.15em] text-[var(--muted)]">{product.brand}</p>
          <h1 className="mt-2 font-brand text-3xl tracking-[0.05em] text-[var(--navy)]">{product.model}</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">{product.category} · {product.spec}</p>

          <p className="mt-5 text-sm leading-relaxed text-[var(--muted)]">{product.description}</p>

          <div className="mt-6 rounded-xl border border-[var(--line)] bg-[#f7f9fc] p-4">
            <p className="text-sm font-semibold text-[#7c8492]">
              공급가 : <span className="line-through">{product.supplyPrice}</span>
            </p>
            {isWholesaleAvailable ? (
              <p className="mt-1 font-brand text-3xl font-bold text-[var(--navy)]">
                도매가 : {product.wholesalePrice}
              </p>
            ) : user ? (
              <p className="mt-1 font-brand text-3xl font-bold text-amber-600">도매가 승인대기중</p>
            ) : (
              <p className="mt-1 font-brand text-3xl font-bold text-red-600">도매가 로그인</p>
            )}
            <p className="mt-1 text-xs font-semibold tracking-[0.08em] text-[var(--muted)]">부가세 별도</p>
            <p className="mt-2 text-xs font-semibold tracking-[0.06em] text-[var(--muted)]">{product.leadTime}</p>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {product.features.map((feature) => (
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

          <div className="mt-7 flex gap-3">
            <button
              onClick={handleAddToOrderList}
              className="rounded-md bg-[var(--gold)] px-6 py-3 text-sm font-bold tracking-[0.05em] text-[#101a2f] transition hover:brightness-95"
            >
              상품 추가 ({quantity})
            </button>
            <button
              onClick={() => openOrderListModal()}
              className="rounded-md border border-[var(--navy)] px-6 py-3 text-sm font-semibold tracking-[0.05em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white"
            >
              발주 예정 목록 ({orderItems.length})
            </button>
          </div>
          {orderNotice ? <p className="mt-3 text-sm font-medium text-emerald-700">{orderNotice}</p> : null}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.45)] sm:p-8">
        <h2 className="font-brand text-2xl tracking-[0.05em] text-[var(--navy)]">상품 상세 정보</h2>

        <div className="mt-5 overflow-hidden rounded-xl border border-[var(--line)]">
          <table className="w-full border-collapse text-sm">
            <tbody>
              {specRows.map(([label, value]) => (
                <tr key={label} className="border-t border-[var(--line)] first:border-t-0">
                  <th className="w-40 bg-[#f7f9fc] px-4 py-3 text-left font-semibold text-[var(--muted)]">{label}</th>
                  <td className="px-4 py-3 text-[var(--ink)]">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 space-y-3">
          {product.detailImages.map((image) => (
            <div key={image} className="overflow-hidden rounded-xl border border-[var(--line)]">
              <img src={image} alt={`${product.model} 상세 배너`} className="h-[280px] w-full object-cover sm:h-[420px]" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export default ProductDetailPage;

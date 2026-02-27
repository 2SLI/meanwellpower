import { useEffect, useMemo, useState } from 'react';
import { FaShoppingCart } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import {
  appendOrderRequest,
  readOrderListItems,
  subscribeOrderListUpdates,
  subscribeOrderUiEvents,
  writeOrderListItems
} from '../lib/orderRequests';
import { canUseQuoteFeatures } from '../lib/roles';

function formatCurrency(value) {
  return `${new Intl.NumberFormat('ko-KR').format(value || 0)}원`;
}

function GlobalOrderDock({ user, profile }) {
  const navigate = useNavigate();
  const [isCartPanelOpen, setIsCartPanelOpen] = useState(false);
  const [orderItems, setOrderItems] = useState(() => readOrderListItems());
  const [orderNotice, setOrderNotice] = useState('');
  const [orderNoticeType, setOrderNoticeType] = useState('success');

  const totalOrderAmount = useMemo(
    () => orderItems.reduce((sum, item) => sum + Number(item.unitPriceValue || 0) * Number(item.quantity || 0), 0),
    [orderItems]
  );
  const vatAmount = useMemo(() => Math.round(totalOrderAmount * 0.1), [totalOrderAmount]);
  const totalWithVat = useMemo(() => totalOrderAmount + vatAmount, [totalOrderAmount, vatAmount]);

  useEffect(() => {
    return subscribeOrderListUpdates(() => {
      setOrderItems(readOrderListItems());
    });
  }, []);

  useEffect(() => {
    return subscribeOrderUiEvents((action) => {
      if (action === 'open-order-list') {
        setIsCartPanelOpen(true);
      }
    });
  }, []);

  const syncOrderItems = (nextItems) => {
    setOrderItems(nextItems);
    writeOrderListItems(nextItems);
  };

  const updateOrderQuantity = (targetSlug, nextQuantity) => {
    if (nextQuantity < 1) return;
    const next = orderItems.map((item) => (item.slug === targetSlug ? { ...item, quantity: nextQuantity } : item));
    syncOrderItems(next);
  };

  const removeOrderItem = (targetSlug) => {
    const next = orderItems.filter((item) => item.slug !== targetSlug);
    syncOrderItems(next);
  };

  const handlePlaceOrder = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (orderItems.length === 0) {
      setOrderNotice('장바구니가 비어 있습니다.');
      setOrderNoticeType('error');
      return;
    }
    setIsCartPanelOpen(false);
    navigate('/orders/checkout');
  };

  const handleRequestQuote = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!canUseQuoteFeatures(profile?.role)) {
      setOrderNotice('사업자회원만 주문/견적요청 기능을 사용할 수 있습니다.');
      setOrderNoticeType('error');
      return;
    }
    if (orderItems.length === 0) {
      setOrderNotice('장바구니가 비어 있습니다.');
      setOrderNoticeType('error');
      return;
    }

    const requestedAt = new Date().toISOString();
    const requesterUid = user?.uid || '';

    try {
      await appendOrderRequest({
        id: `QT-${Date.now()}`,
        type: 'quote',
        status: '견적요청',
        requestedAt,
        requesterUid,
        message: '견적 확인 후 이카운트를 통해 견적서를 발송드릴 예정입니다.',
        customer: {
          uid: requesterUid,
          email: user?.email || profile?.email || '',
          companyName: profile?.companyName || '-',
          phone: profile?.phone || '-'
        },
        items: orderItems.map((item) => ({
          slug: item.slug,
          model: item.model,
          quantity: item.quantity,
          unitPrice: item.unitPriceLabel,
          subtotal: Number(item.unitPriceValue || 0) * Number(item.quantity || 0)
        })),
        amountExVat: totalOrderAmount,
        vatAmount,
        totalAmount: totalWithVat
      });

      syncOrderItems([]);
      setOrderNotice('견적 요청이 접수되었습니다.');
      setOrderNoticeType('success');
    } catch {
      setOrderNotice('견적 요청 접수에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      setOrderNoticeType('error');
    }
  };

  const panelClassName =
    'h-full w-[92vw] max-w-sm overflow-y-auto border-l border-[var(--line)] bg-white p-4 shadow-[-20px_0_45px_-35px_rgba(15,23,42,0.65)] sm:w-full sm:max-w-md sm:p-7';

  return (
    <>
      <div className="fixed bottom-8 right-5 z-40 sm:bottom-10 sm:right-8">
        <button
          type="button"
          onClick={() => {
            if (!user) {
              navigate('/login');
              return;
            }
            setIsCartPanelOpen(true);
          }}
          className="relative inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#0b1630] text-white shadow-[0_20px_35px_-18px_rgba(8,14,30,0.75)] transition hover:brightness-110"
          aria-label="Cart"
          title="장바구니"
        >
          <FaShoppingCart className="text-[22px]" />
          {orderItems.length > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--gold)] px-1 text-[11px] font-bold text-[#101a2f]">
              {orderItems.length}
            </span>
          ) : null}
        </button>
      </div>

      {isCartPanelOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-[rgba(7,16,36,0.38)]" onClick={() => setIsCartPanelOpen(false)}>
          <aside className={panelClassName} onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-[0.12em] text-[var(--muted)]">CART</p>
                <h3 className="mt-1 font-brand text-2xl tracking-[0.05em] text-[var(--navy)]">장바구니 목록</h3>
              </div>
              <button type="button" onClick={() => setIsCartPanelOpen(false)} className="rounded-md border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-[var(--muted)]">
                닫기
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {orderItems.length === 0 ? (
                <div className="rounded-lg border border-[var(--line)] bg-[#f8fbff] p-4 text-sm text-[var(--muted)]">장바구니가 비어 있습니다.</div>
              ) : (
                orderItems.map((item) => (
                  <article key={item.slug} className="rounded-lg border border-[var(--line)] bg-white p-3">
                    <div className="flex gap-3">
                      <img
                        src={item.image}
                        alt={`${item.model} thumbnail`}
                        loading="lazy"
                        decoding="async"
                        className="h-14 w-14 rounded-md border border-[var(--line)] object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[var(--navy)]">{item.model}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">단가(부가세 별도): {item.unitPriceLabel}</p>
                        <p className="mt-1 text-xs font-semibold text-[var(--ink)]">소계: {formatCurrency(item.unitPriceValue * item.quantity)}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="inline-flex items-center overflow-hidden rounded-md border border-[var(--line)]">
                        <button type="button" onClick={() => updateOrderQuantity(item.slug, item.quantity - 1)} className="h-8 w-8 border-r border-[var(--line)] text-sm font-semibold text-[var(--navy)]">
                          -
                        </button>
                        <span className="inline-flex h-8 min-w-10 items-center justify-center px-2 text-xs font-semibold text-[var(--navy)]">{item.quantity}</span>
                        <button type="button" onClick={() => updateOrderQuantity(item.slug, item.quantity + 1)} className="h-8 w-8 border-l border-[var(--line)] text-sm font-semibold text-[var(--navy)]">
                          +
                        </button>
                      </div>
                      <button type="button" onClick={() => removeOrderItem(item.slug)} className="text-xs font-semibold text-red-600 hover:underline">
                        삭제
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>

            <div className="mt-5 rounded-lg border border-[var(--line)] bg-[#f8fbff] p-4">
              <p className="text-xs font-semibold tracking-[0.08em] text-[var(--muted)]">합계</p>
              <p className="mt-1 font-brand text-2xl text-[var(--navy)]">{formatCurrency(totalWithVat)}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">공급가 합계: {formatCurrency(totalOrderAmount)}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">부가세(10%): {formatCurrency(vatAmount)}</p>
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={orderItems.length === 0}
                className="w-full rounded-md bg-[var(--gold)] px-4 py-2.5 text-sm font-bold tracking-[0.05em] text-[#101a2f] disabled:cursor-not-allowed disabled:opacity-50"
              >
                주문하기
              </button>
              {canUseQuoteFeatures(profile?.role) ? (
                <button
                  type="button"
                  onClick={handleRequestQuote}
                  disabled={orderItems.length === 0}
                  className="mt-2 w-full rounded-md border border-[var(--navy)] bg-white px-4 py-2.5 text-sm font-bold tracking-[0.05em] text-[var(--navy)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  견적 요청하기
                </button>
              ) : null}
            </div>

            {orderNotice ? (
              <p className={`mt-3 text-sm font-medium ${orderNoticeType === 'error' ? 'text-red-600' : 'text-emerald-700'}`}>{orderNotice}</p>
            ) : null}
          </aside>
        </div>
      ) : null}
    </>
  );
}

export default GlobalOrderDock;







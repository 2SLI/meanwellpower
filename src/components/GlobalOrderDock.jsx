import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaShoppingCart } from 'react-icons/fa';
import {
  appendOrderRequest,
  readOrderListItems,
  readOrderRequests,
  subscribeOrderUiEvents,
  subscribeOrderUpdates,
  writeOrderListItems
} from '../lib/orderRequests';

function formatCurrency(value) {
  return `${new Intl.NumberFormat('ko-KR').format(value || 0)}원`;
}

function formatDateTime(value) {
  if (!value) {
    return '-';
  }
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function isRequestForCurrentUser(request, userUid, userEmail) {
  if (!request) {
    return false;
  }

  if (userUid) {
    if (request.requesterUid === userUid || request.customer?.uid === userUid) {
      return true;
    }
  }

  if (userEmail) {
    return String(request.customer?.email ?? '').toLowerCase() === String(userEmail).toLowerCase();
  }

  return false;
}

function GlobalOrderDock({ user, profile }) {
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isOrderHistoryModalOpen, setIsOrderHistoryModalOpen] = useState(false);
  const [isQuoteHistoryModalOpen, setIsQuoteHistoryModalOpen] = useState(false);

  // ✅ 카트 토글 → 3개 버튼 펼침/숨김
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);

  const [orderItems, setOrderItems] = useState(() => readOrderListItems());
  const [orderRequests, setOrderRequests] = useState(() => readOrderRequests());
  const [orderNotice, setOrderNotice] = useState('');
  const [orderNoticeType, setOrderNoticeType] = useState('success');

  const currentUserUid = user?.uid || '';
  const currentUserEmail = user?.email || profile?.email || '';

  const totalOrderAmount = useMemo(
    () => orderItems.reduce((sum, item) => sum + item.unitPriceValue * item.quantity, 0),
    [orderItems]
  );
  const vatAmount = useMemo(() => Math.round(totalOrderAmount * 0.1), [totalOrderAmount]);
  const totalWithVat = useMemo(() => totalOrderAmount + vatAmount, [totalOrderAmount, vatAmount]);

  const userOrderRequests = useMemo(
    () =>
      orderRequests.filter(
        (request) => request.type !== 'quote' && isRequestForCurrentUser(request, currentUserUid, currentUserEmail)
      ),
    [orderRequests, currentUserUid, currentUserEmail]
  );

  const userQuoteRequests = useMemo(
    () =>
      orderRequests.filter(
        (request) => request.type === 'quote' && isRequestForCurrentUser(request, currentUserUid, currentUserEmail)
      ),
    [orderRequests, currentUserUid, currentUserEmail]
  );

  useEffect(() => {
    return subscribeOrderUpdates(
      () => {
        setOrderItems(readOrderListItems());
        setOrderRequests(readOrderRequests());
      },
      { uid: user?.uid, role: profile?.role }
    );
  }, [user?.uid, profile?.role]);

  useEffect(() => {
    return subscribeOrderUiEvents((action) => {
      if (action === 'open-order-list') {
        setIsQuickMenuOpen(false);
        setIsOrderModalOpen(true);
        return;
      }
      if (action === 'open-order-history') {
        setIsQuickMenuOpen(false);
        setIsOrderHistoryModalOpen(true);
        return;
      }
      if (action === 'open-quote-history') {
        setIsQuickMenuOpen(false);
        setIsQuoteHistoryModalOpen(true);
      }
    });
  }, []);

  // 모달 열릴 때 카트 메뉴 자동 닫기
  useEffect(() => {
    if (isOrderModalOpen || isOrderHistoryModalOpen || isQuoteHistoryModalOpen) {
      setIsQuickMenuOpen(false);
    }
  }, [isOrderModalOpen, isOrderHistoryModalOpen, isQuoteHistoryModalOpen]);

  const syncOrderItems = (nextItems) => {
    setOrderItems(nextItems);
    writeOrderListItems(nextItems);
  };

  const updateOrderQuantity = (targetSlug, nextQuantity) => {
    if (nextQuantity < 1) return;

    const next = orderItems.map((item) =>
      item.slug === targetSlug
        ? {
            ...item,
            quantity: nextQuantity
          }
        : item
    );

    syncOrderItems(next);
  };

  const removeOrderItem = (targetSlug) => {
    const next = orderItems.filter((item) => item.slug !== targetSlug);
    syncOrderItems(next);
  };

  const handlePlaceOrder = async () => {
    if (orderItems.length === 0) {
      setOrderNotice('발주 예정 목록이 비어 있습니다.');
      setOrderNoticeType('error');
      return;
    }

    if (!user) {
      setOrderNotice('주문하기는 로그인 후 이용할 수 있습니다.');
      setOrderNoticeType('error');
      return;
    }

    const requestId = `PO-${Date.now()}`;
    const requestedAt = new Date().toISOString();
    const customerEmail = user?.email || profile?.email || '';
    const customerCompany = profile?.companyName || '-';
    const requesterUid = user?.uid || '';

    try {
      await appendOrderRequest({
        id: requestId,
        type: 'order',
        status: '접수요청',
        requestedAt,
        requesterUid,
        message: '재고 확인 후 이카운트를 통해 발주서를 발송드릴 예정입니다.',
        customer: {
          uid: requesterUid,
          email: customerEmail,
          companyName: customerCompany,
          phone: profile?.phone || '-'
        },
        items: orderItems.map((item) => ({
          slug: item.slug,
          model: item.model,
          quantity: item.quantity,
          unitPrice: item.unitPriceLabel,
          subtotal: item.unitPriceValue * item.quantity
        })),
        amountExVat: totalOrderAmount,
        vatAmount,
        totalAmount: totalWithVat
      });

      syncOrderItems([]);
      setIsOrderModalOpen(false);
      setIsOrderHistoryModalOpen(true);
      setOrderNotice('주문이 접수되었습니다. 재고 확인 후 이카운트를 통해 발주서를 발송드릴 예정입니다.');
      setOrderNoticeType('success');
    } catch (error) {
      setOrderNotice('주문 접수에 실패했습니다. Firestore 권한/설정을 확인해 주세요.');
      setOrderNoticeType('error');
    }
  };

  const handleQuoteRequest = async () => {
    if (orderItems.length === 0) {
      setOrderNotice('발주 예정 목록이 비어 있습니다.');
      setOrderNoticeType('error');
      return;
    }

    if (!user) {
      setOrderNotice('견적요청은 로그인 후 이용할 수 있습니다.');
      setOrderNoticeType('error');
      return;
    }

    const requestId = `QT-${Date.now()}`;
    const requestedAt = new Date().toISOString();
    const customerEmail = user?.email || profile?.email || '';
    const customerCompany = profile?.companyName || '-';
    const requesterUid = user?.uid || '';

    try {
      await appendOrderRequest({
        id: requestId,
        type: 'quote',
        status: '견적요청',
        requestedAt,
        requesterUid,
        message: '견적 확인 후 이카운트를 통해 견적서를 발송드릴 예정입니다.',
        customer: {
          uid: requesterUid,
          email: customerEmail,
          companyName: customerCompany,
          phone: profile?.phone || '-'
        },
        items: orderItems.map((item) => ({
          slug: item.slug,
          model: item.model,
          quantity: item.quantity,
          unitPrice: item.unitPriceLabel,
          subtotal: item.unitPriceValue * item.quantity
        })),
        amountExVat: totalOrderAmount,
        vatAmount,
        totalAmount: totalWithVat
      });

      syncOrderItems([]);
      setIsOrderModalOpen(false);
      setIsQuoteHistoryModalOpen(true);
      setOrderNotice('견적요청이 접수되었습니다. 견적 확인 후 이카운트를 통해 견적서를 발송드릴 예정입니다.');
      setOrderNoticeType('success');
    } catch (error) {
      setOrderNotice('견적 요청 접수에 실패했습니다. Firestore 권한/설정을 확인해 주세요.');
      setOrderNoticeType('error');
    }
  };

  // ✅ 모바일 모달 폭/패딩 줄인 aside 공통 클래스
  const panelClassName =
    'h-full w-[92vw] max-w-sm overflow-y-auto border-l border-[var(--line)] bg-white p-4 shadow-[-20px_0_45px_-35px_rgba(15,23,42,0.65)] sm:w-full sm:max-w-md sm:p-7';

  return (
    <>
      {/* ✅ 메뉴 펼친 상태에서 바깥 클릭하면 닫힘 (모바일에서 특히 유용) */}
      {isQuickMenuOpen ? (
        <button
          type="button"
          aria-label="close quick menu"
          onClick={() => setIsQuickMenuOpen(false)}
          className="fixed inset-0 z-30 bg-transparent"
        />
      ) : null}

      {/* FLOATING DOCK */}
      <div className="fixed bottom-8 right-5 z-40 flex flex-col items-end gap-3 sm:bottom-10 sm:right-8">
        {/* 펼쳐지는 3개 버튼 */}
        <button
          type="button"
          onClick={() => {
            setIsOrderHistoryModalOpen(true);
            setIsQuickMenuOpen(false);
          }}
          className={[
            'relative inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-[#1b2b4c] text-center text-[10px] font-bold leading-[1.2] tracking-[0.02em] text-white shadow-[0_18px_30px_-18px_rgba(8,14,30,0.7)] transition',
            isQuickMenuOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95 pointer-events-none'
          ].join(' ')}
          style={{ transitionDuration: '180ms' }}
        >
          주문
          <br />
          내역
          {userOrderRequests.length > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--gold)] px-1 text-[10px] font-bold text-[#101a2f]">
              {userOrderRequests.length}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => {
            setIsQuoteHistoryModalOpen(true);
            setIsQuickMenuOpen(false);
          }}
          className={[
            'relative inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-[#1b2b4c] text-center text-[10px] font-bold leading-[1.2] tracking-[0.02em] text-white shadow-[0_18px_30px_-18px_rgba(8,14,30,0.7)] transition',
            isQuickMenuOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95 pointer-events-none'
          ].join(' ')}
          style={{ transitionDuration: '180ms', transitionDelay: isQuickMenuOpen ? '40ms' : '0ms' }}
        >
          견적
          <br />
          확인
          {userQuoteRequests.length > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--gold)] px-1 text-[10px] font-bold text-[#101a2f]">
              {userQuoteRequests.length}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => {
            setIsOrderModalOpen(true);
            setIsQuickMenuOpen(false);
          }}
          className={[
            'relative inline-flex h-16 w-16 items-center justify-center rounded-full bg-[var(--navy)] text-center text-[11px] font-bold leading-[1.15] tracking-[0.03em] text-white shadow-[0_20px_35px_-18px_rgba(8,14,30,0.75)] transition hover:brightness-110',
            isQuickMenuOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95 pointer-events-none'
          ].join(' ')}
          style={{ transitionDuration: '180ms', transitionDelay: isQuickMenuOpen ? '80ms' : '0ms' }}
        >
          발주
          <br />
          예정
          {orderItems.length > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--gold)] px-1 text-[11px] font-bold text-[#101a2f]">
              {orderItems.length}
            </span>
          ) : null}
        </button>

        {/* ✅ 기본 카트 버튼 (토글 전용, 모달 없음) */}
        <button
          type="button"
          onClick={() => setIsQuickMenuOpen((v) => !v)}
          className="relative inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#0b1630] text-white shadow-[0_20px_35px_-18px_rgba(8,14,30,0.75)] transition hover:brightness-110"
          aria-expanded={isQuickMenuOpen}
          aria-label="Cart menu"
        >
          <FaShoppingCart className="text-[22px]" />
          {orderItems.length > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--gold)] px-1 text-[11px] font-bold text-[#101a2f]">
              {orderItems.length}
            </span>
          ) : null}

          <span
            className={`absolute -left-1 -bottom-1 h-3 w-3 rounded-full border border-white/30 ${
              isQuickMenuOpen ? 'bg-[var(--gold)]' : 'bg-white/20'
            }`}
          />
        </button>
      </div>

      {/* 주문내역 모달 */}
      {isOrderHistoryModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-[rgba(7,16,36,0.38)]"
          onClick={() => setIsOrderHistoryModalOpen(false)}
        >
          <aside className={panelClassName} onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-[0.12em] text-[var(--muted)]">ORDER HISTORY</p>
                <h3 className="mt-1 font-brand text-2xl tracking-[0.05em] text-[var(--navy)]">주문내역</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOrderHistoryModalOpen(false)}
                className="rounded-md border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-[var(--muted)]"
              >
                닫기
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {userOrderRequests.length === 0 ? (
                <div className="rounded-lg border border-[var(--line)] bg-[#f8fbff] p-4 text-sm text-[var(--muted)]">
                  주문내역이 없습니다.
                </div>
              ) : (
                userOrderRequests.map((request) => (
                  <article key={request.id} className="rounded-lg border border-[var(--line)] bg-white p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[var(--navy)]">{request.id}</p>
                      <span className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">
                        {request.status || '접수요청'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--muted)]">요청일시: {formatDateTime(request.requestedAt)}</p>
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      {(request.items || []).map((item) => `${item.model} x${item.quantity}`).join(', ')}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[var(--ink)]">
                      결제금액(부가세 포함): {formatCurrency(request.totalAmount)}
                    </p>
                    <p className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                      {request.message || '재고 확인 후 이카운트를 통해 발주서를 발송드릴 예정입니다.'}
                    </p>
                  </article>
                ))
              )}
            </div>

            <Link
              to="/orders/history"
              onClick={() => setIsOrderHistoryModalOpen(false)}
              className="mt-5 inline-flex rounded-md border border-[var(--navy)] px-4 py-2 text-xs font-semibold tracking-[0.06em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white"
            >
              주문내역 페이지로 이동
            </Link>
          </aside>
        </div>
      ) : null}

      {/* 견적확인 모달 */}
      {isQuoteHistoryModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-[rgba(7,16,36,0.38)]"
          onClick={() => setIsQuoteHistoryModalOpen(false)}
        >
          <aside className={panelClassName} onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-[0.12em] text-[var(--muted)]">QUOTE REQUEST CHECK</p>
                <h3 className="mt-1 font-brand text-2xl tracking-[0.05em] text-[var(--navy)]">견적 요청 확인</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsQuoteHistoryModalOpen(false)}
                className="rounded-md border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-[var(--muted)]"
              >
                닫기
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {userQuoteRequests.length === 0 ? (
                <div className="rounded-lg border border-[var(--line)] bg-[#f8fbff] p-4 text-sm text-[var(--muted)]">
                  견적요청 내역이 없습니다.
                </div>
              ) : (
                userQuoteRequests.map((request) => (
                  <article key={request.id} className="rounded-lg border border-[var(--line)] bg-white p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[var(--navy)]">{request.id}</p>
                      <span className="rounded-md border border-sky-300 bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700">
                        {request.status || '견적요청'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--muted)]">요청일시: {formatDateTime(request.requestedAt)}</p>
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      {(request.items || []).map((item) => `${item.model} x${item.quantity}`).join(', ')}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[var(--ink)]">
                      결제금액(부가세 포함): {formatCurrency(request.totalAmount)}
                    </p>
                    <p className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                      {request.message || '견적 확인 후 이카운트를 통해 견적서를 발송드릴 예정입니다.'}
                    </p>
                  </article>
                ))
              )}
            </div>

            <Link
              to="/quotes/requests"
              onClick={() => setIsQuoteHistoryModalOpen(false)}
              className="mt-5 inline-flex rounded-md border border-[var(--navy)] px-4 py-2 text-xs font-semibold tracking-[0.06em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white"
            >
              견적요청 페이지로 이동
            </Link>
          </aside>
        </div>
      ) : null}

      {/* 발주예정 모달 */}
      {isOrderModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-[rgba(7,16,36,0.38)]"
          onClick={() => setIsOrderModalOpen(false)}
        >
          <aside className={panelClassName} onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-[0.12em] text-[var(--muted)]">PENDING ORDER LIST</p>
                <h3 className="mt-1 font-brand text-2xl tracking-[0.05em] text-[var(--navy)]">발주 예정 목록</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOrderModalOpen(false)}
                className="rounded-md border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-[var(--muted)]"
              >
                닫기
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {orderItems.length === 0 ? (
                <div className="rounded-lg border border-[var(--line)] bg-[#f8fbff] p-4 text-sm text-[var(--muted)]">
                  발주 예정 목록이 비어 있습니다.
                </div>
              ) : (
                orderItems.map((item) => (
                  <article key={item.slug} className="rounded-lg border border-[var(--line)] bg-white p-3">
                    <div className="flex gap-3">
                      <img
                        src={item.image}
                        alt={`${item.model} 썸네일`}
                        className="h-14 w-14 rounded-md border border-[var(--line)] object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[var(--navy)]">{item.model}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">단가(부가세 별도) : {item.unitPriceLabel}</p>
                        <p className="mt-1 text-xs font-semibold text-[var(--ink)]">
                          소계 : {formatCurrency(item.unitPriceValue * item.quantity)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="inline-flex items-center overflow-hidden rounded-md border border-[var(--line)]">
                        <button
                          type="button"
                          onClick={() => updateOrderQuantity(item.slug, item.quantity - 1)}
                          className="h-8 w-8 border-r border-[var(--line)] text-sm font-semibold text-[var(--navy)]"
                        >
                          -
                        </button>
                        <span className="inline-flex h-8 min-w-10 items-center justify-center px-2 text-xs font-semibold text-[var(--navy)]">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateOrderQuantity(item.slug, item.quantity + 1)}
                          className="h-8 w-8 border-l border-[var(--line)] text-sm font-semibold text-[var(--navy)]"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeOrderItem(item.slug)}
                        className="text-xs font-semibold text-red-600 hover:underline"
                      >
                        삭제
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>

            <div className="mt-5 rounded-lg border border-[var(--line)] bg-[#f8fbff] p-4">
              <p className="text-xs font-semibold tracking-[0.08em] text-[var(--muted)]">결제금액 (부가세 포함)</p>
              <p className="mt-1 font-brand text-2xl text-[var(--navy)]">{formatCurrency(totalWithVat)}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">공급가 합계(부가세 별도) : {formatCurrency(totalOrderAmount)}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">부가세(10%) : {formatCurrency(vatAmount)}</p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                onClick={handlePlaceOrder}
                className="rounded-md bg-[var(--gold)] px-4 py-2.5 text-sm font-bold tracking-[0.05em] text-[#101a2f]"
              >
                주문하기
              </button>
              <button
                onClick={handleQuoteRequest}
                className="rounded-md border border-[var(--navy)] px-4 py-2.5 text-sm font-semibold tracking-[0.05em] text-[var(--navy)]"
              >
                견적요청
              </button>
            </div>

            {orderNotice ? (
              <p className={`mt-4 text-sm font-medium ${orderNoticeType === 'error' ? 'text-red-600' : 'text-emerald-700'}`}>
                {orderNotice}
              </p>
            ) : null}
          </aside>
        </div>
      ) : null}
    </>
  );
}

export default GlobalOrderDock;
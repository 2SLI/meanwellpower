import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { readOrderRequests, subscribeOrderUpdates } from '../lib/orderRequests';

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

function isOwnRequest(request, uid, email) {
  if (uid && (request.requesterUid === uid || request.customer?.uid === uid)) {
    return true;
  }
  if (email) {
    return String(request.customer?.email ?? '').toLowerCase() === String(email).toLowerCase();
  }
  return false;
}

function toPositiveQuantity(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function OrderDetailPage({ user, profile, authReady }) {
  const { orderId } = useParams();
  const [requests, setRequests] = useState(() => readOrderRequests());
  const [isHydrated, setIsHydrated] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    return subscribeOrderUpdates(
      () => {
        setRequests(readOrderRequests());
        setIsHydrated(true);
      },
      { uid: user?.uid, role: profile?.role }
    );
  }, [user?.uid, profile?.role]);

  if (!authReady) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-[1080px] px-6 pb-20 pt-28 sm:px-10">
        <section className="rounded-2xl border border-[var(--line)] bg-white p-8">
          <p className="text-sm text-[var(--muted)]">주문상세를 불러오는 중입니다...</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ message: '주문상세는 로그인 후 확인할 수 있습니다.' }} />;
  }

  const userUid = user?.uid || '';
  const userEmail = user?.email || profile?.email || '';

  const order = useMemo(
    () =>
      requests.find(
        (request) =>
          request.type !== 'quote' && request.id === orderId && isOwnRequest(request, userUid, userEmail)
      ) ?? null,
    [requests, orderId, userUid, userEmail]
  );

  const previewItems = useMemo(
    () => (order?.items || []).filter((item) => toPositiveQuantity(item?.quantity) > 0),
    [order]
  );

  const totalLineCount = previewItems.length;
  const totalQuantity = useMemo(
    () => previewItems.reduce((sum, item) => sum + toPositiveQuantity(item.quantity), 0),
    [previewItems]
  );

  if (!isHydrated && !order) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-[1080px] px-6 pb-20 pt-28 sm:px-10">
        <section className="rounded-2xl border border-[var(--line)] bg-white p-8">
          <p className="text-sm text-[var(--muted)]">주문상세를 조회하는 중입니다...</p>
        </section>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-[1080px] px-6 pb-20 pt-28 sm:px-10">
        <section className="rounded-2xl border border-[var(--line)] bg-white p-8">
          <h1 className="font-brand text-3xl tracking-[0.05em] text-[var(--navy)]">주문상세</h1>
          <p className="mt-3 text-sm text-[var(--muted)]">해당 주문을 찾을 수 없거나 접근 권한이 없습니다.</p>
          <Link
            to="/orders/history"
            className="mt-5 inline-flex rounded-md border border-[var(--navy)] px-4 py-2 text-xs font-semibold tracking-[0.06em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white"
          >
            주문내역으로 이동
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1080px] px-6 pb-20 pt-28 sm:px-10">
      <section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[0_20px_44px_-34px_rgba(15,23,42,0.45)] sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.12em] text-[var(--muted)]">ORDER DETAIL</p>
            <h1 className="mt-1 font-brand text-3xl tracking-[0.05em] text-[var(--navy)]">주문상세</h1>
          </div>
          <span className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
            {order.status || '접수요청'}
          </span>
        </div>

        <div className="mt-5 grid gap-3 rounded-xl border border-[var(--line)] bg-[#fcfdff] p-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold tracking-[0.08em] text-[var(--muted)]">주문번호</p>
            <p className="mt-1 font-semibold text-[var(--navy)]">{order.id}</p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-[0.08em] text-[var(--muted)]">주문일시</p>
            <p className="mt-1 text-[var(--ink)]">{formatDateTime(order.requestedAt)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-[0.08em] text-[var(--muted)]">구매자</p>
            <p className="mt-1 text-[var(--ink)]">{order.customer?.companyName || '-'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-[0.08em] text-[var(--muted)]">연락처</p>
            <p className="mt-1 text-[var(--ink)]">{order.customer?.phone || '-'}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="rounded-md bg-[var(--gold)] px-4 py-2 text-sm font-bold tracking-[0.05em] text-[#101a2f] transition hover:brightness-95"
          >
            발주요청서 미리보기
          </button>
          <Link
            to="/orders/history"
            className="rounded-md border border-[var(--navy)] px-4 py-2 text-sm font-semibold tracking-[0.05em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white"
          >
            주문내역 목록
          </Link>
        </div>
      </section>

      {isPreviewOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(7,16,36,0.38)] p-4" onClick={() => setIsPreviewOpen(false)}>
          <section
            className="max-h-[88vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[0_30px_60px_-35px_rgba(15,23,42,0.5)] sm:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-[0.12em] text-[var(--muted)]">ORDER REQUEST SHEET</p>
                <h2 className="mt-1 font-brand text-2xl tracking-[0.05em] text-[var(--navy)]">발주요청서(미리보기)</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="rounded-md border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-[var(--muted)]"
              >
                닫기
              </button>
            </div>

            <p className="mt-4 rounded-lg border border-[#dce4f2] bg-[#f7faff] px-4 py-3 text-sm text-[var(--muted)]">
              요청 전 품목과 수량을 확인해 주세요. 요청 완료 후 정식 발주서는 당사 시스템(eCount)에서 발송됩니다.
            </p>

            <div className="mt-4 grid gap-3 rounded-xl border border-[var(--line)] bg-[#fcfdff] p-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold tracking-[0.08em] text-[var(--muted)]">주문번호</p>
                <p className="mt-1 font-semibold text-[var(--navy)]">{order.id}</p>
              </div>
              <div>
                <p className="text-xs font-semibold tracking-[0.08em] text-[var(--muted)]">주문일시</p>
                <p className="mt-1 text-[var(--ink)]">{formatDateTime(order.requestedAt)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold tracking-[0.08em] text-[var(--muted)]">구매자</p>
                <p className="mt-1 text-[var(--ink)]">{order.customer?.companyName || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold tracking-[0.08em] text-[var(--muted)]">연락처</p>
                <p className="mt-1 text-[var(--ink)]">{order.customer?.phone || '-'}</p>
              </div>
            </div>

            <div className="mt-5 overflow-x-auto rounded-xl border border-[var(--line)] bg-white">
              <table className="min-w-[920px] w-full border-collapse text-left text-sm">
                <thead className="bg-[var(--navy)] text-white">
                  <tr>
                    <th className="px-4 py-3 font-semibold">모델</th>
                    <th className="px-4 py-3 font-semibold">상품명</th>
                    <th className="px-4 py-3 font-semibold">옵션</th>
                    <th className="px-4 py-3 text-right font-semibold">수량</th>
                    <th className="px-4 py-3 font-semibold">단위</th>
                    <th className="px-4 py-3 font-semibold">비고</th>
                  </tr>
                </thead>
                <tbody>
                  {previewItems.map((item, index) => (
                    <tr key={`${item.slug || item.model || 'row'}-${index}`} className="border-t border-[var(--line)] bg-white">
                      <td className="max-w-[220px] px-4 py-3 text-[var(--ink)]" title={item.model || '-'}>
                        <p className="truncate">{item.model || '-'}</p>
                      </td>
                      <td className="max-w-[240px] px-4 py-3 text-[var(--ink)]" title="-">
                        <p className="truncate">-</p>
                      </td>
                      <td className="max-w-[200px] px-4 py-3 text-[var(--ink)]" title="-">
                        <p className="truncate">-</p>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-[var(--navy)]">{toPositiveQuantity(item.quantity)}</td>
                      <td className="px-4 py-3 text-[var(--ink)]">-</td>
                      <td className="max-w-[220px] px-4 py-3 text-[var(--ink)]" title="-">
                        <p className="truncate">-</p>
                      </td>
                    </tr>
                  ))}

                  {previewItems.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-[var(--muted)]" colSpan={6}>
                        표시할 품목이 없습니다.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-[var(--line)] bg-[#f8fbff] p-4">
                <p className="text-xs font-semibold tracking-[0.08em] text-[var(--muted)]">총 품목 수</p>
                <p className="mt-1 font-brand text-2xl text-[var(--navy)]">{totalLineCount}</p>
              </div>
              <div className="rounded-lg border border-[var(--line)] bg-[#f8fbff] p-4">
                <p className="text-xs font-semibold tracking-[0.08em] text-[var(--muted)]">총 수량 합계</p>
                <p className="mt-1 font-brand text-2xl text-[var(--navy)]">{totalQuantity}</p>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

export default OrderDetailPage;

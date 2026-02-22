import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { readOrderRequests, subscribeOrderUpdates } from '../lib/orderRequests';

function formatCurrency(value) {
  return `${new Intl.NumberFormat('ko-KR').format(Number(value || 0))}원`;
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

function isOwnRequest(request, uid, email) {
  if (uid && (request.requesterUid === uid || request.customer?.uid === uid)) {
    return true;
  }
  if (email) {
    return String(request.customer?.email ?? '').toLowerCase() === String(email).toLowerCase();
  }
  return false;
}

function OrderHistoryPage({ user, profile, authReady }) {
  const [requests, setRequests] = useState(() => readOrderRequests());

  useEffect(() => {
    return subscribeOrderUpdates(
      () => {
        setRequests(readOrderRequests());
      },
      { uid: user?.uid, role: profile?.role }
    );
  }, [user?.uid, profile?.role]);

  if (!authReady) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-[1080px] px-6 pb-20 pt-28 sm:px-10">
        <section className="rounded-2xl border border-[var(--line)] bg-white p-8">
          <p className="text-sm text-[var(--muted)]">주문내역을 불러오는 중입니다...</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ message: '주문내역은 로그인 후 확인할 수 있습니다.' }} />;
  }

  const userUid = user?.uid || '';
  const userEmail = user?.email || profile?.email || '';

  const orderRequests = requests.filter(
    (request) => request.type !== 'quote' && isOwnRequest(request, userUid, userEmail)
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1080px] px-6 pb-20 pt-28 sm:px-10">
      <section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[0_20px_44px_-34px_rgba(15,23,42,0.45)] sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.12em] text-[var(--muted)]">ORDER HISTORY</p>
            <h1 className="mt-1 font-brand text-3xl tracking-[0.05em] text-[var(--navy)]">주문내역</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">주문 접수 상태와 안내 문구를 확인할 수 있습니다.</p>
          </div>
          <Link
            to="/"
            className="rounded-md border border-[var(--navy)] px-4 py-2 text-xs font-semibold tracking-[0.06em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white"
          >
            메인으로
          </Link>
        </div>

        <div className="mt-5 space-y-3">
          {orderRequests.length === 0 ? (
            <div className="rounded-xl border border-[var(--line)] bg-[#f8fbff] p-5 text-sm text-[var(--muted)]">
              주문내역이 없습니다.
            </div>
          ) : (
            orderRequests.map((request) => (
              <article key={request.id} className="rounded-xl border border-[var(--line)] bg-[#fcfdff] p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-[var(--navy)]">{request.id}</p>
                  <span className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                    {request.status || '접수요청'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--muted)]">요청일시: {formatDateTime(request.requestedAt)}</p>
                <p className="mt-2 text-sm text-[var(--ink)]">
                  {(request.items || [])
                    .map((item) => `${item.model} x${item.quantity}`)
                    .join(', ')}
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--ink)]">결제금액(부가세 포함): {formatCurrency(request.totalAmount)}</p>
                <p className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                  {request.message || '재고 확인 후 이카운트를 통해 발주서를 발송드릴 예정입니다.'}
                </p>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

export default OrderHistoryPage;

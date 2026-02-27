import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import AddressBookSection from '../components/order/AddressBookSection';
import AddressFields from '../components/order/AddressFields';
import { appendOrderRequest, readOrderListItems, writeOrderListItems } from '../lib/orderRequests';
import { ORDER_STATUS_FLOW } from '../lib/orderStatus';
import { USER_ROLES } from '../lib/roles';
import { deleteAddressBookEntry, readAddressBook, upsertAddressBookEntry } from '../lib/shippingAddressBook';

function formatCurrency(value) {
  return `${new Intl.NumberFormat('ko-KR').format(Number(value || 0))}원`;
}

function normalizePhone(value) {
  return String(value || '').replace(/[^\d]/g, '');
}

function isFilledAddress(address) {
  return Boolean(String(address?.name || '').trim() && String(address?.phone || '').trim() && String(address?.address || '').trim());
}

function OrderCheckoutPage({ user, profile, authReady }) {
  const navigate = useNavigate();
  const orderItems = useMemo(() => readOrderListItems(), []);
  const [addressBook, setAddressBook] = useState(() => readAddressBook(user?.uid));
  const [notice, setNotice] = useState('');
  const [noticeType, setNoticeType] = useState('success');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [generalRecipient, setGeneralRecipient] = useState({ name: '', phone: '', address: '', addressDetail: '' });
  const [sender, setSender] = useState({ name: '', phone: '', address: '', addressDetail: '' });
  const [receiver, setReceiver] = useState({ name: '', phone: '', address: '', addressDetail: '' });

  if (!authReady) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-[1200px] px-6 pb-20 pt-28 sm:px-10">
        <section className="rounded-2xl border border-[var(--line)] bg-white p-8">
          <p className="text-sm text-[var(--muted)]">주문 정보를 불러오는 중입니다...</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ message: '주문하기는 로그인 후 이용 가능합니다.' }} />;
  }

  if (!orderItems.length) {
    return <Navigate to="/" replace state={{ message: '장바구니가 비어 있습니다.' }} />;
  }

  const isEnterprise = profile?.role === USER_ROLES.ENTERPRISE || profile?.role === USER_ROLES.ADMIN;
  const amountExVat = orderItems.reduce((sum, item) => sum + Number(item.unitPriceValue || 0) * Number(item.quantity || 0), 0);
  const vatAmount = Math.round(amountExVat * 0.1);
  const totalAmount = amountExVat + vatAmount;

  const patchAddress = (setter) => (field, value) => {
    setter((prev) => ({ ...prev, [field]: value }));
  };

  const saveAddress = (type, value, label) => {
    const result = upsertAddressBookEntry(user.uid, {
      type,
      label: String(label || '').trim() || value.name || '배송지',
      name: value.name,
      phone: normalizePhone(value.phone),
      address: value.address,
      addressDetail: value.addressDetail
    });
    setAddressBook(result.entries);
    setNotice(result.action === 'created' ? '배송지를 저장했습니다.' : '같은 배송지가 있어 갱신했습니다.');
    setNoticeType('success');
  };

  const updateAddress = (selectedId, type, value, label) => {
    const result = upsertAddressBookEntry(user.uid, {
      id: selectedId,
      type,
      label: String(label || '').trim() || value.name || '배송지',
      name: value.name,
      phone: normalizePhone(value.phone),
      address: value.address,
      addressDetail: value.addressDetail
    });
    setAddressBook(result.entries);
    setNotice('선택한 배송지를 수정했습니다.');
    setNoticeType('success');
  };

  const removeAddress = (selectedId) => {
    const next = deleteAddressBookEntry(user.uid, selectedId);
    setAddressBook(next);
    setNotice('선택한 배송지를 삭제했습니다.');
    setNoticeType('success');
  };

  const validate = () => {
    if (isEnterprise) {
      if (!isFilledAddress(sender)) return '보내는 사람 정보를 입력해 주세요.';
      if (!isFilledAddress(receiver)) return '받는 사람 정보를 입력해 주세요.';
      return '';
    }
    if (!isFilledAddress(generalRecipient)) return '받는 사람 정보를 입력해 주세요.';
    return '';
  };

  const handleSubmitOrder = async () => {
    const validationMessage = validate();
    if (validationMessage) {
      setNotice(validationMessage);
      setNoticeType('error');
      return;
    }

    try {
      setIsSubmitting(true);
      setNotice('');

      const requestPayload = {
        id: `PO-${Date.now()}`,
        type: 'order',
        status: ORDER_STATUS_FLOW[0],
        requestedAt: new Date().toISOString(),
        requesterUid: user.uid,
        message: '재고 확인 후 이카운트를 통해 발주서를 발송드릴 예정입니다.',
        customer: {
          uid: user.uid,
          email: user.email || profile?.email || '',
          companyName: profile?.companyName || '-',
          phone: profile?.phone || '-'
        },
        shipping: isEnterprise
          ? {
              sender: { ...sender, phone: normalizePhone(sender.phone) },
              receiver: { ...receiver, phone: normalizePhone(receiver.phone) }
            }
          : {
              recipient: { ...generalRecipient, phone: normalizePhone(generalRecipient.phone) }
            },
        items: orderItems.map((item) => ({
          slug: item.slug,
          model: item.model,
          quantity: Number(item.quantity || 0),
          unitPrice: item.unitPriceLabel,
          subtotal: Number(item.unitPriceValue || 0) * Number(item.quantity || 0)
        })),
        amountExVat,
        vatAmount,
        totalAmount
      };

      await appendOrderRequest(requestPayload);
      writeOrderListItems([]);
      navigate('/orders/history', { replace: true, state: { message: '주문이 접수되었습니다.' } });
    } catch {
      setNotice('주문 접수에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      setNoticeType('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1200px] px-6 pb-20 pt-28 sm:px-10">
      <div className="mb-6 flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-[var(--muted)]">ORDER CHECKOUT</p>
          <h1 className="mt-1 font-brand text-3xl tracking-[0.05em] text-[var(--navy)]">주문서 작성</h1>
        </div>
        <Link to="/" className="rounded-md border border-[var(--navy)] px-4 py-2 text-xs font-semibold text-[var(--navy)]">
          메인으로
        </Link>
      </div>

      <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          {isEnterprise ? (
            <>
              <AddressFields title="보내는 사람" value={sender} onChange={patchAddress(setSender)} />
              <AddressBookSection
                title="보내는 사람"
                type="enterprise_sender"
                entries={addressBook}
                onApply={(entry) => setSender({ name: entry.name, phone: entry.phone, address: entry.address, addressDetail: entry.addressDetail })}
                onSave={(label) => saveAddress('enterprise_sender', sender, label)}
                onUpdate={(selectedId, label) => updateAddress(selectedId, 'enterprise_sender', sender, label)}
                onDelete={removeAddress}
              />
              <AddressFields title="받는 사람" value={receiver} onChange={patchAddress(setReceiver)} />
              <AddressBookSection
                title="받는 사람"
                type="enterprise_receiver"
                entries={addressBook}
                onApply={(entry) => setReceiver({ name: entry.name, phone: entry.phone, address: entry.address, addressDetail: entry.addressDetail })}
                onSave={(label) => saveAddress('enterprise_receiver', receiver, label)}
                onUpdate={(selectedId, label) => updateAddress(selectedId, 'enterprise_receiver', receiver, label)}
                onDelete={removeAddress}
              />
            </>
          ) : (
            <>
              <AddressFields title="받는 사람" value={generalRecipient} onChange={patchAddress(setGeneralRecipient)} />
              <AddressBookSection
                title="받는 사람"
                type="general_recipient"
                entries={addressBook}
                onApply={(entry) =>
                  setGeneralRecipient({ name: entry.name, phone: entry.phone, address: entry.address, addressDetail: entry.addressDetail })
                }
                onSave={(label) => saveAddress('general_recipient', generalRecipient, label)}
                onUpdate={(selectedId, label) => updateAddress(selectedId, 'general_recipient', generalRecipient, label)}
                onDelete={removeAddress}
              />
            </>
          )}
        </div>

        <aside className="rounded-2xl border border-[var(--line)] bg-white p-5">
          <h2 className="text-sm font-bold tracking-[0.05em] text-[var(--navy)]">주문 품목</h2>
          <div className="mt-3 space-y-2">
            {orderItems.map((item) => (
              <div key={item.slug} className="rounded-lg border border-[var(--line)] bg-[#fcfdff] p-3">
                <p className="text-sm font-semibold text-[var(--navy)]">{item.model}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">수량 {item.quantity} / 단가 {item.unitPriceLabel}</p>
                <p className="mt-1 text-xs font-semibold text-[var(--ink)]">
                  소계 {formatCurrency(Number(item.unitPriceValue || 0) * Number(item.quantity || 0))}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-lg border border-[var(--line)] bg-[#f8fbff] p-4">
            <p className="text-xs text-[var(--muted)]">공급가 합계: {formatCurrency(amountExVat)}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">부가세: {formatCurrency(vatAmount)}</p>
            <p className="mt-2 text-base font-bold text-[var(--navy)]">총 결제금액: {formatCurrency(totalAmount)}</p>
          </div>

          <button
            type="button"
            onClick={handleSubmitOrder}
            disabled={isSubmitting}
            className="mt-4 w-full rounded-md bg-[var(--gold)] px-4 py-2.5 text-sm font-bold text-[#101a2f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? '주문 접수 중...' : '주문 접수'}
          </button>

          {notice ? (
            <p className={`mt-3 text-sm font-medium ${noticeType === 'error' ? 'text-red-600' : 'text-emerald-700'}`}>{notice}</p>
          ) : null}
        </aside>
      </section>
    </main>
  );
}

export default OrderCheckoutPage;

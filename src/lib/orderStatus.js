export const ORDER_STATUS_FLOW = ['주문확인중', '입금확인중', '배송준비중', '배송완료', '반품/교환'];

export const ORDER_STATUS_CANCELED = '주문취소';

export const ORDER_CANCELABLE_STATUSES = new Set(['주문확인중', '입금확인중']);

export function normalizeOrderStatus(status) {
  const text = String(status || '').trim();
  if (!text) {
    return ORDER_STATUS_FLOW[0];
  }
  if (text === '접수요청' || text === '접수대기') {
    return '주문확인중';
  }
  if (text === '검토중') {
    return '입금확인중';
  }
  if (text === '출고완료') {
    return '배송완료';
  }
  return text;
}

export function isOrderCancelable(status) {
  return ORDER_CANCELABLE_STATUSES.has(normalizeOrderStatus(status));
}

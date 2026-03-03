export function formatSupplyPriceLabel(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '-';

  const numeric = Number(raw.replace(/[^\d]/g, ''));
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return raw;
  }

  return `${numeric.toLocaleString('ko-KR')}원`;
}

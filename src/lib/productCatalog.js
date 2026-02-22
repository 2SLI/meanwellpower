import { products as seedProducts } from '../data/products';

const STORAGE_KEY = 'mw_custom_products_v1';
const UPDATE_EVENT = 'mw-products-updated';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function normalizeSlug(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeFeatures(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value ?? '')
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeDetailImages(value, fallbackImage) {
  if (Array.isArray(value)) {
    const cleaned = value.map((item) => String(item).trim()).filter(Boolean);
    if (cleaned.length > 0) {
      return cleaned;
    }
  }

  if (fallbackImage) {
    return [fallbackImage];
  }

  return [];
}

function normalizeProduct(raw) {
  const image = String(raw?.image ?? '').trim();
  const detailImages = normalizeDetailImages(raw?.detailImages, image);
  const slug = normalizeSlug(raw?.slug || raw?.model);

  return {
    slug,
    brand: String(raw?.brand ?? 'MEAN WELL').trim() || 'MEAN WELL',
    model: String(raw?.model ?? '').trim(),
    category: String(raw?.category ?? '').trim(),
    spec: String(raw?.spec ?? '').trim(),
    leadTime: String(raw?.leadTime ?? '').trim(),
    supplyPrice: String(raw?.supplyPrice ?? '').trim(),
    wholesalePrice: String(raw?.wholesalePrice ?? '').trim(),
    image,
    detailImages,
    description: String(raw?.description ?? '').trim(),
    features: normalizeFeatures(raw?.features),
    specs: {
      input: String(raw?.specs?.input ?? '').trim(),
      outputVoltage: String(raw?.specs?.outputVoltage ?? '').trim(),
      outputCurrent: String(raw?.specs?.outputCurrent ?? '').trim(),
      power: String(raw?.specs?.power ?? '').trim(),
      efficiency: String(raw?.specs?.efficiency ?? '').trim(),
      operatingTemp: String(raw?.specs?.operatingTemp ?? '').trim()
    },
    source: raw?.source === 'custom' ? 'custom' : 'seed'
  };
}

function dispatchUpdateEvent() {
  if (!canUseStorage()) {
    return;
  }

  window.dispatchEvent(new Event(UPDATE_EVENT));
}

export function getCustomProducts() {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((product) => normalizeProduct({ ...product, source: 'custom' }))
      .filter((product) => product.slug && product.model);
  } catch (error) {
    return [];
  }
}

export function getCatalogProducts() {
  const merged = new Map();

  seedProducts.forEach((product) => {
    const normalized = normalizeProduct({ ...product, source: 'seed' });
    if (normalized.slug) {
      merged.set(normalized.slug, normalized);
    }
  });

  getCustomProducts().forEach((product) => {
    merged.set(product.slug, product);
  });

  return [...merged.values()];
}

export function getCatalogProductBySlug(slug) {
  return getCatalogProducts().find((product) => product.slug === slug);
}

export function upsertCatalogProduct(product) {
  const normalized = normalizeProduct({ ...product, source: 'custom' });
  if (!normalized.slug || !normalized.model) {
    throw new Error('invalid-product');
  }

  const custom = getCustomProducts();
  const next = custom.filter((item) => item.slug !== normalized.slug);
  next.unshift(normalized);

  if (canUseStorage()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    dispatchUpdateEvent();
  }

  return normalized;
}

export function subscribeCatalogUpdates(callback) {
  if (!canUseStorage()) {
    return () => {};
  }

  const onStorage = (event) => {
    if (event.key === STORAGE_KEY) {
      callback();
    }
  };

  const onCustom = () => callback();

  window.addEventListener('storage', onStorage);
  window.addEventListener(UPDATE_EVENT, onCustom);

  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(UPDATE_EVENT, onCustom);
  };
}

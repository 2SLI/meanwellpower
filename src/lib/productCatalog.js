import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import { getBlob, getDownloadURL, listAll, ref, uploadBytes } from 'firebase/storage';
import { db, isFirebaseConfigured, storage } from './firebase';

const UPDATE_EVENT = 'mw-products-updated';
const CATALOG_CACHE_KEY = 'mw-products-catalog-cache-v1';
const CATALOG_CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 12;
const PRODUCTS_COLLECTION = 'products';
const PRODUCT_SUMMARIES_COLLECTION = 'productSummaries';
const firestoreProductsBySlug = new Map();
const detailLoadPromisesBySlug = new Map();

let firestoreLoadPromise = null;
let firestoreLoaded = false;
let cacheHydrated = false;

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
  return fallbackImage ? [fallbackImage] : [];
}

function normalizeProduct(raw) {
  const image = String(raw?.image ?? '').trim();
  const slug = normalizeSlug(raw?.slug || raw?.model);
  const model = String(raw?.model ?? '').trim() || String(raw?.slug ?? '').trim();
  const notice_1 = String(raw?.notice_1 ?? raw?.notice1 ?? '').trim();
  const notice_2 = String(raw?.notice_2 ?? raw?.notice2 ?? '').trim();
  const notice_3 = String(raw?.notice_3 ?? raw?.notice3 ?? '').trim();
  const notice_4 = String(raw?.notice_4 ?? raw?.notice4 ?? '').trim();
  const notice_5 = String(raw?.notice_5 ?? raw?.notice5 ?? '').trim();
  const detail = String(raw?.detail ?? raw?.detailText ?? '').trim();
  const detail_1 = String(raw?.detail_1 ?? raw?.detail1 ?? '').trim();
  const detail_2 = String(raw?.detail_2 ?? raw?.detail2 ?? '').trim();
  const detail_3 = String(raw?.detail_3 ?? raw?.detail3 ?? '').trim();
  const detail_4 = String(raw?.detail_4 ?? raw?.detail4 ?? '').trim();
  const detail_5 = String(raw?.detail_5 ?? raw?.detail5 ?? '').trim();
  const detailImage = String(raw?.detailImage ?? raw?.detail_image ?? '').trim();

  return {
    slug,
    brand: String(raw?.brand ?? 'MEAN WELL').trim() || 'MEAN WELL',
    model,
    category: String(raw?.category ?? 'SMPS').trim(),
    spec: String(raw?.spec ?? '').trim(),
    leadTime: String(raw?.leadTime ?? '').trim(),
    supplyPrice: String(raw?.supplyPrice ?? '').trim(),
    wholesalePrice: String(raw?.wholesalePrice ?? '').trim(),
    image,
    detailImages: normalizeDetailImages(raw?.detailImages, image),
    notice_1,
    notice_2,
    notice_3,
    notice_4,
    notice_5,
    detail,
    detail_1,
    detail_2,
    detail_3,
    detail_4,
    detail_5,
    detailImage,
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
    source: 'firestore'
  };
}

function dispatchUpdateEvent() {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new Event(UPDATE_EVENT));
}

function buildProductSummary(raw) {
  const normalized = normalizeProduct(raw);
  return {
    slug: normalized.slug,
    brand: normalized.brand,
    model: normalized.model,
    category: normalized.category,
    spec: normalized.spec,
    leadTime: normalized.leadTime,
    supplyPrice: normalized.supplyPrice,
    wholesalePrice: normalized.wholesalePrice,
    image: normalized.image,
    source: normalized.source
  };
}

function getCachedCatalogPayload() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(CATALOG_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.products) || typeof parsed.savedAt !== 'number') {
      return null;
    }
    if (Date.now() - parsed.savedAt > CATALOG_CACHE_MAX_AGE_MS) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function hydrateCatalogFromCache() {
  if (cacheHydrated) {
    return;
  }
  cacheHydrated = true;

  const cached = getCachedCatalogPayload();
  if (!cached) {
    return;
  }

  firestoreProductsBySlug.clear();
  cached.products.forEach((raw) => {
    const normalized = normalizeProduct(raw);
    if (normalized.slug && normalized.model) {
      firestoreProductsBySlug.set(normalized.slug, normalized);
    }
  });
  dispatchUpdateEvent();
}

function saveCatalogCache(products) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const lightweight = products.map((item) => ({
      slug: item.slug,
      brand: item.brand,
      model: item.model,
      category: item.category,
      spec: item.spec,
      leadTime: item.leadTime,
      supplyPrice: item.supplyPrice,
      wholesalePrice: item.wholesalePrice,
      image: item.image
    }));
    window.localStorage.setItem(
      CATALOG_CACHE_KEY,
      JSON.stringify({
        savedAt: Date.now(),
        products: lightweight
      })
    );
  } catch {
    // no-op
  }
}

function normalizeFilenameToModel(fullPath) {
  const fileName = String(fullPath ?? '').split('/').pop() ?? '';
  if (!fileName) {
    return '';
  }
  return fileName.replace(/\.[^.]+$/, '').trim();
}

async function walkStorageFiles(baseRef) {
  const result = [];

  async function walk(currentRef) {
    const listed = await listAll(currentRef);
    result.push(...listed.items);
    for (const nested of listed.prefixes) {
      await walk(nested);
    }
  }

  await walk(baseRef);
  return result;
}

function canOptimizeMimeType(mimeType) {
  return ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(String(mimeType || '').toLowerCase());
}

async function optimizeImageBlob(blob, options = {}) {
  const sourceType = String(blob?.type || '').toLowerCase();
  if (!blob || !String(sourceType).startsWith('image/') || !canOptimizeMimeType(sourceType)) {
    return { blob, changed: false };
  }

  const minBytes = Number(options.minBytes ?? 300 * 1024);
  if (blob.size <= minBytes) {
    return { blob, changed: false };
  }

  const targetType = sourceType === 'image/webp' ? 'image/webp' : 'image/jpeg';
  const quality = targetType === 'image/webp' ? 0.52 : 0.56;
  const maxSide = Number(options.maxSide ?? 1280);

  try {
    const imageUrl = URL.createObjectURL(blob);
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('image-load-failed'));
      element.src = imageUrl;
    });

    const scale = Math.min(1, maxSide / image.width, maxSide / image.height);
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      URL.revokeObjectURL(imageUrl);
      return { blob, changed: false };
    }

    context.drawImage(image, 0, 0, width, height);
    URL.revokeObjectURL(imageUrl);

    const optimizedBlob = await new Promise((resolve) => {
      canvas.toBlob(resolve, targetType, quality);
    });

    if (!optimizedBlob || optimizedBlob.size >= blob.size * 0.97) {
      return { blob, changed: false };
    }

    return { blob: optimizedBlob, changed: true };
  } catch {
    return { blob, changed: false };
  }
}

async function ensureFirestoreProductsLoaded() {
  hydrateCatalogFromCache();

  if (!isFirebaseConfigured || !db || firestoreLoaded) {
    return;
  }
  if (firestoreLoadPromise) {
    return firestoreLoadPromise;
  }

  firestoreLoadPromise = getDocs(collection(db, PRODUCT_SUMMARIES_COLLECTION))
    .then((snapshot) => {
      const hasSummaryDocs = snapshot.docs.length > 0;
      if (!hasSummaryDocs) {
        return getDocs(collection(db, PRODUCTS_COLLECTION)).then((fallbackSnapshot) => ({
          docs: fallbackSnapshot.docs
        }));
      }
      return snapshot;
    })
    .then((snapshot) => {
      firestoreProductsBySlug.clear();
      snapshot.docs.forEach((snapshotDoc) => {
        const normalized = normalizeProduct({
          ...snapshotDoc.data(),
          slug: snapshotDoc.id
        });
        if (normalized.slug && normalized.model) {
          firestoreProductsBySlug.set(normalized.slug, normalized);
        }
      });
      firestoreLoaded = true;
      saveCatalogCache([...firestoreProductsBySlug.values()]);
      dispatchUpdateEvent();
    })
    .catch(() => {
      // no-op
    })
    .finally(() => {
      firestoreLoadPromise = null;
    });

  return firestoreLoadPromise;
}

export function getCatalogProducts() {
  hydrateCatalogFromCache();
  ensureFirestoreProductsLoaded();
  return [...firestoreProductsBySlug.values()];
}

export function getCatalogProductBySlug(slug) {
  return getCatalogProducts().find((product) => product.slug === slug);
}

export async function ensureCatalogProductDetailLoaded(slug) {
  const key = normalizeSlug(slug);
  if (!key || !db) {
    return;
  }
  if (detailLoadPromisesBySlug.has(key)) {
    return detailLoadPromisesBySlug.get(key);
  }

  const pending = getDoc(doc(db, PRODUCTS_COLLECTION, key))
    .then((snapshot) => {
      if (!snapshot.exists()) {
        return;
      }

      const normalized = normalizeProduct({
        ...snapshot.data(),
        slug: snapshot.id
      });
      if (!normalized.slug || !normalized.model) {
        return;
      }

      const current = firestoreProductsBySlug.get(normalized.slug) || {};
      firestoreProductsBySlug.set(normalized.slug, {
        ...current,
        ...normalized
      });
      saveCatalogCache([...firestoreProductsBySlug.values()]);
      dispatchUpdateEvent();
    })
    .catch(() => {
      // no-op
    })
    .finally(() => {
      detailLoadPromisesBySlug.delete(key);
    });

  detailLoadPromisesBySlug.set(key, pending);
  return pending;
}

export function upsertCatalogProduct(product) {
  const normalized = normalizeProduct(product);
  if (!normalized.slug || !normalized.model) {
    throw new Error('invalid-product');
  }

  firestoreProductsBySlug.set(normalized.slug, normalized);
  dispatchUpdateEvent();

  if (db) {
    const updatedAt = serverTimestamp();
    setDoc(
      doc(db, PRODUCTS_COLLECTION, normalized.slug),
      {
        ...normalized,
        updatedAt
      },
      { merge: true }
    )
      .then(() =>
        setDoc(
          doc(db, PRODUCT_SUMMARIES_COLLECTION, normalized.slug),
          {
            ...buildProductSummary(normalized),
            updatedAt
          },
          { merge: true }
        )
      )
      .catch(() => {});
  }

  return normalized;
}

function buildBackfilledDetailPayload(raw) {
  const source = raw || {};
  const features = normalizeFeatures(source.features);

  const existingNotices = [
    String(source.notice_1 ?? source.notice1 ?? '').trim(),
    String(source.notice_2 ?? source.notice2 ?? '').trim(),
    String(source.notice_3 ?? source.notice3 ?? '').trim(),
    String(source.notice_4 ?? source.notice4 ?? '').trim(),
    String(source.notice_5 ?? source.notice5 ?? '').trim()
  ];

  const notices = existingNotices.map((notice, index) => notice || String(features[index] || '').trim());
  const detail = String(source.detail ?? source.detailText ?? source.description ?? '').trim();
  const detailImage =
    String(source.detailImage ?? source.detail_image ?? '').trim() ||
    String(Array.isArray(source.detailImages) ? source.detailImages[0] ?? '' : '').trim();

  return {
    notice_1: notices[0] || '',
    notice_2: notices[1] || '',
    notice_3: notices[2] || '',
    notice_4: notices[3] || '',
    notice_5: notices[4] || '',
    detail,
    detailImage
  };
}

export async function backfillCatalogDetailFields(options = {}) {
  if (!db) {
    throw new Error('firestore-not-configured');
  }

  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;
  const snapshot = await getDocs(collection(db, PRODUCTS_COLLECTION));

  let updated = 0;
  let skipped = 0;
  let failed = 0;
  const total = snapshot.docs.length;

  for (let index = 0; index < snapshot.docs.length; index += 1) {
    const snapshotDoc = snapshot.docs[index];
    const current = index + 1;

    try {
      const raw = snapshotDoc.data() || {};
      const next = buildBackfilledDetailPayload(raw);

      const changed =
        String(raw.notice_1 ?? '').trim() !== next.notice_1 ||
        String(raw.notice_2 ?? '').trim() !== next.notice_2 ||
        String(raw.notice_3 ?? '').trim() !== next.notice_3 ||
        String(raw.notice_4 ?? '').trim() !== next.notice_4 ||
        String(raw.notice_5 ?? '').trim() !== next.notice_5 ||
        String(raw.detail ?? '').trim() !== next.detail ||
        String(raw.detailImage ?? '').trim() !== next.detailImage;

      if (!changed) {
        skipped += 1;
      } else {
        await setDoc(
          doc(db, PRODUCTS_COLLECTION, snapshotDoc.id),
          {
            ...next,
            updatedAt: serverTimestamp()
          },
          { merge: true }
        );
        updated += 1;
      }
    } catch {
      failed += 1;
    }

    if (onProgress) {
      onProgress({ current, total, updated, skipped, failed, slug: snapshotDoc.id });
    }
  }

  firestoreLoaded = false;
  await ensureFirestoreProductsLoaded();
  dispatchUpdateEvent();

  return { total, updated, skipped, failed };
}

export async function syncCatalogProductsToFirestoreFromThumbnails(options = {}) {
  if (!db || !storage) {
    throw new Error('firebase-not-configured');
  }

  const folder = String(options.folder ?? 'thumbnails').trim() || 'thumbnails';
  const files = await walkStorageFiles(ref(storage, folder));

  let updated = 0;

  for (const fileRef of files) {
    const model = normalizeFilenameToModel(fileRef.fullPath);
    if (!model) {
      continue;
    }

    const slug = normalizeSlug(model);
    if (!slug) {
      continue;
    }

    const imageUrl = await getDownloadURL(fileRef);
    const existing = firestoreProductsBySlug.get(slug);

    const normalized = normalizeProduct({
      ...existing,
      slug,
      model,
      image: imageUrl,
      detailImages: [imageUrl],
      thumbnailPath: fileRef.fullPath
    });

    await setDoc(
      doc(db, PRODUCTS_COLLECTION, slug),
      {
        ...normalized,
        thumbnailPath: fileRef.fullPath,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
    await setDoc(
      doc(db, PRODUCT_SUMMARIES_COLLECTION, slug),
      {
        ...buildProductSummary(normalized),
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    firestoreProductsBySlug.set(slug, normalized);
    updated += 1;
  }

  firestoreLoaded = true;
  dispatchUpdateEvent();

  return {
    folder,
    storageFiles: files.length,
    updated,
    missing: Math.max(files.length - updated, 0)
  };
}

export async function optimizeCatalogStorageImages(options = {}) {
  if (!storage) {
    throw new Error('storage-not-configured');
  }

  const folders = Array.isArray(options.folders) && options.folders.length > 0 ? options.folders : ['products', 'thumbnails'];
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;
  const allFiles = [];

  for (const folder of folders) {
    const files = await walkStorageFiles(ref(storage, folder));
    allFiles.push(...files);
  }

  let optimized = 0;
  let skipped = 0;
  let failed = 0;
  let bytesBefore = 0;
  let bytesAfter = 0;

  for (let index = 0; index < allFiles.length; index += 1) {
    const fileRef = allFiles[index];
    const current = index + 1;

    try {
      const originalBlob = await getBlob(fileRef);
      bytesBefore += originalBlob.size;

      const result = await optimizeImageBlob(originalBlob, options);
      bytesAfter += result.blob.size;

      if (result.changed) {
        await uploadBytes(fileRef, result.blob, {
          contentType: result.blob.type || originalBlob.type || undefined,
          cacheControl: 'public,max-age=31536000'
        });
        optimized += 1;
      } else {
        skipped += 1;
      }
    } catch {
      failed += 1;
    }

    if (onProgress) {
      onProgress({
        current,
        total: allFiles.length,
        path: fileRef.fullPath,
        optimized,
        skipped,
        failed
      });
    }
  }

  dispatchUpdateEvent();

  return {
    folders,
    total: allFiles.length,
    optimized,
    skipped,
    failed,
    bytesBefore,
    bytesAfter,
    bytesSaved: Math.max(bytesBefore - bytesAfter, 0)
  };
}

export function subscribeCatalogUpdates(callback) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const onCustom = () => callback();
  window.addEventListener(UPDATE_EVENT, onCustom);

  return () => {
    window.removeEventListener(UPDATE_EVENT, onCustom);
  };
}

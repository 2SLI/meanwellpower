import { collection, doc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, listAll, ref } from 'firebase/storage';
import { db, isFirebaseConfigured, storage } from './firebase';

const UPDATE_EVENT = 'mw-products-updated';
const firestoreProductsBySlug = new Map();

let firestoreLoadPromise = null;
let firestoreLoaded = false;

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

async function ensureFirestoreProductsLoaded() {
  if (!isFirebaseConfigured || !db || firestoreLoaded) {
    return;
  }
  if (firestoreLoadPromise) {
    return firestoreLoadPromise;
  }

  firestoreLoadPromise = getDocs(collection(db, 'products'))
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
  ensureFirestoreProductsLoaded();
  return [...firestoreProductsBySlug.values()];
}

export function getCatalogProductBySlug(slug) {
  return getCatalogProducts().find((product) => product.slug === slug);
}

export function upsertCatalogProduct(product) {
  const normalized = normalizeProduct(product);
  if (!normalized.slug || !normalized.model) {
    throw new Error('invalid-product');
  }

  firestoreProductsBySlug.set(normalized.slug, normalized);
  dispatchUpdateEvent();

  if (db) {
    setDoc(
      doc(db, 'products', normalized.slug),
      {
        ...normalized,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    ).catch(() => {});
  }

  return normalized;
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
      doc(db, 'products', slug),
      {
        ...normalized,
        thumbnailPath: fileRef.fullPath,
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

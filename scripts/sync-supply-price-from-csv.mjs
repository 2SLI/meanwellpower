import fs from 'node:fs/promises';
import path from 'node:path';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, getDocs, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore/lite';

const firebaseConfig = {
  apiKey: 'AIzaSyB6HRLq6vFlBy7uvuMpd-VeKKdyKN4abY4',
  authDomain: 'meanwellpower-103ae.firebaseapp.com',
  projectId: 'meanwellpower-103ae',
  storageBucket: 'meanwellpower-103ae.firebasestorage.app',
  messagingSenderId: '459112128979',
  appId: '1:459112128979:web:dc0782d0d6c64318588f26'
};

const DEFAULT_CSV_PATH = path.resolve('스마트스토어상품_20260227_115924_trimmed.csv');
const CONCURRENCY = 20;

function normalizeSlug(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseCsv(csvText) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i += 1) {
    const char = csvText[i];
    const next = csvText[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ',') {
      row.push(cell);
      cell = '';
      continue;
    }
    if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }
    if (char === '\r') {
      continue;
    }
    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function parsePrice(raw) {
  const digits = String(raw ?? '').replace(/[^\d]/g, '');
  if (!digits) return '';
  return String(Number.parseInt(digits, 10));
}

function canonicalKey(value) {
  return String(value ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function stripWarrantySuffix(value) {
  return String(value ?? '').replace(/-(?:2|3|5)Y$/i, '');
}

async function runPool(items, worker, concurrency = CONCURRENCY) {
  const queue = [...items];
  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) continue;
      await worker(item);
    }
  });
  await Promise.all(workers);
}

async function main() {
  const email = process.env.FB_EMAIL;
  const password = process.env.FB_PASSWORD;
  const csvPath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_CSV_PATH;

  if (!email || !password) {
    throw new Error('Missing FB_EMAIL / FB_PASSWORD env vars.');
  }

  const csvText = await fs.readFile(csvPath, 'utf8');
  const rows = parseCsv(csvText);
  if (rows.length < 2) {
    throw new Error(`CSV has no data rows: ${csvPath}`);
  }

  const headers = rows[0].map((h) => String(h).trim());
  const modelIdx = headers.indexOf('상품명');
  const priceIdx = headers.indexOf('판매가');
  if (modelIdx < 0 || priceIdx < 0) {
    throw new Error('CSV must include "상품명" and "판매가" headers.');
  }

  const parsedRows = rows
    .slice(1)
    .map((cols) => {
      const model = String(cols[modelIdx] ?? '').trim();
      const supplyPrice = parsePrice(cols[priceIdx]);
      return {
        model,
        supplyPrice,
        modelSlug: normalizeSlug(model)
      };
    })
    .filter((item) => item.model && item.supplyPrice && item.modelSlug);

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  await signInWithEmailAndPassword(auth, email, password);
  const db = getFirestore(app);

  const snapshot = await getDocs(collection(db, 'products'));
  const idSet = new Set();
  const modelSlugToDocId = new Map();
  const canonicalToDocIds = new Map();

  const addCanonicalMapping = (key, docId) => {
    if (!key) return;
    const bucket = canonicalToDocIds.get(key) || new Set();
    bucket.add(docId);
    canonicalToDocIds.set(key, bucket);
  };

  snapshot.forEach((docSnap) => {
    const raw = docSnap.data() || {};
    idSet.add(docSnap.id);
    const modelSlug = normalizeSlug(raw.model);
    if (modelSlug) {
      modelSlugToDocId.set(modelSlug, docSnap.id);
    }
    addCanonicalMapping(canonicalKey(docSnap.id), docSnap.id);
    addCanonicalMapping(canonicalKey(raw.model), docSnap.id);
    addCanonicalMapping(canonicalKey(stripWarrantySuffix(docSnap.id)), docSnap.id);
    addCanonicalMapping(canonicalKey(stripWarrantySuffix(raw.model)), docSnap.id);
  });

  let updated = 0;
  let skipped = 0;
  let matchedByCanonical = 0;
  let matchedByWarrantyTrim = 0;
  const skippedModels = [];

  await runPool(parsedRows, async (item) => {
    let targetId = null;
    let matchedVia = 'none';

    if (idSet.has(item.modelSlug)) {
      targetId = item.modelSlug;
      matchedVia = 'id';
    } else if (modelSlugToDocId.has(item.modelSlug)) {
      targetId = modelSlugToDocId.get(item.modelSlug);
      matchedVia = 'modelSlug';
    } else {
      const byCanonical = canonicalToDocIds.get(canonicalKey(item.model));
      if (byCanonical?.size === 1) {
        targetId = [...byCanonical][0];
        matchedVia = 'canonical';
      } else {
        const trimmed = stripWarrantySuffix(item.model);
        const byTrimmedCanonical = canonicalToDocIds.get(canonicalKey(trimmed));
        if (byTrimmedCanonical?.size === 1) {
          targetId = [...byTrimmedCanonical][0];
          matchedVia = 'warrantyTrim';
        }
      }
    }

    if (!targetId) {
      skipped += 1;
      if (skippedModels.length < 30) {
        skippedModels.push(item.model);
      }
      return;
    }

    await setDoc(
      doc(db, 'products', targetId),
      {
        supplyPrice: item.supplyPrice,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
    await setDoc(
      doc(db, 'productSummaries', targetId),
      {
        supplyPrice: item.supplyPrice,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
    updated += 1;
    if (matchedVia === 'canonical') matchedByCanonical += 1;
    if (matchedVia === 'warrantyTrim') matchedByWarrantyTrim += 1;
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        csvPath,
        csvRows: parsedRows.length,
        productsInFirestore: snapshot.size,
        updated,
        skipped,
        matchedByCanonical,
        matchedByWarrantyTrim,
        skippedSamples: skippedModels
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error('SYNC_SUPPLY_PRICE_FAILED');
  console.error(error?.message ?? error);
  process.exit(1);
});

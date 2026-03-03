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

function normalizeSlug(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeSummary(raw = {}, fallbackSlug = '') {
  const slug = normalizeSlug(raw.slug || raw.model || fallbackSlug);
  return {
    slug,
    brand: String(raw.brand ?? 'MEAN WELL').trim() || 'MEAN WELL',
    model: String(raw.model ?? '').trim() || String(raw.slug ?? '').trim(),
    category: String(raw.category ?? 'SMPS').trim(),
    spec: String(raw.spec ?? '').trim(),
    leadTime: String(raw.leadTime ?? '').trim(),
    supplyPrice: String(raw.supplyPrice ?? '').trim(),
    wholesalePrice: String(raw.wholesalePrice ?? '').trim(),
    image: String(raw.image ?? '').trim(),
    source: 'firestore'
  };
}

async function main() {
  const email = process.env.FB_EMAIL;
  const password = process.env.FB_PASSWORD;
  if (!email || !password) {
    throw new Error('Missing FB_EMAIL / FB_PASSWORD env vars.');
  }

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  await signInWithEmailAndPassword(auth, email, password);
  const db = getFirestore(app);

  const snapshot = await getDocs(collection(db, 'products'));
  let written = 0;
  let skipped = 0;

  for (const productDoc of snapshot.docs) {
    const summary = normalizeSummary(productDoc.data(), productDoc.id);
    if (!summary.slug || !summary.model) {
      skipped += 1;
      continue;
    }

    await setDoc(
      doc(db, 'productSummaries', summary.slug),
      {
        ...summary,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
    written += 1;
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        products: snapshot.size,
        written,
        skipped
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error('BACKFILL_PRODUCT_SUMMARIES_FAILED');
  console.error(error?.message ?? error);
  process.exit(1);
});

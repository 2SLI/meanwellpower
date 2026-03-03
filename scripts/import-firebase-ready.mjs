import fs from 'node:fs/promises';
import path from 'node:path';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, serverTimestamp, setDoc, deleteDoc } from 'firebase/firestore/lite';
import { deleteObject, getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyB6HRLq6vFlBy7uvuMpd-VeKKdyKN4abY4',
  authDomain: 'meanwellpower-103ae.firebaseapp.com',
  projectId: 'meanwellpower-103ae',
  storageBucket: 'meanwellpower-103ae.firebasestorage.app',
  messagingSenderId: '459112128979',
  appId: '1:459112128979:web:dc0782d0d6c64318588f26'
};

const ROOT_DIR = path.resolve('image', 'firebase_ready');
const BRAND = 'MEAN WELL';
const CATEGORY_DEFAULT = 'SMPS';
const CONCURRENCY = 8;

function normalizeSlug(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function contentTypeForExt(ext) {
  const e = ext.toLowerCase();
  if (e === '.png') return 'image/png';
  if (e === '.webp') return 'image/webp';
  if (e === '.gif') return 'image/gif';
  return 'image/jpeg';
}

async function listFiles(dir) {
  try {
    const names = await fs.readdir(dir);
    return names.map((name) => path.join(dir, name));
  } catch {
    return [];
  }
}

async function pathIsDir(targetPath) {
  try {
    return (await fs.stat(targetPath)).isDirectory();
  } catch {
    return false;
  }
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

async function uploadFile(storage, localPath, storagePath) {
  const bytes = await fs.readFile(localPath);
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, bytes, {
    contentType: contentTypeForExt(path.extname(localPath))
  });
  return getDownloadURL(storageRef);
}

async function main() {
  const email = process.env.FB_EMAIL;
  const password = process.env.FB_PASSWORD;

  if (!email || !password) {
    throw new Error('Missing FB_EMAIL / FB_PASSWORD env vars.');
  }

  if (!(await pathIsDir(ROOT_DIR))) {
    throw new Error(`Missing directory: ${ROOT_DIR}`);
  }

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  await signInWithEmailAndPassword(auth, email, password);
  const db = getFirestore(app);
  const storage = getStorage(app);

  // Remove previous probe data if present.
  await deleteDoc(doc(db, 'products', '_probe-write')).catch(() => {});
  await deleteObject(ref(storage, 'products/_probe/notice_1.jpg')).catch(() => {});

  const topEntries = await fs.readdir(ROOT_DIR);
  const modelDirs = [];
  for (const name of topEntries) {
    const full = path.join(ROOT_DIR, name);
    if (!(await pathIsDir(full))) continue;
    if (name === 'notice' || name === '_UNMATCHED') continue;
    modelDirs.push({ name, full });
  }

  const unmatchedDir = path.join(ROOT_DIR, '_UNMATCHED');
  const noticeDir = path.join(ROOT_DIR, 'notice');

  let storageUploads = 0;
  let firestoreWrites = 0;
  let productCount = 0;
  let unmatchedCount = 0;

  for (const model of modelDirs) {
    const detailDir = path.join(model.full, 'detail');
    const modelEntries = await listFiles(model.full);
    const detailFiles = (await listFiles(detailDir))
      .filter((f) => !path.basename(f).startsWith('.'))
      .sort((a, b) => path.basename(a).localeCompare(path.basename(b), undefined, { numeric: true }));

    const thumbnailFiles = modelEntries
      .filter((f) => path.basename(f).toLowerCase().includes('_thumbnail'))
      .sort((a, b) => path.basename(a).localeCompare(path.basename(b), undefined, { numeric: true }));

    const detailUrls = [];
    await runPool(detailFiles, async (localPath) => {
      const destPath = `products/${model.name}/detail/${path.basename(localPath)}`;
      const url = await uploadFile(storage, localPath, destPath);
      detailUrls.push({ file: path.basename(localPath), url });
      storageUploads += 1;
    });
    detailUrls.sort((a, b) => a.file.localeCompare(b.file, undefined, { numeric: true }));

    await runPool(thumbnailFiles, async (thumbPath) => {
      const thumbName = path.basename(thumbPath);
      const productId = thumbName.replace(/_thumbnail\.[^.]+$/i, '');
      const slug = normalizeSlug(productId);
      if (!slug) return;

      const destThumbPath = `products/${model.name}/thumbnails/${thumbName}`;
      const imageUrl = await uploadFile(storage, thumbPath, destThumbPath);
      storageUploads += 1;

      const payload = {
        slug,
        brand: BRAND,
        model: productId,
        category: CATEGORY_DEFAULT,
        spec: model.name,
        leadTime: '',
        supplyPrice: '',
        wholesalePrice: '',
        image: imageUrl,
        detailImages: detailUrls.map((d) => d.url),
        description: '',
        features: [],
        specs: {
          input: '',
          outputVoltage: '',
          outputCurrent: '',
          power: '',
          efficiency: '',
          operatingTemp: ''
        },
        source: 'firestore',
        modelKey: model.name,
        thumbnailPath: destThumbPath,
        detailPaths: detailUrls.map((d) => `products/${model.name}/detail/${d.file}`),
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'products', slug), payload, { merge: true });
      await setDoc(
        doc(db, 'productSummaries', slug),
        {
          slug,
          brand: BRAND,
          model: productId,
          category: CATEGORY_DEFAULT,
          spec: model.name,
          leadTime: '',
          supplyPrice: '',
          wholesalePrice: '',
          image: imageUrl,
          source: 'firestore',
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
      firestoreWrites += 1;
      productCount += 1;
    });
  }

  if (await pathIsDir(unmatchedDir)) {
    const files = (await listFiles(unmatchedDir)).filter((f) => path.extname(f));
    await runPool(files, async (localPath) => {
      const name = path.basename(localPath);
      const destPath = `products/_UNMATCHED/${name}`;
      await uploadFile(storage, localPath, destPath);
      storageUploads += 1;
      unmatchedCount += 1;
    });
  }

  if (await pathIsDir(noticeDir)) {
    const files = (await listFiles(noticeDir)).filter((f) => path.extname(f));
    await runPool(files, async (localPath) => {
      const name = path.basename(localPath);
      const destPath = `products/notice/${name}`;
      await uploadFile(storage, localPath, destPath);
      storageUploads += 1;
    });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        models: modelDirs.length,
        products: productCount,
        firestoreWrites,
        storageUploads,
        unmatchedUploads: unmatchedCount
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error('IMPORT_FAILED');
  console.error(error?.message ?? error);
  process.exit(1);
});

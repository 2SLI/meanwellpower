const ADDRESS_BOOK_KEY = 'mw-shipping-address-book';

function canUseWindow() {
  return typeof window !== 'undefined';
}

function sanitizeEntry(entry) {
  return {
    id: String(entry?.id || '').trim(),
    type: String(entry?.type || '').trim(),
    label: String(entry?.label || '').trim(),
    name: String(entry?.name || '').trim(),
    phone: String(entry?.phone || '').trim(),
    address: String(entry?.address || '').trim(),
    addressDetail: String(entry?.addressDetail || '').trim(),
    updatedAt: String(entry?.updatedAt || '')
  };
}

function buildEntrySignature(entry) {
  const safe = sanitizeEntry(entry);
  return [safe.type, safe.name, safe.phone, safe.address, safe.addressDetail]
    .map((part) => String(part || '').trim().toLowerCase())
    .join('|');
}

function readRawStore() {
  if (!canUseWindow()) {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(ADDRESS_BOOK_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeRawStore(store) {
  if (!canUseWindow()) {
    return;
  }
  try {
    window.localStorage.setItem(ADDRESS_BOOK_KEY, JSON.stringify(store || {}));
  } catch {
    // noop
  }
}

export function readAddressBook(uid) {
  const userId = String(uid || '').trim();
  if (!userId) {
    return [];
  }
  const store = readRawStore();
  const list = Array.isArray(store[userId]) ? store[userId] : [];
  return list
    .map(sanitizeEntry)
    .filter((entry) => entry.id && entry.type && entry.name && entry.address)
    .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
}

export function upsertAddressBookEntry(uid, entry) {
  const userId = String(uid || '').trim();
  if (!userId) {
    return [];
  }

  const nextEntry = sanitizeEntry({
    ...entry,
    id: entry?.id || `addr-${Date.now()}`,
    updatedAt: new Date().toISOString()
  });
  if (!nextEntry.type || !nextEntry.name || !nextEntry.address) {
    return readAddressBook(userId);
  }

  const store = readRawStore();
  const current = Array.isArray(store[userId]) ? store[userId].map(sanitizeEntry) : [];
  const signature = buildEntrySignature(nextEntry);
  const sameByIdIndex = current.findIndex((item) => item.id === nextEntry.id);
  const sameBySignatureIndex = current.findIndex((item) => buildEntrySignature(item) === signature);

  let nextList = current;
  let action = 'created';

  if (sameByIdIndex >= 0) {
    nextList = current.map((item) => (item.id === nextEntry.id ? nextEntry : item));
    action = 'updated';
  } else if (sameBySignatureIndex >= 0) {
    const existing = current[sameBySignatureIndex];
    const merged = { ...existing, ...nextEntry, id: existing.id, updatedAt: new Date().toISOString() };
    nextList = current.map((item) => (item.id === existing.id ? merged : item));
    action = 'updated';
  } else {
    nextList = [nextEntry, ...current];
    action = 'created';
  }

  store[userId] = nextList;
  writeRawStore(store);
  return { entries: readAddressBook(userId), action };
}

export function deleteAddressBookEntry(uid, entryId) {
  const userId = String(uid || '').trim();
  const targetId = String(entryId || '').trim();
  if (!userId || !targetId) {
    return readAddressBook(userId);
  }

  const store = readRawStore();
  const current = Array.isArray(store[userId]) ? store[userId].map(sanitizeEntry) : [];
  store[userId] = current.filter((item) => item.id !== targetId);
  writeRawStore(store);
  return readAddressBook(userId);
}

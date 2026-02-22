import { addDoc, collection, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore';
import { auth, db } from './firebase';
import { USER_ROLES } from './roles';

const ORDER_LIST_STORAGE_KEY = 'mw_order_list_v1';
const ORDER_EVENT = 'mw-orders-updated';
const ORDER_UI_EVENT = 'mw-orders-ui-event';
const ORDER_REQUEST_COLLECTION = 'orderRequests';

let orderRequestsCache = [];

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function dispatchOrderEvent() {
  if (!canUseStorage()) {
    return;
  }
  window.dispatchEvent(new Event(ORDER_EVENT));
}

function dispatchOrderUiEvent(action) {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new CustomEvent(ORDER_UI_EVENT, { detail: { action } }));
}

function toDateValue(value) {
  if (!value) {
    return null;
  }
  if (typeof value.toDate === 'function') {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function normalizeOrderRequest(snapshotDoc) {
  const data = snapshotDoc.data() || {};
  const createdAtDate = toDateValue(data.createdAt);
  const updatedAtDate = toDateValue(data.updatedAt);
  const requestedAtDate = toDateValue(data.requestedAt) ?? createdAtDate;

  return {
    id: snapshotDoc.id,
    ...data,
    requestedAt: requestedAtDate ? requestedAtDate.toISOString() : '',
    createdAt: createdAtDate ? createdAtDate.toISOString() : null,
    updatedAt: updatedAtDate ? updatedAtDate.toISOString() : null
  };
}

function sortRequestsDesc(list) {
  return [...list].sort((a, b) => {
    const aValue = toDateValue(a?.requestedAt)?.getTime() ?? 0;
    const bValue = toDateValue(b?.requestedAt)?.getTime() ?? 0;
    return bValue - aValue;
  });
}

export function readOrderListItems() {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(ORDER_LIST_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item) => item?.slug && item?.model && item?.quantity > 0);
  } catch (error) {
    return [];
  }
}

export function writeOrderListItems(items) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(ORDER_LIST_STORAGE_KEY, JSON.stringify(items));
  dispatchOrderEvent();
}

export function subscribeOrderListUpdates(callback) {
  if (!canUseStorage()) {
    return () => {};
  }

  const onStorage = (event) => {
    if (event.key === ORDER_LIST_STORAGE_KEY) {
      callback();
    }
  };
  const onCustom = () => callback();

  window.addEventListener('storage', onStorage);
  window.addEventListener(ORDER_EVENT, onCustom);

  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(ORDER_EVENT, onCustom);
  };
}

export function openOrderListModal() {
  dispatchOrderUiEvent('open-order-list');
}

export function openOrderHistoryModal() {
  dispatchOrderUiEvent('open-order-history');
}

export function openQuoteHistoryModal() {
  dispatchOrderUiEvent('open-quote-history');
}

export function subscribeOrderUiEvents(callback) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const onUiEvent = (event) => {
    callback(event?.detail?.action || '');
  };

  window.addEventListener(ORDER_UI_EVENT, onUiEvent);
  return () => {
    window.removeEventListener(ORDER_UI_EVENT, onUiEvent);
  };
}

export function readOrderRequests() {
  return orderRequestsCache;
}

export async function appendOrderRequest(payload) {
  if (!db || !auth?.currentUser) {
    throw new Error('order-request-auth-required');
  }

  const currentUser = auth.currentUser;
  const requesterUid = payload?.requesterUid || currentUser.uid;
  const requestedAt = payload?.requestedAt || new Date().toISOString();

  const requestPayload = {
    ...payload,
    requesterUid,
    requestedAt,
    customer: {
      ...(payload?.customer || {}),
      uid: requesterUid,
      email: payload?.customer?.email || currentUser.email || ''
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const created = await addDoc(collection(db, ORDER_REQUEST_COLLECTION), requestPayload);
  return { id: created.id, ...requestPayload };
}

export function subscribeOrderUpdates(callback, options = {}) {
  const unsubs = [];

  if (canUseStorage()) {
    const onStorage = (event) => {
      if (event.key === ORDER_LIST_STORAGE_KEY) {
        callback();
      }
    };

    const onCustom = () => callback();
    window.addEventListener('storage', onStorage);
    window.addEventListener(ORDER_EVENT, onCustom);

    unsubs.push(() => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(ORDER_EVENT, onCustom);
    });
  }

  if (!db) {
    orderRequestsCache = [];
    callback();
    return () => {
      unsubs.forEach((unsubscribe) => unsubscribe());
    };
  }

  const role = options?.role ?? null;
  const uid = options?.uid ?? auth?.currentUser?.uid ?? '';
  const isAdmin = role === USER_ROLES.ADMIN;

  if (!isAdmin && !uid) {
    orderRequestsCache = [];
    callback();
    return () => {
      unsubs.forEach((unsubscribe) => unsubscribe());
    };
  }

  const baseCollection = collection(db, ORDER_REQUEST_COLLECTION);
  const streamQuery = isAdmin ? baseCollection : query(baseCollection, where('requesterUid', '==', uid));

  const stopSnapshot = onSnapshot(
    streamQuery,
    (snapshot) => {
      orderRequestsCache = sortRequestsDesc(snapshot.docs.map(normalizeOrderRequest));
      callback();
    },
    () => {
      orderRequestsCache = [];
      callback();
    }
  );

  unsubs.push(stopSnapshot);

  return () => {
    unsubs.forEach((unsubscribe) => unsubscribe());
  };
}

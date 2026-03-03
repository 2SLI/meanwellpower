import { addDoc, collection, doc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore/lite';
import { auth, db } from './firebase';
import { USER_ROLES } from './roles';

const ORDER_EVENT = 'mw-orders-updated';
const ORDER_UI_EVENT = 'mw-orders-ui-event';
const ORDER_REQUEST_COLLECTION = 'orderRequests';
const ORDER_LIST_STORAGE_KEY = 'mw-order-list-items';

let orderListCache = [];
let orderRequestsCache = [];
const orderListListeners = new Set();
const orderRequestListeners = new Set();
let orderListHydrated = false;

function canUseWindow() {
  return typeof window !== 'undefined';
}

function dispatchOrderEvent() {
  if (!canUseWindow()) {
    return;
  }
  window.dispatchEvent(new Event(ORDER_EVENT));
}

function dispatchOrderUiEvent(action) {
  if (!canUseWindow()) {
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

function sanitizeOrderItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }
  return items.filter((item) => item?.slug && item?.model && Number(item?.quantity) > 0);
}

function hydrateOrderListFromStorage() {
  if (orderListHydrated) {
    return;
  }
  orderListHydrated = true;

  if (!canUseWindow()) {
    return;
  }

  try {
    const raw = window.localStorage.getItem(ORDER_LIST_STORAGE_KEY);
    if (!raw) {
      orderListCache = [];
      return;
    }
    orderListCache = sanitizeOrderItems(JSON.parse(raw));
  } catch {
    orderListCache = [];
  }
}

function persistOrderListToStorage(items) {
  if (!canUseWindow()) {
    return;
  }
  try {
    window.localStorage.setItem(ORDER_LIST_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // noop
  }
}

function normalizeOrderRequest(snapshotDoc) {
  const data = snapshotDoc.data() || {};
  const createdAtDate = toDateValue(data.createdAt);
  const updatedAtDate = toDateValue(data.updatedAt);
  const requestedAtDate = toDateValue(data.requestedAt) ?? createdAtDate;

  return {
    ...data,
    id: data?.id || snapshotDoc.id,
    docId: snapshotDoc.id,
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

function notifyOrderListListeners() {
  orderListListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // noop
    }
  });
}

function notifyOrderRequestListeners() {
  orderRequestListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // noop
    }
  });
}

async function fetchOrderRequests(options = {}) {
  if (!db) {
    orderRequestsCache = [];
    notifyOrderRequestListeners();
    return;
  }

  const role = options?.role ?? null;
  const uid = options?.uid ?? auth?.currentUser?.uid ?? '';
  const isAdmin = role === USER_ROLES.ADMIN;

  if (!isAdmin && !uid) {
    orderRequestsCache = [];
    notifyOrderRequestListeners();
    return;
  }

  const baseCollection = collection(db, ORDER_REQUEST_COLLECTION);
  const streamQuery = isAdmin ? baseCollection : query(baseCollection, where('requesterUid', '==', uid));

  try {
    const snapshot = await getDocs(streamQuery);
    orderRequestsCache = sortRequestsDesc(snapshot.docs.map(normalizeOrderRequest));
  } catch {
    orderRequestsCache = [];
  }

  notifyOrderRequestListeners();
}

export function readOrderListItems() {
  hydrateOrderListFromStorage();
  return orderListCache;
}

export function writeOrderListItems(items) {
  hydrateOrderListFromStorage();
  orderListCache = sanitizeOrderItems(items);
  persistOrderListToStorage(orderListCache);
  dispatchOrderEvent();
  notifyOrderListListeners();
}

export function subscribeOrderListUpdates(callback) {
  orderListListeners.add(callback);
  callback();

  const onCustom = () => callback();
  if (canUseWindow()) {
    window.addEventListener(ORDER_EVENT, onCustom);
  }

  return () => {
    orderListListeners.delete(callback);
    if (canUseWindow()) {
      window.removeEventListener(ORDER_EVENT, onCustom);
    }
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
  if (!canUseWindow()) {
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

  orderRequestsCache = sortRequestsDesc([
    {
      ...requestPayload,
      id: requestPayload?.id || created.id,
      docId: created.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    ...orderRequestsCache
  ]);
  notifyOrderRequestListeners();

  return { ...requestPayload, id: requestPayload?.id || created.id, docId: created.id };
}

async function resolveOrderRequestDocId(request) {
  const knownDocId = String(request?.docId || '').trim();
  if (knownDocId) {
    return knownDocId;
  }

  const requestId = String(request?.id || '').trim();
  if (!requestId || !db) {
    return '';
  }

  const snapshot = await getDocs(query(collection(db, ORDER_REQUEST_COLLECTION), where('id', '==', requestId)));
  return snapshot.docs[0]?.id || '';
}

function updateCachedOrderRequestStatus(request, nextStatus) {
  const requestId = String(request?.id || '').trim();
  const requestDocId = String(request?.docId || '').trim();

  orderRequestsCache = orderRequestsCache.map((row) => {
    const sameByDocId = requestDocId && String(row?.docId || '').trim() === requestDocId;
    const sameById = requestId && String(row?.id || '').trim() === requestId;
    if (!sameByDocId && !sameById) {
      return row;
    }
    return {
      ...row,
      status: nextStatus,
      updatedAt: new Date().toISOString()
    };
  });
}

export async function updateOrderRequestStatus(request, nextStatus) {
  if (!db || !auth?.currentUser) {
    throw new Error('order-request-auth-required');
  }

  const docId = await resolveOrderRequestDocId(request);
  if (!docId) {
    throw new Error('order-request-not-found');
  }

  await updateDoc(doc(db, ORDER_REQUEST_COLLECTION, docId), {
    status: nextStatus,
    updatedAt: serverTimestamp()
  });

  updateCachedOrderRequestStatus({ ...request, docId }, nextStatus);
  notifyOrderRequestListeners();
}

export function subscribeOrderUpdates(callback, options = {}) {
  const unsubs = [];

  orderRequestListeners.add(callback);
  unsubs.push(() => {
    orderRequestListeners.delete(callback);
  });

  const onCustom = () => callback();
  if (canUseWindow()) {
    window.addEventListener(ORDER_EVENT, onCustom);
    unsubs.push(() => {
      window.removeEventListener(ORDER_EVENT, onCustom);
    });
  }

  fetchOrderRequests(options).finally(() => callback());

  return () => {
    unsubs.forEach((unsubscribe) => unsubscribe());
  };
}

export async function refreshOrderRequests(options = {}) {
  await fetchOrderRequests(options);
}


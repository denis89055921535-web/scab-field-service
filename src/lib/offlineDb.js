import { openDB } from 'idb';

const DB_NAME = 'scab-offline';
const DB_VERSION = 2;

// Инициализация базы с тремя хранилищами
let dbPromise = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Кеш справочников: ключ — имя эндпоинта (напр. '/drilling-crews')
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache');
        }
        // Очередь отчётов на отправку
        if (!db.objectStoreNames.contains('outbox')) {
          const outbox = db.createObjectStore('outbox', { keyPath: 'localId' });
          outbox.createIndex('status', 'status');
        }
        // Фото как Blob
        if (!db.objectStoreNames.contains('photos')) {
          db.createObjectStore('photos', { keyPath: 'photoId' });
        }
        // Хранилище файлов (Excel/PDF) для офлайн
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'fileId' });
        }
      },
    });
  }
  return dbPromise;
}

// ===== КЕШ СПРАВОЧНИКОВ =====

export async function cacheSet(key, value) {
  const db = await getDB();
  await db.put('cache', value, key);
}

export async function cacheGet(key) {
  const db = await getDB();
  return db.get('cache', key);
}

// ===== ОЧЕРЕДЬ ОТЧЁТОВ (OUTBOX) =====

// Добавить отчёт в очередь. record = { localId, endpoint, data, status, createdAt }
export async function outboxAdd(record) {
  const db = await getDB();
  await db.put('outbox', record);
  return record;
}

export async function outboxGet(localId) {
  const db = await getDB();
  return db.get('outbox', localId);
}

export async function outboxGetAll() {
  const db = await getDB();
  return db.getAll('outbox');
}

export async function outboxGetPending() {
  const db = await getDB();
  const all = await db.getAll('outbox');
  return all.filter(r => r.status === 'pending' || r.status === 'error');
}

export async function outboxUpdate(localId, patch) {
  const db = await getDB();
  const existing = await db.get('outbox', localId);
  if (!existing) return null;
  const updated = { ...existing, ...patch };
  await db.put('outbox', updated);
  return updated;
}

export async function outboxRemove(localId) {
  const db = await getDB();
  await db.delete('outbox', localId);
}

// ===== ФОТО (BLOB) =====

// Сохранить фото. photoId — уникальный ключ, blob — файл
export async function photoSave(photoId, blob, meta = {}) {
  const db = await getDB();
  await db.put('photos', { photoId, blob, meta, createdAt: Date.now() });
  return photoId;
}

export async function photoGet(photoId) {
  const db = await getDB();
  const rec = await db.get('photos', photoId);
  return rec?.blob || null;
}

export async function photoRemove(photoId) {
  const db = await getDB();
  await db.delete('photos', photoId);
}

// ===== ФАЙЛЫ (Excel/PDF) =====

export async function fileSave(fileId, blob, meta = {}) {
  const db = await getDB();
  await db.put('files', { fileId, blob, meta, createdAt: Date.now() });
  return fileId;
}

export async function fileGet(fileId) {
  const db = await getDB();
  const rec = await db.get('files', fileId);
  return rec || null;
}

export async function fileRemove(fileId) {
  const db = await getDB();
  await db.delete('files', fileId);
}

// ===== СЛУЖЕБНОЕ =====

// Сгенерировать UUID (для localId отчётов и photoId)
export function genId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  // запасной вариант
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
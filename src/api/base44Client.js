import { cacheSet, cacheGet, outboxAdd, genId } from '@/lib/offlineDb';
import { checkOnline } from '@/lib/network';
import { localEquipmentRequestClient } from '@/lib/localEquipmentRequests';
import { applyLocalAssetOverride, applyLocalAssetOverrides } from '@/lib/localAssetOverrides';
const API_URL = 'https://scabpro.com/api';
const useLocalEquipmentRequests = import.meta.env.DEV || import.meta.env.VITE_REQUESTS_LOCAL_ONLY === 'true';
// Базовый адрес сервера без /api — для картинок и файлов
export const SERVER_URL = API_URL.replace(/\/api$/, '');

// Превращает любой путь к фото в корректный абсолютный URL
export function resolvePhotoUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const clean = path.replace(/^\/+/, '');
  return `${SERVER_URL}/${clean}`;
}
const getToken = () => localStorage.getItem('auth_token');

async function request(method, endpoint, data = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const config = { method, headers };
  if (data && method !== 'GET') config.body = JSON.stringify(data);
  const response = await fetch(`${API_URL}${endpoint}`, config);
  if (response.status === 401) {
    localStorage.removeItem('auth_token');
    window.location.href = '/';
    return;
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Ошибка сервера' }));
    throw new Error(error.error || 'Ошибка запроса');
  }
  return response.json();
}

function createEntityClient(endpoint) {
  return {
    list: async (sortOrFilters = {}) => {
      let result;
      try {
        result = await request('GET', endpoint);
      } catch (err) {
        // Нет сети — отдаём из кеша, если есть
        const cached = await cacheGet(`list:${endpoint}`);
        if (cached) return cached;
        throw err;
      }
      const data = result?.data ?? result ?? [];
      // Кеширование не должно ломать основную работу
      try { await cacheSet(`list:${endpoint}`, data); } catch (e) { /* игнор */ }
      return data;
    },
    filter: async (filters = {}) => {
      const online = await checkOnline();
      // Офлайн — ищем в кеше списка
      if (!online) {
        try {
          const cached = await cacheGet(`list:${endpoint}`);
          if (cached && Array.isArray(cached)) {
            let res = cached;
            for (const [k, v] of Object.entries(filters)) {
              res = res.filter(item => String(item[k]) === String(v));
            }
            return res;
          }
        } catch (e) { /* игнор */ }
        return [];
      }
      // Если есть id — используем GET /:id
      if (filters.id) {
        const result = await request('GET', `${endpoint}/${filters.id}`);
        return result ? [result] : [];
      }
      const params = new URLSearchParams(filters).toString();
      const result = await request('GET', `${endpoint}${params ? '?' + params : ''}`);
      return result?.data ?? result ?? [];
    },
    get: (id) => request('GET', `${endpoint}/${id}`),
    create: async (data) => {
      const online = await checkOnline();
      if (online) {
        return request('POST', endpoint, data);
      }
      // Офлайн: генерируем id, кладём в очередь
      const localId = data.id || genId();
      const record = {
        localId,
        endpoint,
        data: { ...data, id: localId },
        status: 'pending',
        createdAt: Date.now(),
      };
      await outboxAdd(record);
      // Возвращаем отчёт с пометкой, что он ждёт отправки
      return { ...data, id: localId, _offline: true };
    },
    update: (id, data) => request('PUT', `${endpoint}/${id}`, data),
    delete: (id) => request('DELETE', `${endpoint}/${id}`),
  };
}

export const DrillingCrew = createEntityClient('/drilling-crews');
export const TripLog = createEntityClient('/trip-logs');
export const Incident = createEntityClient('/incidents');
const remoteAssetClient = createEntityClient('/assets');
export const Asset = useLocalEquipmentRequests
  ? {
      ...remoteAssetClient,
      list: async (...args) => applyLocalAssetOverrides(await remoteAssetClient.list(...args)),
      filter: async (...args) => applyLocalAssetOverrides(await remoteAssetClient.filter(...args)),
      get: async id => applyLocalAssetOverride(await remoteAssetClient.get(id)),
    }
  : remoteAssetClient;
export const Instruction = createEntityClient('/instructions');
export const User = createEntityClient('/users');
export const InstructionCategory = createEntityClient('/instruction-categories');
// На localhost заявки сохраняются только в localStorage и не затрагивают боевую БД.
const remoteEquipmentRequestClient = createEntityClient('/equipment-requests');
export const EquipmentRequest = useLocalEquipmentRequests
  ? localEquipmentRequestClient
  : {
      ...remoteEquipmentRequestClient,
      adminUpdate: (id, data) => request('PUT', `/equipment-requests/${id}/status`, data),
      purchaseApproval: (id, data) => request('POST', `/equipment-requests/${id}/approval`, data),
    };

export const auth = {
  login: (email, password) => request('POST', '/auth/login', { email, password }),
  me: () => request('GET', '/auth/me'),
  register: (userData) => request('POST', '/auth/register', userData),
  updateProfile: (data) => request('PUT', '/auth/me', data),
  logout: () => {
    localStorage.removeItem('auth_token');
    window.location.href = '/';
  },
  redirectToLogin: () => { window.location.href = '/login'; },
};

export const base44 = {
  auth,
  entities: { DrillingCrew, TripLog, Incident, Asset, Instruction, User, InstructionCategory, EquipmentRequest },
  integrations: {
    Core: {
      UploadFile: async ({ file }) => {
        const formData = new FormData();
        formData.append('photo', file);
        const token = getToken();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        try {
          const response = await fetch(`${API_URL}/uploads/photo`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          if (!response.ok) {
            const text = await response.text();
            throw new Error('HTTP ' + response.status + ': ' + text.slice(0, 200));
          }
          const data = await response.json();
          if (!data.url) throw new Error('No url in response: ' + JSON.stringify(data));
          return { file_url: API_URL.replace('/api', '') + data.url };
        } catch (err) {
          clearTimeout(timeoutId);
          if (err.name === 'AbortError') throw new Error('Превышено время ожидания загрузки (30с)');
          throw err;
        }
      }
    }
  }
};

export default base44;

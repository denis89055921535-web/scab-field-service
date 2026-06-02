// =============================================
// API клиент — замена Base44
// Все запросы идут на свой сервер scab.com
// =============================================

const API_URL = 'https://scab.com/api';

// Получить токен из localStorage
const getToken = () => localStorage.getItem('auth_token');

// Базовая функция запроса
async function request(method, endpoint, data = null) {
  const headers = {
    'Content-Type': 'application/json',
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers,
  };

  if (data && method !== 'GET') {
    config.body = JSON.stringify(data);
  }

  const response = await fetch(`${API_URL}${endpoint}`, config);

  if (response.status === 401) {
    // Токен истёк — разлогиниваем
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    window.location.href = '/';
    return;
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Ошибка сервера' }));
    throw new Error(error.error || 'Ошибка запроса');
  }

  return response.json();
}

// =============================================
// Авторизация
// =============================================
export const auth = {
  login: (email, password) =>
    request('POST', '/auth/login', { email, password }),

  me: () =>
    request('GET', '/auth/me'),

  register: (userData) =>
    request('POST', '/auth/register', userData),

  updateProfile: (data) =>
    request('PUT', '/auth/me', data),

  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    window.location.href = '/';
  },
};

// =============================================
// Универсальный CRUD для всех сущностей
// =============================================
function createEntityClient(endpoint) {
  return {
    list: (filters = {}) => {
      const params = new URLSearchParams(filters).toString();
      return request('GET', `${endpoint}${params ? '?' + params : ''}`);
    },
    get: (id) => request('GET', `${endpoint}/${id}`),
    create: (data) => request('POST', endpoint, data),
    update: (id, data) => request('PUT', `${endpoint}/${id}`, data),
    delete: (id) => request('DELETE', `${endpoint}/${id}`),
  };
}

// =============================================
// Все сущности
// =============================================
export const DrillingCrew = createEntityClient('/drilling-crews');
export const TripLog = createEntityClient('/trip-logs');
export const Incident = createEntityClient('/incidents');
export const Asset = createEntityClient('/assets');
export const Instruction = createEntityClient('/instructions');
export const User = createEntityClient('/users');

// =============================================
// Синхронизация офлайн-данных
// =============================================
export const sync = {
  // Отправить накопленные офлайн-изменения на сервер
  push: (changes) =>
    request('POST', '/sync', { changes }),
};

// =============================================
// Экспорт клиента (совместимость со старым кодом)
// base44.entities.DrillingCrew → DrillingCrew
// =============================================
export const base44 = {
  auth,
  entities: {
    DrillingCrew,
    TripLog,
    Incident,
    Asset,
    Instruction,
    User,
  },
};

export default base44;

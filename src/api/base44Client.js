const API_URL = 'https://scabpro.com/api';

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
      const result = await request('GET', endpoint);
      return result?.data ?? result ?? [];
    },
    filter: async (filters = {}) => {
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
    create: (data) => request('POST', endpoint, data),
    update: (id, data) => request('PUT', `${endpoint}/${id}`, data),
    delete: (id) => request('DELETE', `${endpoint}/${id}`),
  };
}

export const DrillingCrew = createEntityClient('/drilling-crews');
export const TripLog = createEntityClient('/trip-logs');
export const Incident = createEntityClient('/incidents');
export const Asset = createEntityClient('/assets');
export const Instruction = createEntityClient('/instructions');
export const User = createEntityClient('/users');
export const InstructionCategory = createEntityClient('/instruction-categories');

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
  entities: { DrillingCrew, TripLog, Incident, Asset, Instruction, User, InstructionCategory },
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

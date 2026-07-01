import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api';

const api = axios.create({ baseURL: BASE_URL });

// Attach access token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh token on 401
api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem('refresh_token');
        const { data } = await axios.post(`${BASE_URL}/token/refresh/`, { refresh });
        localStorage.setItem('access_token', data.access);
        original.headers.Authorization = `Bearer ${data.access}`;
        return api(original);
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/';
      }
    }
    return Promise.reject(err);
  }
);

/* ===== AUTH ===== */
export async function login(username, password) {
  const { data } = await api.post('/login/', { username, password });
  localStorage.setItem('access_token', data.access);
  localStorage.setItem('refresh_token', data.refresh);
  return data.user;
}

export async function logout() {
  const refresh = localStorage.getItem('refresh_token');
  try { await api.post('/logout/', { refresh }); } catch {}
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

export async function getMe() {
  const { data } = await api.get('/me/');
  return data;
}

/* ===== USER MANAGEMENT (admin director only) ===== */
export async function getUsers() {
  const { data } = await api.get('/users/');
  return data;
}

export async function createUser(userData) {
  const { data } = await api.post('/users/', userData);
  return data;
}

export async function updateUser(userId, updates) {
  const { data } = await api.patch(`/users/${userId}/`, updates);
  return data;
}

export async function deactivateUser(userId) {
  const { data } = await api.delete(`/users/${userId}/`);
  return data;
}

/* ===== REPORTS ===== */
export async function getReports() {
  const { data } = await api.get('/reports/');
  return data;
}

export async function getReport(date) {
  const { data } = await api.get(`/reports/${date}/`);
  return data;
}

export async function saveReport(reportData) {
  const { data } = await api.post('/reports/', reportData);
  return data;
}

export async function deleteReport(date) {
  const { data } = await api.delete(`/reports/${date}/`);
  return data;
}

export async function markReportsSeen() {
  const { data } = await api.post('/reports/mark-seen/');
  return data;
}

/* ===== SUMMARY ===== */
export async function getSummary() {
  const { data } = await api.get('/summary/');
  return data;
}

/* ===== MESSAGES & NOTIFICATIONS ===== */
export async function getMessages() {
  const { data } = await api.get('/messages/');
  return data;
}

export async function sendMessage(body, recipientId = null) {
  const payload = recipientId ? { body, recipient: recipientId } : { body };
  const { data } = await api.post('/messages/', payload);
  return data;
}

export async function markMessagesRead() {
  const { data } = await api.post('/messages/mark-read/');
  return data;
}

export async function getNotificationSummary() {
  const { data } = await api.get('/notifications/summary/');
  return data;
}

export default api;
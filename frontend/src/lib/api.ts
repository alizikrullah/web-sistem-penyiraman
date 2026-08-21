import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
  withCredentials: true,
});

// Redirect ke login kalau 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const login = (username: string, password: string) =>
  api.post('/auth/login', { username, password });

export const logout = () => api.post('/auth/logout');

export const getMe = () => api.get('/auth/me');

// Status & kontrol pompa
export const getStatus = () => api.get('/status');

export const pumpOn = (durationSeconds?: number) =>
  api.post('/pump/on', durationSeconds ? { durationSeconds } : {});

export const pumpOff = () => api.post('/pump/off');

export const setModeAuto = () => api.post('/mode/auto');

// Jadwal
export const getSchedules = () => api.get('/schedules');

export const createSchedule = (data: {
  label: string;
  days: string[];
  startTime: string;
  durationMinutes: number;
}) => api.post('/schedules', data);

export const updateSchedule = (
  id: number,
  data: {
    label: string;
    days: string[];
    startTime: string;
    durationMinutes: number;
    isActive: boolean;
  }
) => api.put(`/schedules/${id}`, data);

export const deleteSchedule = (id: number) => api.delete(`/schedules/${id}`);

// Logs
export const getLogs = (page = 1, limit = 50) =>
  api.get(`/logs?page=${page}&limit=${limit}`);

export default api;
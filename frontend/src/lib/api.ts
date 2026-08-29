import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
  withCredentials: true,
});

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

// Sensor
export const getSensorData = () => api.get('/sensor');

// Jadwal
export const getSchedules = () => api.get('/schedules');

export const createSchedule = (data: {
  label: string;
  days: string[];
  startTime: string;
  durationMinutes: number;
  durationSeconds?: number;
}) => api.post('/schedules', data);

export const updateSchedule = (
  id: number,
  data: {
    label: string;
    days: string[];
    startTime: string;
    durationMinutes: number;
    durationSeconds: number;
    isActive: boolean;
  }
) => api.put(`/schedules/${id}`, data);

export const deleteSchedule = (id: number) => api.delete(`/schedules/${id}`);
export const getScheduleRecommendations = () => api.post('/schedules/recommend');

// Rows
export const getRows = () => api.get('/rows');

export const createRow = (data: { name: string; location: string; notes: string }) =>
  api.post('/rows', data);

export const updateRow = (id: number, data: { name: string; location: string; notes: string }) =>
  api.put(`/rows/${id}`, data);

export const deleteRow = (id: number) => api.delete(`/rows/${id}`);

// Plants
export const getPlants = () => api.get('/plants');

export const createPlant = (data: {
  name: string;
  row: number;
  type: string | null;
  planted_at: string | null;
  notes: string | null;
}) => api.post('/plants', data);

export const updatePlant = (id: number, data: {
  name: string;
  row: number;
  type: string | null;
  planted_at: string | null;
  notes: string | null;
}) => api.put(`/plants/${id}`, data);

export const deletePlant = (id: number) => api.delete(`/plants/${id}`);

// Notifikasi
export const getNotifications = (page = 1, limit = 20) =>
  api.get(`/notifications?page=${page}&limit=${limit}`);

export const getUnreadCount = () => api.get('/notifications/unread-count');

export const markAsRead = (id: number) => api.patch(`/notifications/${id}/read`);

export const markAllAsRead = () => api.post('/notifications/read-all');

// Chat
export const getChatHistory = () => api.get('/chat/history');

export const sendChat = (message: string, image?: File) => {
  const formData = new FormData();
  if (message) formData.append('message', message);
  if (image) formData.append('image', image);
  return api.post('/chat', formData);
};

export const clearChatHistory = () => api.delete('/chat/history');

// Diagnoses
export const diagnosePlant = (plantId: number, image: File) => {
  const formData = new FormData();
  formData.append('plant_id', String(plantId));
  formData.append('image', image);
  return api.post('/diagnoses', formData);
};

export const getDiagnoses = (plantId: number) =>
  api.get(`/diagnoses/${plantId}`);

// Insights
export const getDailyInsight = () => api.get('/insights/daily');

export const refreshDailyInsight = () => api.post('/insights/daily/refresh');

// Logs
export const getLogs = (page = 1, limit = 50) =>
  api.get(`/logs?page=${page}&limit=${limit}`);

export default api;
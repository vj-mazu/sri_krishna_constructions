import axios from 'axios';

const getApiBase = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (import.meta.env.VITE_APP_API_URL) return import.meta.env.VITE_APP_API_URL;
  
  // If running directly on Render's domain, use relative /api
  if (typeof window !== 'undefined' && window.location.hostname.includes('onrender.com')) {
    return '/api';
  }
  
  // If running in production (e.g. Vercel / Custom domain), point to the live Render backend
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'https://sri-krishna-constructions.onrender.com/api';
  }
  
  return 'http://localhost:5000/api';
};

const api = axios.create({
  baseURL: getApiBase(),
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('iac_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem('iac_token')) {
      localStorage.removeItem('iac_token');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export default api;

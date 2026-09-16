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

let sessionExpiredHandled = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem('iac_token')) {
      // Guard against multiple concurrent 401s triggering repeated redirects
      if (!sessionExpiredHandled) {
        sessionExpiredHandled = true;
        localStorage.removeItem('iac_token');
        // Brief visual feedback before redirect
        try {
          const toast = document.createElement('div');
          toast.textContent = '⏳ Session expired. Redirecting to login...';
          toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#1e3a8a;color:#fff;padding:12px 24px;border-radius:12px;z-index:99999;font-size:14px;font-weight:600;box-shadow:0 4px 20px rgba(0,0,0,0.3);';
          document.body.appendChild(toast);
        } catch (_) {}
        setTimeout(() => window.location.reload(), 1200);
      }
      // Return a rejected promise so callers fail fast instead of hanging forever
      return Promise.reject(new Error('Session expired'));
    }
    if (!error.response && error.code === 'ERR_NETWORK') {
      console.error('Network error — server may be down');
    }
    return Promise.reject(error);
  }
);

export default api;

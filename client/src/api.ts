import axios from 'axios';

const getApiBase = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (import.meta.env.VITE_APP_API_URL) return import.meta.env.VITE_APP_API_URL;
  
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // Direct on render domain
    if (host.includes('onrender.com')) {
      return '/api';
    }
    // Localhost, IPv6, loopback, or private LAN IPs
    if (
      host === 'localhost' || 
      host === '127.0.0.1' || 
      host === '[::1]' ||
      host === '::1' ||
      host.endsWith('.local') ||
      host.startsWith('192.168.') || 
      host.startsWith('10.') || 
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)
    ) {
      return `http://${host}:5000/api`;
    }
    
    // Live Cloud / Vercel production deployment
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
    const isTokenExpired = error.response?.status === 401 || 
      (error.response?.status === 403 && (error.response?.data?.error === 'Invalid or expired token' || error.config?.url?.includes('/auth/me')));

    if (isTokenExpired && localStorage.getItem('iac_token')) {
      // Guard against multiple concurrent 401/403s triggering repeated redirects
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
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
      // Return a rejected promise so callers fail fast instead of hanging forever
      return Promise.reject(new Error('Session expired'));
    }
    if (!error.response && error.code === 'ERR_NETWORK') {
      console.error('Network error — server may be down or spinning up');
    }
    return Promise.reject(error);
  }
);

export default api;

import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error unwrapping
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || '';
    const isLoginAttempt = requestUrl.includes('/auth/login');

    // An expired or invalid token otherwise fails silently on every page, leaving
    // the user staring at empty tables. Clear the session and send them to login.
    // A 401 from the login call itself is just wrong credentials, so leave that
    // for the login form to display.
    if (status === 401 && !isLoginAttempt && window.location.pathname !== '/login') {
      localStorage.removeItem('token');
      window.location.assign('/login?expired=1');
    }

    const message = error.response?.data?.message || error.message || 'An error occurred';
    const err = new Error(message);
    err.status = status;
    err.code = error.response?.data?.code;
    return Promise.reject(err);
  }
);

export default api;

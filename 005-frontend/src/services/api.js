import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
  (config) => {
    const tokens = JSON.parse(localStorage.getItem('tokens') || '{}');
    if (tokens.access_token) {
      config.headers.Authorization = `Bearer ${tokens.access_token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle token refresh or logout on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If the error is 401 and it's not a refresh request
    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/refresh') {
      originalRequest._retry = true;
      
      try {
        const tokens = JSON.parse(localStorage.getItem('tokens') || '{}');
        if (tokens.refresh_token) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, {
            headers: { Authorization: `Bearer ${tokens.refresh_token}` }
          });
          
          const newTokens = response.data;
          localStorage.setItem('tokens', JSON.stringify(newTokens));
          
          // Retry the original request with the new token
          originalRequest.headers.Authorization = `Bearer ${newTokens.access_token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh token failed, logout user
        localStorage.removeItem('tokens');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

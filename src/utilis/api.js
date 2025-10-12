// src/api/api.js
import axios from 'axios';

// Create Axios instance
const api = axios.create({
  baseURL:  'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, 
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt'); 
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor (e.g., global error handling)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle global errors
    if (error.response?.status === 401) {
      console.log('Unauthorized! Redirect to login',err.response);
    }
    return Promise.reject(error);
  }
);

export default api;

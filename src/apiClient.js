// src/apiClient.js or apiClient.js
import axios from 'axios';

// Create an instance of Axios with base configuration
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true, // This ensures cookies are sent with requests
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 second timeout
});

// Request interceptor - Add token to headers if available
apiClient.interceptors.request.use(
  (config) => {
    // Get user data from localStorage
    const userData = localStorage.getItem('userData');
    
    if (userData) {
      try {
        const user = JSON.parse(userData);
        
        // If token exists, add it to Authorization header
        if (user.token) {
          config.headers['Authorization'] = `Bearer ${user.token}`;
        }
      } catch (e) {
        console.error('Error parsing user data from localStorage:', e);
        // If parsing fails, remove corrupted data
        localStorage.removeItem('userData');
      }
    }
    
    // Log request for debugging (remove in production)
    console.log('API Request:', config.method.toUpperCase(), config.url);
    
    return config;
  },
  (error) => {
    console.error('Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response) => {
    // Log successful response (remove in production)
    console.log('API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    // Handle different error scenarios
    
    // Network Error
    if (error.message === 'Network Error') {
      console.error('Network Error: Cannot reach the server');
      // You can show a toast notification here
    }
    
    // Timeout Error
    if (error.code === 'ECONNABORTED') {
      console.error('Request Timeout: Server took too long to respond');
    }
    
    // HTTP Status Errors
    if (error.response) {
      const status = error.response.status;
      
      switch (status) {
        case 400:
          console.error('Bad Request:', error.response.data.message);
          break;
          
        case 401:
          console.error('Unauthorized: Invalid or expired token');
          // Clear user data and redirect to login
          localStorage.removeItem('userData');
          
          // Only redirect if not already on login/signup page
          if (!window.location.pathname.includes('/login') && 
              !window.location.pathname.includes('/signup')) {
            window.location.href = '/login';
          }
          break;
          
        case 403:
          console.error('Forbidden: You do not have permission');
          break;
          
        case 404:
          console.error('Not Found:', error.response.data.message);
          break;
          
        case 500:
          console.error('Server Error:', error.response.data.message);
          break;
          
        default:
          console.error('Error:', error.response.data.message);
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
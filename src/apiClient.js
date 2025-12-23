// src/apiClient.js
import axios from 'axios';

// Create an instance of Axios with base configuration
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
   // ✅ CRITICAL: Send cookies with requests
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // ✅ Increased to 30 seconds for slower connections
});

// Request interceptor - Add token to headers if available
apiClient.interceptors.request.use(
  (config) => {
    // Get user data from localStorage
    const userData = localStorage.getItem('userData');
    
    console.log('🔵 API Request Interceptor - userData exists:', !!userData); // ✅ Debug
    
    if (userData) {
      try {
        const user = JSON.parse(userData);
        
        console.log('🔵 Parsed user, token exists:', !!user.token); // ✅ Debug
        
        // ✅ If token exists, add it to Authorization header
        if (user.token) {
          config.headers['Authorization'] = `Bearer ${user.token}`;
          console.log('✅ Token added to request:', config.url); // ✅ Debug
        } else {
          console.warn('⚠️ No token found in userData'); // ✅ Debug
        }
      } catch (e) {
        console.error('❌ Error parsing user data from localStorage:', e);
        // If parsing fails, remove corrupted data
        localStorage.removeItem('userData');
      }
    } else {
      console.warn('⚠️ No userData in localStorage'); // ✅ Debug
    }
    
    // Log request for debugging
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
    // Log successful response
    console.log('API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    // Handle different error scenarios
    
    // Network Error
    if (error.message === 'Network Error') {
      console.error('Network Error: Cannot reach the server');
      console.error('Please check:');
      console.error('1. Backend server is running');
      console.error('2. CORS is properly configured');
      console.error('3. API URL is correct:', import.meta.env.VITE_API_BASE_URL);
    }
    
    // Timeout Error
    if (error.code === 'ECONNABORTED') {
      console.error('Request Timeout: Server took too long to respond');
      console.error('This might indicate:');
      console.error('1. Database connection issues');
      console.error('2. Server overload');
      console.error('3. Network connectivity problems');
    }
    
    // HTTP Status Errors
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || 'Unknown error';
      
      console.error(`HTTP ${status}:`, message);
      
      switch (status) {
        case 400:
          console.error('Bad Request - Check your input data');
          break;
          
   case 401:
  console.error('Unauthorized - Token invalid or expired');
  
  // ✅ Check if this is the retry attempt
  if (error.config.__isRetry) {
    // Second attempt also failed - clear everything
    console.log('Auth failed after retry, clearing session');
    localStorage.removeItem('userData');
    
    if (!window.location.pathname.includes('/login') && 
        !window.location.pathname.includes('/signup')) {
      window.location.href = '/login';
    }
    break;
  }
  
  // ✅ Check if we have userData to retry with
  const userData = localStorage.getItem('userData');
  if (!userData) {
    // No token to retry with
    if (!window.location.pathname.includes('/login') && 
        !window.location.pathname.includes('/signup')) {
      window.location.href = '/login';
    }
    break;
  }
  
  // ✅ Try ONE more time with fresh token
  console.log('Retrying request with fresh token...');
  
  try {
    const user = JSON.parse(userData);
    if (user.token) {
      error.config.__isRetry = true;
      error.config.headers['Authorization'] = `Bearer ${user.token}`;
      return apiClient.request(error.config);
    }
  } catch (e) {
    console.error('Failed to parse userData:', e);
    localStorage.removeItem('userData');
  }
  break;
          
        case 403:
          console.error('Forbidden - You do not have permission');
          break;
          
        case 404:
          console.error('Not Found - Resource does not exist');
          break;
          
        case 500:
          console.error('Server Error - Backend encountered an issue');
          break;
          
        case 503:
          console.error('Service Unavailable - Database may not be connected');
          break;
          
        default:
          console.error('Unexpected Error:', status, message);
      }
    } else if (error.request) {
      // Request was made but no response received
      console.error('No response received from server');
      console.error('Request details:', error.request);
    } else {
      // Something else happened
      console.error('Error setting up request:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
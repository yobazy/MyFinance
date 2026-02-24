// API Configuration
// Automatically detects if running in development (separate React server) or production (served from Django)

const getApiBaseUrl = () => {
  // In production, when served from Django, use relative URLs
  // In development, use the Django backend URL
  if (process.env.NODE_ENV === 'production') {
    // When served from Django, use relative URLs
    return '/api';
  } else {
    // Development mode - React dev server on 3000, Django on 8000
    return 'http://127.0.0.1:8000/api';
  }
};

export const API_BASE_URL = getApiBaseUrl();

// Helper function to build full API URLs
export const apiUrl = (endpoint) => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

// Helper to get auth headers
export const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default {
  API_BASE_URL,
  apiUrl,
  getAuthHeaders,
};

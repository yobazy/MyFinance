// API configuration for different environments
const getApiBaseUrl = () => {
  // Check if we're running in Electron
  if (window.electronAPI) {
    console.log('🔍 Running in Electron environment');
    return 'http://127.0.0.1:8000';
  }
  
  // Check if we're running in development (React dev server)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Running in development environment');
    return 'http://127.0.0.1:8000';
  }
  
  // Production environment
  console.log('🔍 Running in production environment');
  return 'http://127.0.0.1:8000';
};

// Helper function to try multiple ports for backend connection
export const findBackendPort = async () => {
  const ports = ['8000', '8001'];
  
  for (const port of ports) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/accounts/`, {
        method: 'GET',
        timeout: 2000
      });
      if (response.ok) {
        console.log(`✅ Backend found on port ${port}`);
        return `http://127.0.0.1:${port}`;
      }
    } catch (error) {
      console.log(`❌ Backend not available on port ${port}`);
    }
  }
  
  console.log('❌ No backend found on any port');
  return getApiBaseUrl(); // Fallback to default
};

export const API_BASE_URL = getApiBaseUrl();

// Helper function to make API calls with proper error handling
export const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  console.log('🌐 Making API call to:', url);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    console.log('✅ API call successful:', url);
    return response;
  } catch (error) {
    console.error('❌ API call failed:', url, error);
    throw error;
  }
};

// Helper function for GET requests
export const apiGet = (endpoint) => apiCall(endpoint, { method: 'GET' });

// Helper function for POST requests
export const apiPost = (endpoint, data) => 
  apiCall(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });

// Helper function for PUT requests
export const apiPut = (endpoint, data) => 
  apiCall(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

// Helper function for DELETE requests
export const apiDelete = (endpoint) => 
  apiCall(endpoint, { method: 'DELETE' });

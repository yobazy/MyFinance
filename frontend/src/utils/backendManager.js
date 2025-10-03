// Backend connection manager for Electron app
class BackendManager {
  constructor() {
    this.baseUrl = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxAttempts = 5;
    this.retryDelay = 2000;
  }

  async findBackend() {
    const ports = ['8000', '8001', '8002'];
    
    for (const port of ports) {
      try {
        console.log(`🔍 Checking backend on port ${port}...`);
        const response = await fetch(`http://127.0.0.1:${port}/api/accounts/`, {
          method: 'GET',
          signal: AbortSignal.timeout(3000) // 3 second timeout
        });
        
        if (response.ok) {
          console.log(`✅ Backend found on port ${port}`);
          this.baseUrl = `http://127.0.0.1:${port}`;
          this.isConnected = true;
          return this.baseUrl;
        }
      } catch (error) {
        console.log(`❌ Backend not available on port ${port}:`, error.message);
      }
    }
    
    console.log('❌ No backend found on any port');
    this.isConnected = false;
    return null;
  }

  async makeRequest(endpoint, options = {}) {
    if (!this.baseUrl) {
      await this.findBackend();
    }

    if (!this.baseUrl) {
      throw new Error('Backend not available. Please ensure the backend is running.');
    }

    const url = `${this.baseUrl}${endpoint}`;
    console.log('🌐 Making API call to:', url);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('✅ API call successful:', url);
      this.connectionAttempts = 0; // Reset on success
      return response;
    } catch (error) {
      console.error('❌ API call failed:', url, error);
      
      // If connection fails, try to find backend again
      if (error.name === 'AbortError' || error.message.includes('fetch')) {
        this.connectionAttempts++;
        if (this.connectionAttempts < this.maxAttempts) {
          console.log(`🔄 Retrying connection (attempt ${this.connectionAttempts}/${this.maxAttempts})...`);
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
          this.baseUrl = null; // Force re-discovery
          return this.makeRequest(endpoint, options);
        }
      }
      
      throw error;
    }
  }

  async get(endpoint) {
    return this.makeRequest(endpoint, { method: 'GET' });
  }

  async post(endpoint, data) {
    return this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put(endpoint, data) {
    return this.makeRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint) {
    return this.makeRequest(endpoint, { method: 'DELETE' });
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      baseUrl: this.baseUrl,
      attempts: this.connectionAttempts
    };
  }

  async testConnection() {
    try {
      await this.get('/api/accounts/');
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Create a singleton instance
const backendManager = new BackendManager();

export default backendManager;

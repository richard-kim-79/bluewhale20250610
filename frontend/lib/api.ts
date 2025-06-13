import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import Cookies from 'js-cookie';
import Router from 'next/router';

// Define types
export interface Document {
  id: string;
  title: string;
  content: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  status: string;
  metadata?: Record<string, any>;
}

export interface SearchResponse {
  results: Document[];
  total: number;
  query: string;
}

export interface User {
  id: string;
  username: string;
  email?: string;
}

export interface UserRecommendation {
  user_id: string;
  recommendations: Document[];
}

export interface DocumentStatus {
  id: string;
  status: string;
  progress?: number;
  error?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
  mfa_code?: string;
}

export interface RegisterData {
  username: string;
  email?: string;
  password: string;
  full_name?: string;
}

export interface AuthResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  mfa_required?: boolean;
  username?: string;
  detail?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email?: string;
  full_name?: string;
  role: string;
  created_at: string;
  last_login?: string;
  mfa_enabled?: boolean;
}

export interface UpdateProfileData {
  email?: string;
  full_name?: string;
  password?: string;
  current_password?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// Token refresh configuration
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

// CSRF token storage
let csrfToken: string | null = null;

// Subscribe to token refresh
const subscribeToTokenRefresh = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

// Notify subscribers about new token
const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

// Handle token refresh failure
const onTokenRefreshFailed = () => {
  refreshSubscribers = [];
};

class ApiClient {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // Important: allows cookies to be sent and received cross-domain
    });

    // Initialize auth token from localStorage if available (transitional approach)
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    if (token) {
      this.setAuthToken(token);
    }
    
    // Set up interceptors for handling 401 errors and CSRF tokens
    this.setupInterceptors();
    
    // Fetch CSRF token on initialization
    if (typeof window !== 'undefined') {
      this.fetchCsrfToken();
    }
  }

  private setupInterceptors(): void {
    // Request interceptor to add CSRF token to headers for non-GET requests
    this.api.interceptors.request.use(
      async (config) => {
        // Only add CSRF token for non-GET methods that modify data
        if (config.method && ['post', 'put', 'delete', 'patch'].includes(config.method.toLowerCase())) {
          // If we don't have a CSRF token yet, fetch one
          if (!csrfToken) {
            try {
              await this.fetchCsrfToken();
            } catch (error) {
              console.error('Failed to fetch CSRF token:', error);
            }
          }
          
          // Add CSRF token to headers if available
          if (csrfToken) {
            config.headers['X-CSRF-Token'] = csrfToken;
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // Response interceptor for handling 401 errors
    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest: any = error.config;
        
        // If error is 401 and we haven't tried to refresh the token yet
        if (error.response?.status === 401 && !originalRequest._retry) {
          // If we're already refreshing, wait for the new token
          if (isRefreshing) {
            try {
              return new Promise((resolve) => {
                subscribeToTokenRefresh((token: string) => {
                  // Replace the expired token and retry
                  originalRequest.headers['Authorization'] = `Bearer ${token}`;
                  resolve(this.api(originalRequest));
                });
              });
            } catch (refreshError) {
              return Promise.reject(refreshError);
            }
          }
          
          // Set refreshing flag
          originalRequest._retry = true;
          isRefreshing = true;
          
          try {
            // Try to refresh the token
            const response = await this.api.post('/auth/refresh');
            const { access_token } = response.data;
            
            // Update token in localStorage and headers
            this.setAuthToken(access_token);
            
            // Notify subscribers about the new token
            onTokenRefreshed(access_token);
            
            // Reset refreshing flag
            isRefreshing = false;
            
            // Retry the original request
            return this.api(originalRequest);
          } catch (refreshError) {
            // Token refresh failed, clear auth state and redirect to login
            isRefreshing = false;
            onTokenRefreshFailed();
            this.setAuthToken(null);
            
            // Redirect to login page
            if (typeof window !== 'undefined') {
              Router.push('/login');
            }
            
            return Promise.reject(refreshError);
          }
        }
        
        // For other errors, just reject the promise
        return Promise.reject(error);
      }
    );
  }

  private setAuthToken(token: string | null): void {
    if (token) {
      // Store in localStorage for client-side access (will be deprecated in favor of HttpOnly cookies)
      localStorage.setItem('token', token);
      // Note: HttpOnly cookies are now set by the server and not accessible via JavaScript
      this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      // Remove token from localStorage
      localStorage.removeItem('token');
      // Note: HttpOnly cookies can only be cleared by the server
      delete this.api.defaults.headers.common['Authorization'];
    }
  }

  // Authentication APIs
  // Fetch a new CSRF token from the server
  async fetchCsrfToken(): Promise<string> {
    try {
      const response = await this.api.get('/api/v1/csrf-token');
      csrfToken = response.data.csrf_token;
      return csrfToken as string;
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
      throw error;
    }
  };
  
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // Ensure we have a CSRF token before login
    if (!csrfToken) {
      await this.fetchCsrfToken();
    }
    
    const formData = new FormData();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);
    
    // If MFA code is provided, add it to the request
    if (credentials.mfa_code) {
      formData.append('mfa_code', credentials.mfa_code);
    }
    
    const response = await this.api.post('/auth/token', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    // Check if MFA is required
    if (response.data.mfa_required) {
      return response.data;
    }
    
    // If we have an access token, set it
    const token = response.data.access_token;
    if (token) {
      this.setAuthToken(token);
    }
    
    return response.data;
  };

  async register(userData: RegisterData): Promise<UserProfile> {
    const response = await this.api.post('/auth/register', userData);
    return response.data;
  };

  async getCurrentUser(): Promise<UserProfile> {
    const response = await this.api.get('/auth/me');
    return response.data;
  };

  async updateUserProfile(data: UpdateProfileData): Promise<UserProfile> {
    const response = await this.api.put('/auth/me', data);
    return response.data;
  };

  async logout(): Promise<void> {
    try {
      // Call the logout endpoint to invalidate the refresh token and clear HttpOnly cookies
      await this.api.post('/auth/logout');
      // Clear local storage token
      this.setAuthToken(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Even if the API call fails, clear the local token
      this.setAuthToken(null);
    }
  };

  async logoutAllDevices(): Promise<void> {
    try {
      // Call the logout all devices endpoint
      await this.api.post('/auth/logout/all');
      // Clear local storage token
      this.setAuthToken(null);
    } catch (error) {
      console.error('Logout all devices error:', error);
      throw error;
    }
  };

  async getSessions(): Promise<any[]> {
    try {
      const response = await this.api.get('/auth/sessions');
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  // MFA APIs
  async setupMFA(): Promise<any> {
    return this.api.post('/api/v1/auth/mfa/setup');
  }

  async enableMFA(code: string): Promise<any> {
    return this.api.post('/api/v1/auth/mfa/enable', { code });
  }

  async disableMFA(code: string): Promise<any> {
    return this.api.post('/api/v1/auth/mfa/disable', { code });
  }

  async verifyMFA(code: string): Promise<any> {
    return this.api.post('/api/v1/auth/mfa/verify', { code });
  }

  async getBackupCodes(code: string): Promise<any> {
    return this.api.post('/api/v1/auth/mfa/backup-codes', { code });
  }

  // Document APIs
  async uploadDocument(formData: FormData): Promise<Document> {
    const response = await this.api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  };

  async getDocument(id: string): Promise<Document> {
    const response = await this.api.get(`/document/${id}`);
    return response.data;
  };

  async updateDocument(id: string, data: Partial<Document>): Promise<Document> {
    const response = await this.api.put(`/document/${id}`, data);
    return response.data;
  };

  async deleteDocument(id: string): Promise<void> {
    await this.api.delete(`/document/${id}`);
  };

  async getDocumentStatus(id: string): Promise<DocumentStatus> {
    const response = await this.api.get(`/document/${id}/status`);
    return response.data;
  };

  async reprocessDocument(id: string): Promise<{message: string, id: string, status: string}> {
    const response = await this.api.post(`/document/${id}/reprocess`);
    return response.data;
  };

  // Search APIs
  async searchDocuments(query: string, limit: number = 10): Promise<SearchResponse> {
    const response = await this.api.get(`/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    return response.data;
  }

  async vectorSearch(
    query: string, 
    format: 'json' | 'markdown' | 'jsonld' = 'json',
    limit: number = 10
  ): Promise<SearchResponse> {
    const response = await this.api.get(`/search/vector?q=${encodeURIComponent(query)}&format=${format}&limit=${limit}`);
    return response.data;
  }
  
  // User APIs
  async createUser(userData: { username: string; email?: string }): Promise<User> {
    const response = await this.api.post('/user', userData);
    return response.data;
  }

  async getUser(id: string): Promise<User> {
    const response = await this.api.get(`/user/${id}`);
    return response.data;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const response = await this.api.put(`/user/${id}`, data);
    return response.data;
  }

  async getUserDocuments(userId: string): Promise<Document[]> {
    const response = await this.api.get(`/user/${userId}/documents`);
    return response.data;
  }

  async getUserRecommendations(userId: string): Promise<UserRecommendation> {
    const response = await this.api.get(`/user/${userId}/recommendations`);
    return response.data;
  }
}

// Create and export API client instance
const apiClient = new ApiClient();
export default apiClient;

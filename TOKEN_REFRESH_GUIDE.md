# Token Refresh Guide

## Overview
The authentication system uses **JWT tokens** with automatic refresh capability. Access tokens expire after **24 hours**, and refresh tokens expire after **30 days**.

---

## 🔑 Token Information

### Access Token
- **Expiration**: 24 hours
- **Usage**: Included in `Authorization` header for all authenticated requests
- **Format**: `Bearer <token>`

### Refresh Token
- **Expiration**: 30 days
- **Usage**: Used to get new access tokens when they expire
- **Storage**: Should be stored securely (httpOnly cookie recommended)

---

## 📋 API Endpoints

### 1. Login / Sign In
```http
POST /api/auth/signin
Content-Type: application/json

{
  "identifier": "user@example.com", // or username
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "_id": "69066cd718245b394a8fa9f4",
    "fullName": "John Doe",
    "username": "johndoe",
    "email": "user@example.com",
    "profilePicture": "default-profile.png"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", // Access token (24h)
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." // Refresh token (30d)
}
```

### 2. Refresh Token
```http
POST /api/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", // New access token (24h)
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", // New refresh token (30d)
  "expiresIn": "24h"
}
```

**Note:** The refresh endpoint returns **new tokens** (token rotation). Always use the new refresh token for the next refresh.

---

## 💻 Frontend Implementation

### Option 1: Manual Token Refresh (Recommended)

```javascript
// tokenService.js
class TokenService {
  constructor() {
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  setTokens(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch('/api/auth/refresh-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      this.setTokens(data.token, data.refreshToken);
      return data.token;
    } catch (error) {
      // Refresh token expired or invalid - redirect to login
      this.clearTokens();
      window.location.href = '/login';
      throw error;
    }
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
}

// apiClient.js
import axios from 'axios';
import { tokenService } from './tokenService';

const apiClient = axios.create({
  baseURL: '/api',
});

// Request interceptor - add token to all requests
apiClient.interceptors.request.use(
  (config) => {
    const token = tokenService.accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - auto-refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh token
        const newAccessToken = await tokenService.refreshAccessToken();
        
        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed - redirect to login
        tokenService.clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

### Option 2: Proactive Token Refresh

Refresh token before it expires:

```javascript
// tokenRefresh.js
class TokenRefreshScheduler {
  constructor(tokenService, apiClient) {
    this.tokenService = tokenService;
    this.apiClient = apiClient;
    this.refreshTimer = null;
  }

  start() {
    // Check token expiration every 5 minutes
    this.refreshTimer = setInterval(async () => {
      const token = this.tokenService.accessToken;
      if (!token) return;

      try {
        // Decode token to check expiration (without verification)
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expirationTime = payload.exp * 1000; // Convert to milliseconds
        const currentTime = Date.now();
        const timeUntilExpiry = expirationTime - currentTime;

        // If token expires in less than 1 hour, refresh it
        if (timeUntilExpiry < 60 * 60 * 1000) {
          console.log('Token expiring soon, refreshing...');
          await this.tokenService.refreshAccessToken();
        }
      } catch (error) {
        console.error('Error checking token expiration:', error);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  stop() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}

// In your app initialization
const tokenRefreshScheduler = new TokenRefreshScheduler(tokenService, apiClient);
tokenRefreshScheduler.start();
```

### Option 3: React Hook Implementation

```javascript
// useAuth.js
import { useState, useEffect, useCallback } from 'react';
import { tokenService } from './tokenService';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(!!tokenService.accessToken);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshToken = useCallback(async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await tokenService.refreshAccessToken();
      setIsAuthenticated(true);
    } catch (error) {
      setIsAuthenticated(false);
      // Redirect to login
      window.location.href = '/login';
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  // Auto-refresh token before expiration
  useEffect(() => {
    if (!tokenService.accessToken) return;

    const checkAndRefresh = async () => {
      try {
        const token = tokenService.accessToken;
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expirationTime = payload.exp * 1000;
        const currentTime = Date.now();
        const timeUntilExpiry = expirationTime - currentTime;

        // Refresh if less than 1 hour remaining
        if (timeUntilExpiry < 60 * 60 * 1000) {
          await refreshToken();
        }
      } catch (error) {
        console.error('Token check failed:', error);
      }
    };

    // Check immediately
    checkAndRefresh();

    // Then check every 30 minutes
    const interval = setInterval(checkAndRefresh, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [refreshToken]);

  return {
    isAuthenticated,
    refreshToken,
    isRefreshing
  };
};
```

---

## 🔒 Security Best Practices

### 1. **Token Storage**
- ✅ **DO**: Store refresh token in `httpOnly` cookie (most secure)
- ✅ **DO**: Store access token in memory or `localStorage` (for SPA)
- ❌ **DON'T**: Store refresh token in `localStorage` (vulnerable to XSS)

### 2. **Token Rotation**
- The refresh endpoint returns **new tokens** every time
- Always update both tokens after refresh
- Old refresh tokens become invalid after use

### 3. **Error Handling**
```javascript
// Handle token expiration gracefully
try {
  const response = await apiClient.get('/api/users/dashboard/me');
  // Success
} catch (error) {
  if (error.response?.status === 401) {
    // Token expired - try refresh
    try {
      await tokenService.refreshAccessToken();
      // Retry request
    } catch (refreshError) {
      // Refresh failed - redirect to login
      window.location.href = '/login';
    }
  }
}
```

### 4. **Logout**
```javascript
// Clear tokens on logout
const logout = () => {
  tokenService.clearTokens();
  window.location.href = '/login';
};
```

---

## 📝 Example: Complete Authentication Flow

```javascript
// 1. Login
const login = async (identifier, password) => {
  const response = await fetch('/api/auth/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password })
  });
  
  const data = await response.json();
  tokenService.setTokens(data.token, data.refreshToken);
  return data.user;
};

// 2. Make authenticated request
const fetchUserData = async () => {
  try {
    const response = await apiClient.get('/api/users/dashboard/me');
    return response.data;
  } catch (error) {
    // Token refresh is handled by interceptor
    throw error;
  }
};

// 3. Refresh token manually (if needed)
const manualRefresh = async () => {
  try {
    const newToken = await tokenService.refreshAccessToken();
    console.log('Token refreshed:', newToken);
  } catch (error) {
    console.error('Refresh failed:', error);
  }
};
```

---

## 🚨 Common Issues & Solutions

### Issue 1: "Token expired" after 24 hours
**Solution:** Implement automatic token refresh using interceptors or scheduled checks.

### Issue 2: "Invalid refresh token"
**Causes:**
- Refresh token expired (30 days passed)
- Refresh token was already used (token rotation)
- Refresh token doesn't match database

**Solution:** Redirect to login page.

### Issue 3: Multiple refresh attempts
**Solution:** Use a flag (`_retry`) to prevent infinite refresh loops.

### Issue 4: Token refresh on every request
**Solution:** Only refresh when token is actually expired or about to expire (within 1 hour).

---

## 📊 Token Expiration Timeline

```
Login
  ├─ Access Token: Valid for 24 hours
  └─ Refresh Token: Valid for 30 days

After 24 hours:
  ├─ Access Token: ❌ Expired
  └─ Refresh Token: ✅ Still valid
  └─ Action: Use refresh endpoint to get new tokens

After 30 days:
  ├─ Access Token: ❌ Expired
  └─ Refresh Token: ❌ Expired
  └─ Action: User must login again
```

---

## ✅ Checklist for Frontend Implementation

- [ ] Store access token securely (localStorage/memory)
- [ ] Store refresh token securely (httpOnly cookie recommended)
- [ ] Implement token refresh interceptor
- [ ] Handle 401 errors gracefully
- [ ] Proactively refresh tokens before expiration
- [ ] Clear tokens on logout
- [ ] Redirect to login when refresh fails
- [ ] Prevent infinite refresh loops

---

## 📞 Support

If you encounter issues:
1. Check token expiration times
2. Verify refresh token is being sent correctly
3. Check browser console for errors
4. Verify backend is running and accessible
5. Check network tab for API response codes


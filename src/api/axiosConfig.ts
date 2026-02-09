import axios from "axios";

// Use environment variable for API URL (supports production deployment)
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Keep for CSRF if needed
  withXSRFToken: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// ✅ Function to get token from localStorage
const getToken = (): string | null => {
  return localStorage.getItem("auth_token");
};

// ✅ Function to set token in localStorage and axios default headers
export const setAuthToken = (token: string | null): void => {
  if (token) {
    localStorage.setItem("auth_token", token);
    apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    localStorage.removeItem("auth_token");
    delete apiClient.defaults.headers.common["Authorization"];
  }
};

// ✅ Initialize token on app load
const token = getToken();
if (token) {
  apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
}

// ✅ Track if CSRF cookie has been fetched
let csrfCookieFetched = false;

// ✅ Function to fetch CSRF cookie (optional, for hybrid auth)
const fetchCSRFCookie = async () => {
  if (!csrfCookieFetched) {
    try {
      const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const csrfURL = baseURL.replace('/api', '') + '/sanctum/csrf-cookie';
      await axios.get(csrfURL, {
        withCredentials: true,
      });
      csrfCookieFetched = true;
    } catch (error) {
      console.error("Failed to fetch CSRF cookie:", error);
      // Continue anyway, let the actual request handle the error
    }
  }
};

// ✅ Request Interceptor - Add token to every request
apiClient.interceptors.request.use(
  async (config) => {
    // Add token to header if available
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

  // Skip CSRF for public endpoints
    const publicEndpoints = ["/sanctum/csrf-cookie", "/login", "/register"];
    const isPublicEndpoint = publicEndpoints.some((endpoint) =>
    config.url?.includes(endpoint)
  );
  
    if (!isPublicEndpoint && !token) {
      // Only fetch CSRF if no token (fallback for session-based)
    await fetchCSRFCookie();
  }

  return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ✅ Response Interceptor - Handle 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear token and redirect to login
      setAuthToken(null);
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

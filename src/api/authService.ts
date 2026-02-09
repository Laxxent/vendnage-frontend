import apiClient, { setAuthToken } from "./axiosConfig";
import { User } from "../types/types";
import { AxiosError } from "axios";
import axios from "axios";

export const authService = {
  fetchUser: async (): Promise<User | null> => {
    try {
      const response = await apiClient.get("/user");
      let data = response.data;
      
      // Handle Laravel API Resource wrapper { data: { ... } }
      if (data && data.data) {
        data = data.data;
      }

      const permissions = Array.isArray(data.permissions)
        ? data.permissions
        : data.permissions
        ? [data.permissions]
        : [];
      
      return {
        ...data,
        roles: data.roles ?? [],
        permissions: permissions,
      };
    } catch (error) {
      if (error instanceof AxiosError) {
        // ✅ If 401/403, user is not authenticated - clear token and return null
        if (error.response?.status === 401 || error.response?.status === 403) {
          setAuthToken(null);
          return null;
        }
        throw new Error(error.response?.data?.message || "Error fetching user.");
      }
      throw new Error("Unexpected error. Please try again.");
    }
  },

  login: async (email: string, password: string): Promise<User> => {
    try {
      // ✅ OPTIMASI: Skip CSRF cookie fetch untuk token-based auth (menghemat ~100-300ms)
      // Token-based auth tidak memerlukan CSRF cookie, jadi kita skip untuk mempercepat login
      // Fallback: Jika login gagal dengan 419 (CSRF token mismatch), akan retry dengan CSRF
      
      const { data } = await apiClient.post("/login", { email, password });

      // ✅ Extract and save token from response
      if (data.token) {
        setAuthToken(data.token);
      }

      // ✅ Return user data
      return {
        ...data.user,
        roles: data.user.roles ?? [],
        permissions: Array.isArray(data.user.permissions)
          ? data.user.permissions
          : data.user.permissions
          ? [data.user.permissions]
          : [],
      };
    } catch (error) {
      if (error instanceof AxiosError) {
        // ✅ Fallback: Jika login gagal dengan 419 (CSRF token mismatch), retry dengan CSRF cookie
        if (error.response?.status === 419) {
          console.warn("CSRF token mismatch, retrying with CSRF cookie...");
          try {
            // Fetch CSRF cookie terlebih dahulu
            await axios.get("http://localhost:8000/sanctum/csrf-cookie", {
              withCredentials: true,
            });
            // Retry login setelah CSRF cookie di-fetch
            const { data } = await apiClient.post("/login", { email, password });
            if (data.token) {
              setAuthToken(data.token);
            }
            return {
              ...data.user,
              roles: data.user.roles ?? [],
              permissions: Array.isArray(data.user.permissions)
                ? data.user.permissions
                : data.user.permissions
                ? [data.user.permissions]
                : [],
            };
          } catch (retryError) {
            // Jika retry juga gagal, throw error asli
            throw retryError;
          }
        }
        
        // ✅ Check if it's a network error (backend not running)
        if (
          error.code === "ERR_NETWORK" ||
          error.message.includes("ERR_CONNECTION_REFUSED")
        ) {
          console.error("❌ Backend server tidak berjalan!");
          console.error(
            "Pastikan backend Laravel berjalan di http://localhost:8000"
          );
          throw new Error(
            "Tidak dapat terhubung ke server. Pastikan backend berjalan di http://localhost:8000"
          );
        }
        
        const errorMessage =
          error.response?.data?.message ||
                           error.response?.data?.error || 
                           "Invalid credentials.";
        console.error("Login error details:", {
          status: error.response?.status,
          message: errorMessage,
          data: error.response?.data,
        });
        // ✅ Clear token on login failure
        setAuthToken(null);
        throw new Error(errorMessage);
      }
      console.error("Unexpected login error:", error);
      setAuthToken(null);
      throw new Error("Unexpected error. Please try again.");
    }
  }, 

    logout: async (): Promise<void> => {
      try {
        // ✅ Clear token before logout request
        setAuthToken(null);

        // ✅ Try to call logout endpoint (optional, backend may not require it for token-based)
      try {
        await apiClient.post("/logout");
        } catch (error) {
          // Continue even if logout endpoint fails
          console.warn("Logout endpoint failed, but token cleared");
        }
        
        window.location.href = "/login";
      } catch (error) {
        console.error("Logout failed", error);
        // ✅ Still redirect even if logout fails
        setAuthToken(null);
        window.location.href = "/login";
      }
    },

    resetPassword: async (email: string): Promise<{ message: string }> => {
      try {
        const { data } = await apiClient.post("/password/email", { email });
        return data;
      } catch (error) {
        if (error instanceof AxiosError) {
          const errorMessage = error.response?.data?.message || 
                             error.response?.data?.error || 
                             "Failed to send reset password email.";
          throw new Error(errorMessage);
        }
        throw new Error("Unexpected error. Please try again.");
      }
    },

    resetPasswordSubmit: async (
      token: string,
      email: string,
      password: string,
      passwordConfirmation: string
    ): Promise<{ message: string }> => {
      try {
        const { data } = await apiClient.post("/password/reset", {
          token,
          email,
          password,
          password_confirmation: passwordConfirmation,
        });
        return data;
      } catch (error) {
        if (error instanceof AxiosError) {
          const errorMessage = error.response?.data?.message || 
                             error.response?.data?.error || 
                             "Failed to reset password. Please try again.";
          throw new Error(errorMessage);
        }
        throw new Error("Unexpected error. Please try again.");
      }
    },
};

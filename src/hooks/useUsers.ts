import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "../api/axiosConfig";
import { AxiosError } from "axios";
import { ApiErrorResponse, CreateUserPayload, UpdateUserPayload, User } from "../types/types";
import { useNavigate } from "react-router-dom";


// Fetch All Users
export const useFetchUsers = () => {
  return useQuery<User[], AxiosError>({
    queryKey: ["users"],
    queryFn: async () => {
      // ✅ Try to include roles relationship if API supports it
      try {
        const response = await apiClient.get("/users?with=roles");
        let data = response.data;
        
        console.log("🔍 Raw API response (with=roles):", data);
        
        // Handle different response formats
        if (data && data.data && Array.isArray(data.data)) {
          data = data.data;
        }
        
        // Normalize users data - ensure roles field exists
        if (Array.isArray(data)) {
          const normalized = data.map((user: any) => {
            console.log("🔍 User data:", user.id, user.name, "Roles:", user.roles, "Type:", typeof user.roles);
            console.log("🔍 Full user object keys:", Object.keys(user));
            
            // Try multiple possible field names for roles (Laravel many-to-many relationships)
            let roles = user.roles || 
                       user.user_roles || 
                       user.role || 
                       user.role_users ||
                       (user.role_users && Array.isArray(user.role_users) ? user.role_users.map((ru: any) => ru.role || ru.role_name) : []) ||
                       [];
            
            // If roles is an array of objects, extract names
            if (Array.isArray(roles)) {
              roles = roles.map((role: any) => {
                if (typeof role === 'string') return role;
                if (role && typeof role === 'object') {
                  // Try various possible property names for role name
                  return role.name || 
                         role.role_name || 
                         role.role?.name || 
                         role.pivot?.role_name ||
                         (role.pivot && role.pivot.role ? (typeof role.pivot.role === 'string' ? role.pivot.role : role.pivot.role.name) : null) ||
                         role.title ||
                         String(role);
                }
                return String(role);
              }).filter(Boolean);
            } else if (roles && typeof roles === 'object' && !Array.isArray(roles)) {
              // Single role object
              roles = [roles.name || roles.role_name || roles.role?.name || roles.title || JSON.stringify(roles)];
            } else if (roles) {
              // Single string or other type
              roles = [String(roles)];
            } else {
              roles = [];
            }
            
            console.log("✅ Normalized roles for", user.name, ":", roles);
            
            return {
              ...user,
              roles: roles,
            };
          });
          
          return normalized;
        }
        
        return data;
      } catch (error) {
        console.log("⚠️ Error with ?with=roles, trying without parameter:", error);
        // ✅ Fallback to regular endpoint if query parameter not supported
      const response = await apiClient.get("/users");
        let data = response.data;
        
        console.log("🔍 Raw API response (no params):", data);
        
        // Handle different response formats
        if (data && data.data && Array.isArray(data.data)) {
          data = data.data;
        }
        
        // Normalize users data - ensure roles field exists
        if (Array.isArray(data)) {
          const normalized = data.map((user: any) => {
            console.log("🔍 User data (fallback):", user.id, user.name, "Roles:", user.roles, "Type:", typeof user.roles);
            console.log("🔍 Full user object keys (fallback):", Object.keys(user));
            
            // Try multiple possible field names for roles (Laravel many-to-many relationships)
            let roles = user.roles || 
                       user.user_roles || 
                       user.role || 
                       user.role_users ||
                       (user.role_users && Array.isArray(user.role_users) ? user.role_users.map((ru: any) => ru.role || ru.role_name) : []) ||
                       [];
            
            // If roles is an array of objects, extract names
            if (Array.isArray(roles)) {
              roles = roles.map((role: any) => {
                if (typeof role === 'string') return role;
                if (role && typeof role === 'object') {
                  // Try various possible property names for role name
                  return role.name || 
                         role.role_name || 
                         role.role?.name || 
                         role.pivot?.role_name ||
                         (role.pivot && role.pivot.role ? (typeof role.pivot.role === 'string' ? role.pivot.role : role.pivot.role.name) : null) ||
                         role.title ||
                         String(role);
                }
                return String(role);
              }).filter(Boolean);
            } else if (roles && typeof roles === 'object' && !Array.isArray(roles)) {
              // Single role object
              roles = [roles.name || roles.role_name || roles.role?.name || roles.title || JSON.stringify(roles)];
            } else if (roles) {
              // Single string or other type
              roles = [String(roles)];
            } else {
              roles = [];
            }
            
            console.log("✅ Normalized roles (fallback) for", user.name, ":", roles);
            
            return {
              ...user,
              roles: roles,
            };
          });
          
          return normalized;
        }
        
        return data;
      }
    },
  });
};

// Fetch Single User by ID
export const useFetchUser = (id: number) => {
  return useQuery<User, AxiosError>({
    queryKey: ["user", id],
    queryFn: async () => {
      // ✅ Try to include roles relationship if API supports it
      try {
        const response = await apiClient.get(`/users/${id}?with=roles`);
        let data = response.data;
        
        // Handle different response formats
        if (data && data.data) {
          data = data.data;
        }
        
        // Normalize user data - ensure roles field exists
        return {
          ...data,
          roles: Array.isArray(data.roles) 
            ? data.roles.map((role: any) => typeof role === 'string' ? role : role.name || role)
            : data.roles 
            ? [typeof data.roles === 'string' ? data.roles : data.roles.name || data.roles]
            : [],
        };
      } catch (error) {
        // ✅ Fallback to regular endpoint if query parameter not supported
      const response = await apiClient.get(`/users/${id}`);
        let data = response.data;
        
        // Handle different response formats
        if (data && data.data) {
          data = data.data;
        }
        
        // Normalize user data - ensure roles field exists
        return {
          ...data,
          roles: Array.isArray(data.roles) 
            ? data.roles.map((role: any) => typeof role === 'string' ? role : role.name || role)
            : data.roles 
            ? [typeof data.roles === 'string' ? data.roles : data.roles.name || data.roles]
            : [],
        };
      }
    },
    enabled: !!id,
  });
};


export const useCreateUser = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation<CreateUserPayload, AxiosError<ApiErrorResponse>, CreateUserPayload>({
    mutationFn: async (payload: CreateUserPayload) => {
      const formData = new FormData();
      formData.append("name", payload.name);
      formData.append("phone", payload.phone);
      formData.append("email", payload.email);
      formData.append("password", payload.password);
      formData.append("password_confirmation", payload.password_confirmation);
      if (payload.photo) formData.append("photo", payload.photo);

      const response = await apiClient.post("/users", formData, {
        headers: { "Content-Type": "multipart/form-data" },

      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] }); // Refresh product list
      // Delay redirect to allow notification to be visible
      setTimeout(() => {
        navigate("/users");
      }, 2500);
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation<User, AxiosError<ApiErrorResponse>, UpdateUserPayload>({
    mutationFn: async ({ id, name, phone, email, role, password, password_confirmation, photo }) => {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("phone", phone);
      formData.append("email", email);
      formData.append("_method", "PUT"); // ✅ Laravel expects this for PUT with FormData

      // ✅ Send role if provided
      if (role) formData.append("role", role);

      // Only send optional fields if provided
      if (password) formData.append("password", password);
      if (password_confirmation) formData.append("password_confirmation", password_confirmation);
      if (photo) formData.append("photo", photo);

      const response = await apiClient.post(`/users/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["user", id] });
      // Navigation is handled in the component to allow notification to be visible
    },
  });
};

// Delete User
export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};

// Update currently authenticated user's basic profile (name, phone, email)
// Uses /api/user endpoint for self-update (accessible by all authenticated users)
export const useUpdateMyProfile = () => {
  const queryClient = useQueryClient();

  return useMutation<
    User,
    AxiosError<ApiErrorResponse>,
    { name: string; phone: string; email: string }
  >({
    mutationFn: async ({ name, phone, email }) => {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("phone", phone);
      formData.append("email", email);
      formData.append("_method", "PUT");

      // Use /api/user endpoint for self-update (not /api/users/{id})
      // This endpoint should allow any authenticated user to update their own profile
      const response = await apiClient.post(`/user`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate user cache to refresh user data
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["user", data.id] });
    },
  });
};

// Change password for currently authenticated user
// Uses /api/user/change-password endpoint for self-update (accessible by all authenticated users)
export const useChangePassword = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { message: string },
    AxiosError<ApiErrorResponse>,
    { current_password: string; new_password: string; new_password_confirmation: string }
  >({
    mutationFn: async ({ current_password, new_password, new_password_confirmation }) => {
      // Use /api/user/change-password endpoint for self-update (not /api/users/{id}/change-password)
      // This endpoint should allow any authenticated user to change their own password
      const response = await apiClient.post(`/user/change-password`, {
        current_password,
        new_password,
        new_password_confirmation,
      }, {
        headers: { "Content-Type": "application/json" },
      });

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};

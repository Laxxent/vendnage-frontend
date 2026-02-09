import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "../api/axiosConfig";
import { AxiosError } from "axios";
import { Role, CreateRolePayload, UpdateRolePayload, ApiErrorResponse } from "../types/types";

// Fetch All Roles
// Note: This should only be called by Manager users. PIC users will get 403 error.
// For better UX, we should check user role before calling this hook, or handle 403 gracefully.
export const useFetchRoles = () => {
  return useQuery<Role[], AxiosError>({
    queryKey: ["roles"],
    queryFn: async () => {
      try {
      const response = await apiClient.get("/roles");
        let data = response.data;
        
        // Handle different response formats
        if (data && data.data && Array.isArray(data.data)) {
          data = data.data;
        }
        
        if (!Array.isArray(data)) {
          console.warn("Roles response is not an array:", data);
          return [];
        }
        
        // Normalize roles data - ensure permissions field exists
        return data.map((role: any) => {
          // Safely extract role data with fallbacks
          const normalizedRole: Role = {
            id: role.id || 0,
            name: role.name || "",
            users_web_count: role.users_web_count || role.users_count || 0,
            permissions: Array.isArray(role.permissions) ? role.permissions : [],
          };
          
          return normalizedRole;
        });
      } catch (error: any) {
        // Handle 403 Forbidden gracefully (PIC users cannot access /api/roles)
        if (error.response?.status === 403) {
          // This is expected for PIC users - they don't have permission to fetch roles
          // Return empty array silently to avoid console spam
          return [];
        }
        
        // If it's a 500 error, it might be backend issue with permissions field
        if (error.response?.status === 500) {
          console.error("Backend returned 500 error. This might be due to permissions field not being supported yet.");
          console.error("Error details:", error.response?.data);
        } else if (error.response?.status !== 403) {
          // Only log non-403 errors
          console.error("Error fetching roles:", error);
        }
        
        // For 403, return empty array instead of throwing
        if (error.response?.status === 403) {
          return [];
        }
        
        throw error;
      }
    },
    retry: (failureCount, error) => {
      // Don't retry on 403 errors (PIC users don't have permission)
      if (error instanceof AxiosError && error.response?.status === 403) {
        return false;
      }
      // Retry once for other errors
      return failureCount < 1;
    },
  });
};

// Fetch Single Role by ID
export const useFetchRole = (id: number) => {
  return useQuery<Role, AxiosError>({
    queryKey: ["role", id],
    queryFn: async () => {
      try {
      const response = await apiClient.get(`/roles/${id}`);
        let data = response.data;
        
        // Handle different response formats
        if (data && data.data) {
          data = data.data;
        }
        
        // Normalize role data - ensure permissions field exists
        const normalizedRole: Role = {
          id: data.id || 0,
          name: data.name || "",
          users_web_count: data.users_web_count || data.users_count || 0,
          permissions: Array.isArray(data.permissions) ? data.permissions : [],
        };
        
        return normalizedRole;
      } catch (error: any) {
        console.error("Error fetching role:", error);
        
        // If it's a 500 error, it might be backend issue with permissions field
        if (error.response?.status === 500) {
          console.error("Backend returned 500 error. This might be due to permissions field not being supported yet.");
          console.error("Error details:", error.response?.data);
        }
        
        throw error;
      }
    },
    enabled: !!id,
    retry: 1, // Only retry once on failure
  });
};

export const useCreateRole = () => {
  const queryClient = useQueryClient();

  return useMutation<Role, AxiosError<ApiErrorResponse>, CreateRolePayload>({
    mutationFn: async (payload: CreateRolePayload) => {
      const formData = new FormData();
      formData.append("name", payload.name);

      // Add permissions if provided
      if (payload.permissions && payload.permissions.length > 0) {
        payload.permissions.forEach((permission, index) => {
          formData.append(`permissions[${index}]`, permission);
        });
      }

      const response = await apiClient.post("/roles", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });  
      // Navigation will be handled in component after showing notification
    },
  });
};   

export const useUpdateRole = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Role, // response type
    AxiosError<ApiErrorResponse>, // error type
    UpdateRolePayload // payload
  >({
    mutationFn: async (payload: UpdateRolePayload) => {
      const { id, ...data } = payload;
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("_method", "PUT"); // ✅ Laravel expects this for PUT with FormData
 
      // Add permissions if provided
      if (data.permissions && data.permissions.length > 0) {
        data.permissions.forEach((permission, index) => {
          formData.append(`permissions[${index}]`, permission);
        });
      }

      const response = await apiClient.post(`/roles/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      return response.data;
    },
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["role", payload.id] });
      // Navigation will be handled in component after showing notification
    },
  });
};

// ✅ Delete Role
export const useDeleteRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/roles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });
};

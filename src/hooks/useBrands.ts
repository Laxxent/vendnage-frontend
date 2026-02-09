import { AxiosError } from "axios";
import apiClient from "../api/axiosConfig";
import { ApiErrorResponse, Brand, CreateBrandPayload } from "../types/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// Fetch All Brands
export const useFetchBrands = () => {
  return useQuery<Brand[], AxiosError>({
    queryKey: ["brands"],
    staleTime: 30 * 1000, // ✅ 30 seconds - lebih pendek agar data refresh lebih cepat
    gcTime: 5 * 60 * 1000, // ✅ 5 menit - keep in cache
    refetchOnWindowFocus: false, // ✅ Jangan refetch saat window focus
    refetchOnMount: true, // ✅ ENABLED - refetch saat mount jika data sudah stale (penting untuk update setelah create)
    refetchInterval: false, // ✅ NONAKTIFKAN - hanya refresh saat ada perubahan (melalui mutation invalidation)
    refetchIntervalInBackground: false, // ✅ Jangan refetch di background
    queryFn: async () => {
      const response = await apiClient.get("/categories");
      return response.data;
    },
  });
};

// Fetch Single Brand by ID
export const useFetchBrand = (id: number) => {
  return useQuery<Brand, AxiosError>({
    queryKey: ["brand", id],
    queryFn: async () => {
      const response = await apiClient.get(`/categories/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

export const useCreateBrand = () => {
  const queryClient = useQueryClient();

  return useMutation<CreateBrandPayload, AxiosError<ApiErrorResponse>, CreateBrandPayload>({
    mutationFn: async (payload: CreateBrandPayload) => {
      const formData = new FormData();
      formData.append("name", payload.name);
      formData.append("tagline", payload.tagline);
      formData.append("photo", payload.photo);

      const response = await apiClient.post("/categories", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] }); // Also invalidate categories for backward compatibility
      // Navigation is handled by component after showing success toast
    },
  });
}; 

export const useUpdateBrand = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Brand,
    AxiosError<ApiErrorResponse>,
    { id: number } & CreateBrandPayload
  >({
    mutationFn: async ({ id, ...payload }) => {
      const formData = new FormData();
      formData.append("name", payload.name);
      formData.append("tagline", payload.tagline);
      formData.append("_method", "PUT");

      if (payload.photo && payload.photo instanceof File) {
        formData.append("photo", payload.photo);
      }

      const response = await apiClient.post(`/categories/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      queryClient.invalidateQueries({ queryKey: ["brand", id] });
      queryClient.invalidateQueries({ queryKey: ["categories"] }); // Also invalidate categories for backward compatibility
    },
  });
};

export const useDeleteBrand = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] }); // Also invalidate categories for backward compatibility
    }, 
  });
};


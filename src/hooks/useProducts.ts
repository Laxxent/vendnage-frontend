import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "../api/axiosConfig";
import { AxiosError } from "axios";
import { Product, CreateProductPayload, ApiErrorResponse } from "../types/types" 
// import { useNavigate } from "react-router-dom";

// Fetch All Products (for backward compatibility - used by dropdowns, etc.)
export const useFetchProducts = () => {
  return useQuery<Product[], AxiosError>({
    queryKey: ["products"],
    staleTime: 30 * 1000, // ✅ 30 seconds - consistent with brands (prevent data not updating issue)
    gcTime: 5 * 60 * 1000, // ✅ 5 minutes - keep in cache
    refetchOnWindowFocus: false, // ✅ Jangan refetch saat window focus
    refetchOnMount: true, // ✅ ENABLED - refetch when component mounts if data is stale (important for CRUD operations)
    refetchInterval: false, // ✅ NONAKTIFKAN - hanya refresh saat ada perubahan (melalui mutation invalidation)
    refetchIntervalInBackground: false, // ✅ Jangan refetch di background
    queryFn: async () => {
      // ✅ Try to include category relationship if API supports it
      try {
        const response = await apiClient.get("/products?with=category");
        // Handle both array and paginated response
        const data = response.data?.data || response.data;
        return Array.isArray(data) ? data : [];
      } catch (error) {
        // ✅ Fallback to regular endpoint if query parameter not supported
        const response = await apiClient.get("/products");
        const data = response.data?.data || response.data;
        return Array.isArray(data) ? data : [];
      }
    },
  });
};

// ==================== PAGINATED PRODUCTS ====================
// ✅ New hook for server-side pagination (used by ProductList)

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
  from: number;
  to: number;
}

export const useFetchProductsPaginated = (page: number = 1, perPage: number = 10, search?: string) => {
  // const queryClient = useQueryClient();
  
  return useQuery<{ data: Product[]; meta: PaginationMeta }, AxiosError>({
    queryKey: ["products-paginated", page, perPage, search],
    staleTime: 0, // ✅ 0 - data selalu dianggap stale setelah invalidate untuk sinkronisasi
    gcTime: 10 * 60 * 1000, // ✅ 10 menit - data tetap di cache
    refetchOnWindowFocus: false,
    refetchOnMount: true, // ✅ Refetch saat mount untuk data terbaru
    queryFn: async () => {
      try {
        const params: any = {};
        
        // ✅ Server-side pagination
        params.per_page = Math.min(perPage, 100); // Maksimal 100 sesuai backend limit
        params.page = page;
        
        // ✅ Add search parameter if provided
        if (search && search.trim()) {
          params.search = search.trim();
        }
        
        // ✅ Include category relationship
        params.with = "category";
        
        let response;
        let responseData;
        
        try {
          response = await apiClient.get("/products", { params });
          responseData = response.data;
        } catch (error: any) {
          // ✅ Fallback: if backend doesn't support pagination params
          if (error.response?.status === 500) {
            console.warn("⚠️ Backend mungkin tidak support pagination, trying fallback...");
            response = await apiClient.get("/products");
            responseData = response.data;
          } else {
            throw error;
          }
        }
        
        // ✅ Handle paginated response from backend
        let items: Product[] = [];
        let meta: PaginationMeta;
        
        if (responseData) {
          // ✅ Format 1: { data: [...], meta: { ... } } - Laravel Resource with pagination
          if (responseData.data && Array.isArray(responseData.data) && responseData.meta) {
            items = responseData.data;
            meta = {
              current_page: responseData.meta.current_page || page,
              last_page: responseData.meta.last_page || 1,
              total: responseData.meta.total || 0,
              per_page: responseData.meta.per_page || perPage,
              from: responseData.meta.from || 0,
              to: responseData.meta.to || 0,
            };
            console.log("📄 Products - Server-side pagination. Page:", meta.current_page, "Total:", meta.total);
          }
          // ✅ Format 2: { data: { data: [...], current_page, ... } } - Nested pagination
          else if (responseData.data?.data && Array.isArray(responseData.data.data) && typeof responseData.data.current_page === 'number') {
            items = responseData.data.data;
            meta = {
              current_page: responseData.data.current_page,
              last_page: responseData.data.last_page,
              total: responseData.data.total,
              per_page: responseData.data.per_page,
              from: responseData.data.from,
              to: responseData.data.to,
            };
          }
          // ✅ Format 3: Direct array (no pagination from backend - fallback to client-side)
          else if (Array.isArray(responseData.data)) {
            items = responseData.data;
            // Calculate client-side pagination
            const total = items.length;
            const startIndex = (page - 1) * perPage;
            const endIndex = startIndex + perPage;
            const paginatedItems = items.slice(startIndex, endIndex);
            
            meta = {
              current_page: page,
              last_page: Math.ceil(total / perPage) || 1,
              total: total,
              per_page: perPage,
              from: startIndex + 1,
              to: Math.min(endIndex, total),
            };
            items = paginatedItems;
            console.log("📄 Products - Client-side pagination fallback. Total:", total);
          }
          // ✅ Format 4: Direct array without wrapper
          else if (Array.isArray(responseData)) {
            items = responseData;
            const total = items.length;
            const startIndex = (page - 1) * perPage;
            const endIndex = startIndex + perPage;
            const paginatedItems = items.slice(startIndex, endIndex);
            
            meta = {
              current_page: page,
              last_page: Math.ceil(total / perPage) || 1,
              total: total,
              per_page: perPage,
              from: startIndex + 1,
              to: Math.min(endIndex, total),
            };
            items = paginatedItems;
          }
          // ✅ Default: empty
          else {
            items = [];
            meta = {
              current_page: 1,
              last_page: 1,
              total: 0,
              per_page: perPage,
              from: 0,
              to: 0,
            };
          }
        } else {
          items = [];
          meta = {
            current_page: 1,
            last_page: 1,
            total: 0,
            per_page: perPage,
            from: 0,
            to: 0,
          };
        }
        
        return { data: items, meta };
      } catch (error) {
        console.error("Error fetching products:", error);
        return { 
          data: [], 
          meta: { current_page: 1, last_page: 1, total: 0, per_page: perPage, from: 0, to: 0 } 
        };
      }
    },
  });
};


// Fetch Single Product by ID
export const useFetchProduct = (id: number) => {
  return useQuery<Product, AxiosError>({
    queryKey: ["product", id],
    queryFn: async () => {
      // ✅ Try to include category relationship if API supports it
      try {
        const response = await apiClient.get(`/products/${id}?with=category`);
        return response.data;
      } catch (error) {
        // ✅ Fallback to regular endpoint if query parameter not supported
      const response = await apiClient.get(`/products/${id}`);
      return response.data;
      }
    },
    enabled: !!id && id > 0, // ✅ Only fetch when id is valid
    staleTime: 30 * 1000, // ✅ 30 seconds - consistent with other queries
    gcTime: 5 * 60 * 1000, // ✅ 5 minutes - keep in cache
  });
}; 


// Create Product
export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  // const navigate = useNavigate();

  return useMutation<CreateProductPayload, AxiosError<ApiErrorResponse>, CreateProductPayload>({
    mutationFn: async (payload) => {
      const formData = new FormData();
      formData.append("name", payload.name);
      // Price removed - will be handled by backend
      formData.append("about", payload.about);
      formData.append("brand_id", payload.brand_id.toString());
      formData.append("thumbnail", payload.thumbnail);

      const response = await apiClient.post("/products", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      return response.data;
    },
    onSuccess: () => {
      // Invalidate both regular and paginated queries
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products-paginated"] });
      // Redirect is handled in the component to allow notification to be visible
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation<
  Product, // response type
    AxiosError<ApiErrorResponse>, // error type
    { id: number } & CreateProductPayload // payload
  >({
    mutationFn: async ({ id, ...payload }) => {
      const formData = new FormData();
      
      formData.append("name", payload.name);
      // Price removed - will be handled by backend
      formData.append("about", payload.about);
      formData.append("brand_id", payload.brand_id.toString());
      formData.append("_method", "PUT"); // ✅ Laravel requires `_method` for FormData updates

      if (payload.thumbnail) {
        formData.append("thumbnail", payload.thumbnail);
      }

      const response = await apiClient.post(`/products/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      return response.data;
    },
    onSuccess: (_, { id }) => {
      // Invalidate both regular and paginated queries
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products-paginated"] });
      queryClient.invalidateQueries({ queryKey: ["product", id] });
    },
  });
};


// Delete Product
export const useDeleteProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/products/${id}`);
    },
    onSuccess: () => {
      // Invalidate both regular and paginated queries
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products-paginated"] });
    },
  });
};




import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "../api/axiosConfig";
import { AxiosError } from "axios";
import { Warehouse, ApiErrorResponse, CreateWarehousePayload } from "../types/types";

// Fetch All Warehouses
export const useFetchWarehouses = () => {
  return useQuery<Warehouse[], AxiosError>({
    queryKey: ["warehouses"],
    staleTime: 30 * 1000, // ✅ 30 seconds - consistent with other master data
    gcTime: 5 * 60 * 1000, // ✅ 5 minutes - keep in cache
    refetchOnWindowFocus: false,
    refetchOnMount: true, // ✅ ENABLED - ensure fresh data after CRUD operations
    queryFn: async () => {
      const response = await apiClient.get("/warehouses");
      let data = response.data;
      
      // Handle different response formats
      if (data && data.data && Array.isArray(data.data)) {
        data = data.data;
      } else if (!Array.isArray(data)) {
        return [];
      }
      
      // Process warehouses and normalize address field
      const warehousesWithAddress = data.map((warehouse: any) => {
        // Try multiple possible field names for address
        let address = "";
        
        if (warehouse.address && warehouse.address.trim() !== "") {
          address = warehouse.address.trim();
        } else if (warehouse.alamat && warehouse.alamat.trim() !== "") {
          address = warehouse.alamat.trim();
        } else if (warehouse.adress && warehouse.adress.trim() !== "") {
          address = warehouse.adress.trim();
        } else if (warehouse.warehouse_address && warehouse.warehouse_address.trim() !== "") {
          address = warehouse.warehouse_address.trim();
        } else if (warehouse.data?.address && warehouse.data.address.trim() !== "") {
          address = warehouse.data.address.trim();
        }
        
        // Preserve all fields from warehouse and ensure address is set
        return {
          ...warehouse,
          address: address || warehouse.address || "",
          products: warehouse.products || [],
        };
      });
      
      return warehousesWithAddress;
    },
  });
};

// Fetch Single Warehouse by ID
export const useFetchWarehouse = (id: number) => {
  return useQuery<Warehouse, AxiosError>({
    queryKey: ["warehouse", id],
    queryFn: async () => {
      // First try the detail endpoint
      const detailRes = await apiClient.get(`/warehouses/${id}`);
      let data: any = detailRes.data;

      // Fallback: some APIs omit address on detail endpoint; look it up from list
      if (!data?.address && !data?.alamat && !data?.adress) {
        try {
          const listRes = await apiClient.get(`/warehouses`);
          const fromList = (listRes.data as any[]).find((w) => Number(w.id) === Number(id));
          if (fromList) {
            data = { ...fromList, ...data };
          }
        } catch (_) {
          // ignore fallback errors; we'll normalize whatever we have
        }
      }

      const normalized: Warehouse = {
        id: data.id,
        name: data.name,
        phone: data.phone,
        photo: data.photo,
        address: data.address ?? data.alamat ?? data.adress ?? "",
        products: data.products ?? [],
      };
      return normalized;
    },
    enabled: !!id,
  });
};

export const useCreateWarehouse = () => {
  const queryClient = useQueryClient();

  return useMutation<CreateWarehousePayload, AxiosError<ApiErrorResponse>, CreateWarehousePayload>({
    mutationFn: async (payload: CreateWarehousePayload) => {
      const formData = new FormData();
      formData.append("name", payload.name);
      formData.append("address", payload.address);
      formData.append("phone", payload.phone);
      if (payload.photo) formData.append("photo", payload.photo);

      const response = await apiClient.post("/warehouses", formData, {
        headers: { "Content-Type": "multipart/form-data" },

      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] }); // Refresh warehouse list
      // Navigation is handled by component after showing success toast
    },
  });
};  

export const useUpdateWarehouse = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Warehouse, // response type
    AxiosError<ApiErrorResponse>, // error type
    { id: number } & CreateWarehousePayload // payload
  >({
    mutationFn: async ({ id, ...payload }) => {
      const formData = new FormData();
      formData.append("name", payload.name);
      formData.append("address", payload.address);
      formData.append("phone", payload.phone);

      formData.append("_method", "PUT"); // ✅ Laravel expects this for PUT with FormData

      if (payload.photo) {
        formData.append("photo", payload.photo);
      }

      const response = await apiClient.post(`/warehouses/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      queryClient.invalidateQueries({ queryKey: ["warehouse", id] });
    },
  });
};

export const useDeleteWarehouse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/warehouses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
    }, 
  });
}; 
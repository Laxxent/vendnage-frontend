import { useMutation, useQuery, useQueryClient, UseQueryOptions } from "@tanstack/react-query";
import apiClient from "../api/axiosConfig";
import { AxiosError } from "axios";
import {
  ApiErrorResponse,
  StockIn,
  CreateStockInPayload,
  UpdateStockInPayload,
  StockReturn,
  CreateStockReturnPayload,
  UpdateStockReturnPayload,
  StockTransfer,
  CreateStockTransferPayload,
  UpdateStockTransferPayload,
  StockBalance
} from "../types/types";
import { useAuth } from "./useAuth";
import { isManager } from "../utils/roleHelpers";

// ==================== STOCK IN ====================

// Fetch All Stock Ins with Server-Side Pagination
export const useFetchStockIns = (page: number = 1, perPage: number = 10, search?: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useQuery<{ data: StockIn[]; meta: any }, AxiosError>({
    queryKey: ["stock-ins", user?.id, page, perPage, search],
    staleTime: 60 * 1000, // ✅ 60 seconds - transactional data (fresher than master but not real-time)
    gcTime: 10 * 60 * 1000, // ✅ 10 menit - data tetap di cache
    refetchOnWindowFocus: false, // ✅ Jangan refetch saat window focus
    refetchOnMount: true, // ✅ Refetch saat component mount untuk sinkronisasi multi-user
    queryFn: async () => {
      try {
        const params: any = {};
        
        // Jika bukan manager, filter berdasarkan user_id (generic untuk semua PIC)
        if (user && !isManager(user.roles)) {
          params.user_id = user.id;
          console.log("📋 Fetching Stock Ins for user_id:", user.id, "(Non-Manager)");
        } else {
          console.log("📋 Fetching ALL Stock Ins (Manager)");
        }
        
        // ✅ Server-side pagination: maksimal 100 per page sesuai backend limit
        params.per_page = Math.min(perPage, 100); // Maksimal 100 sesuai backend
        params.page = page;
        
        // ✅ Add search parameter if provided
        if (search && search.trim()) {
          params.search = search.trim();
        }
        
        let response;
        let responseData;
        
        try {
          response = await apiClient.get("/stock-ins", { params });
          responseData = response.data;
        } catch (error: any) {
          // ✅ Fallback: jika backend tidak support pagination (500 error), coba tanpa parameter
          if (error.response?.status === 500) {
            console.warn("⚠️ Backend mungkin tidak support pagination, trying fallback without pagination params...");
            try {
              const fallbackParams: any = {};
              if (user && !isManager(user.roles)) {
                fallbackParams.user_id = user.id;
              }
              // Coba tanpa per_page dan page
              response = await apiClient.get("/stock-ins", { params: fallbackParams });
              responseData = response.data;
            } catch (fallbackError) {
              console.error("Fallback also failed:", fallbackError);
              throw fallbackError;
            }
          } else {
            throw error;
          }
        }
        
        // ✅ Handle paginated response from backend
        let items: any[] = [];
        let meta: any = null;
        
        if (responseData) {
          // ✅ PRIORITAS 1: Format baru dari backend - { data: [...], meta: { ... } }
          if (responseData.data && Array.isArray(responseData.data) && responseData.meta) {
            items = responseData.data;
            meta = {
              current_page: responseData.meta.current_page || page,
              last_page: responseData.meta.last_page || 1,
              total: responseData.meta.total || 0,
              per_page: responseData.meta.per_page || perPage,
              from: responseData.meta.from || 0,
              to: responseData.meta.to || 0,
              optimal_per_page: responseData.meta.optimal_per_page, // ✅ Baru: optimal per_page dari backend
              max_per_page: responseData.meta.max_per_page, // ✅ Baru: max per_page dari backend
            };
            console.log("📄 Stock Ins - Server-side pagination (new format). Page:", meta.current_page, "Total:", meta.total, "Items:", items.length, "Optimal per_page:", meta.optimal_per_page);
          }
          // ✅ PRIORITAS 2: Format lama (fallback) - { data: { data: [...], current_page, ... } }
          else if (responseData.data && responseData.data.data && Array.isArray(responseData.data.data) && typeof responseData.data.current_page === 'number') {
            items = responseData.data.data;
            meta = {
              current_page: responseData.data.current_page,
              last_page: responseData.data.last_page,
              total: responseData.data.total,
              per_page: responseData.data.per_page,
              from: responseData.data.from,
              to: responseData.data.to,
            };
            console.log("📄 Stock Ins - Server-side pagination (old format). Page:", meta.current_page, "Total:", meta.total, "Items:", items.length);
          }
          // ✅ PRIORITAS 3: Format tanpa pagination - { data: [...] }
          else if (Array.isArray(responseData.data)) {
            items = responseData.data;
            meta = {
              current_page: 1,
              last_page: 1,
              total: items.length,
              per_page: items.length,
              from: 1,
              to: items.length,
            };
          }
          // ✅ PRIORITAS 4: Direct array response (fallback)
          else if (Array.isArray(responseData)) {
            items = responseData;
            meta = {
              current_page: 1,
              last_page: 1,
              total: items.length,
              per_page: items.length,
              from: 1,
              to: items.length,
            };
          }
        }
        
        if (!Array.isArray(items)) {
          console.warn("⚠️ Stock Ins data is not an array:", items);
          return { data: [], meta: meta || {} };
        }
        
        console.log("✅ Fetched Stock Ins - Page:", page, "Items:", items.length, "Total:", meta?.total || items.length);
        
        // ✅ Use React Query cache for products and warehouses
        let productsMap: Map<number, any> = new Map();
        let warehousesMap: Map<number, any> = new Map();
        
          // ✅ Use React Query cache for validation (optional) but don't force fetch
          // Backend already provides eager loaded relationships
          const cachedProducts = queryClient.getQueryData<any[]>(["products"]);
          const cachedWarehouses = queryClient.getQueryData<any[]>(["warehouses"]);
          
          if (cachedProducts && Array.isArray(cachedProducts)) {
            cachedProducts.forEach((p: any) => {
              if (p && p.id) productsMap.set(p.id, p);
            });
          }
          
          if (cachedWarehouses && Array.isArray(cachedWarehouses)) {
            cachedWarehouses.forEach((w: any) => {
              if (w && w.id) warehousesMap.set(w.id, { id: w.id, name: w.name });
            });
          }
          
          // REMOVED: Aggressive fetching of all products/warehouses.
          // We rely on backend eager loading for list views.
        
        // ✅ Map and transform data
        const mappedData = items.map((stockIn: any) => {
          const warehouse = stockIn.warehouse || 
            (stockIn.warehouse_id && warehousesMap.has(stockIn.warehouse_id) 
              ? warehousesMap.get(stockIn.warehouse_id) 
              : null);
          
          const stockInProducts = (stockIn.stock_in_products || []).map((sip: any) => {
            const product = sip.product || 
              (sip.product_id && productsMap.has(sip.product_id) 
                ? productsMap.get(sip.product_id) 
                : null);
            
            return {
              ...sip,
              product,
            };
          });
          
          return {
          id: stockIn.id || 0,
          code: stockIn.code,
          warehouse_id: stockIn.warehouse_id || 0,
          user_id: stockIn.user_id,
          date: stockIn.date || "",
          notes: stockIn.notes,
          total_quantity: stockIn.total_quantity,
          status: stockIn.status,
            stock_in_products: stockInProducts,
            warehouse,
          created_at: stockIn.created_at,
          updated_at: stockIn.updated_at,
          };
        });
        
        // ✅ Return data with pagination meta
        return {
          data: mappedData,
          meta: meta || {
            current_page: page,
            last_page: 1,
            total: mappedData.length,
            per_page: perPage,
            from: (page - 1) * perPage + 1,
            to: (page - 1) * perPage + mappedData.length,
          },
        };
      } catch (error) {
        console.error("Error fetching stock-ins:", error);
        return { data: [], meta: null };
      }
    },
  });
};

// Fetch Single Stock In
export const useFetchStockIn = (id: number, options?: Partial<UseQueryOptions<StockIn, AxiosError>>) => {
  return useQuery<StockIn, AxiosError>({
    queryKey: ["stock-in", id],
    queryFn: async () => {
      try {
      const response = await apiClient.get(`/stock-ins/${id}`);
        let data = response.data?.data || response.data;
        
        if (!data) {
          return null as any;
        }
        
        // Fetch products and warehouses for mapping
        let productsMap: Map<number, any> = new Map();
        let warehousesMap: Map<number, any> = new Map();
        
        try {
          const [productsRes, warehousesRes] = await Promise.all([
            apiClient.get("/products"),
            apiClient.get("/warehouses"),
          ]);
          
          const productsData = productsRes.data?.data || productsRes.data;
          const warehousesData = warehousesRes.data?.data || warehousesRes.data;
          
          if (Array.isArray(productsData)) {
            productsData.forEach((p: any) => {
              if (p && p.id) productsMap.set(p.id, p);
            });
          }
          
          if (Array.isArray(warehousesData)) {
            warehousesData.forEach((w: any) => {
              if (w && w.id) warehousesMap.set(w.id, { id: w.id, name: w.name });
            });
          }
        } catch (error) {
          console.warn("Failed to fetch products/warehouses:", error);
        }
        
        // Normalize warehouse
        const warehouse = data.warehouse || 
          (data.warehouse_id && warehousesMap.has(data.warehouse_id) 
            ? warehousesMap.get(data.warehouse_id) 
            : null);
        
        // Check if stock_in_products is empty - try to fetch separately if needed
        let stockInProducts = data.stock_in_products || [];
        
        // If stock_in_products is empty but total_quantity > 0, try to fetch separately
        if (stockInProducts.length === 0 && data.total_quantity > 0) {
          console.warn("⚠️ stock_in_products is empty but total_quantity > 0. Trying to fetch separately...");
          try {
            // Try to fetch stock_in_products from a separate endpoint if available
            // This is a fallback - backend should ideally include stock_in_products in the main response
            const stockInProductsRes = await apiClient.get(`/stock-ins/${id}/products`);
            const stockInProductsData = stockInProductsRes.data?.data || stockInProductsRes.data;
            if (Array.isArray(stockInProductsData) && stockInProductsData.length > 0) {
              stockInProducts = stockInProductsData;
              console.log("✅ Successfully fetched stock_in_products separately:", stockInProducts.length);
            }
          } catch (error) {
            console.warn("⚠️ Could not fetch stock_in_products separately. Backend needs to include stock_in_products in the main response.", error);
          }
        }
        
        // Normalize stock_in_products
        const normalizedStockInProducts = stockInProducts.map((sip: any) => {
          const product = sip.product || 
            (sip.product_id && productsMap.has(sip.product_id) 
              ? productsMap.get(sip.product_id) 
              : null);
          
          return {
            id: sip.id || 0,
            stock_in_id: sip.stock_in_id || data.id || 0,
            product_id: sip.product_id || 0,
            quantity: sip.quantity || 0,
            price: sip.price,
            expiry_date: sip.expiry_date,
            batch_number: sip.batch_number,
            notes: sip.notes,
            product,
          };
        });
        
        return {
          id: data.id || 0,
          code: data.code,
          warehouse_id: data.warehouse_id || 0,
          user_id: data.user_id,
          date: data.date || "",
          notes: data.notes,
          total_quantity: data.total_quantity,
          status: data.status,
          stock_in_products: normalizedStockInProducts,
          warehouse,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
      } catch (error) {
        console.error("Error fetching stock-in:", error);
        throw error;
      }
    },
    enabled: !!id,
    ...options,
  });
};

// Create Stock In
export const useCreateStockIn = () => {
  const queryClient = useQueryClient();

  return useMutation<StockIn, AxiosError<ApiErrorResponse>, CreateStockInPayload>({
    mutationFn: async (payload) => {
      const response = await apiClient.post("/stock-ins", payload, {
        headers: { "Content-Type": "application/json" },
      });
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      // Invalidate all stock-ins queries (including those with user_id)
      queryClient.invalidateQueries({ queryKey: ["stock-ins"], exact: false });
      // Invalidate all stock-balances queries (including those with warehouseId and user_id)
      queryClient.invalidateQueries({ queryKey: ["stock-balances"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["stock-balance"] }); // Also invalidate singular for product-specific queries
      queryClient.invalidateQueries({ queryKey: ["expiry-alerts"] });
      // ✅ Invalidate summary queries untuk Overview page
      queryClient.invalidateQueries({ queryKey: ["stock-ins-summary"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["stock-balances-summary"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["alerts-summary"], exact: false });
      // Force refetch all stock-ins queries to ensure fresh data
      queryClient.refetchQueries({ queryKey: ["stock-ins"], exact: false });
      // Force refetch all stock-balances queries to ensure fresh data
      queryClient.refetchQueries({ queryKey: ["stock-balances"], exact: false });
      // Force refetch all stock-balance queries to ensure fresh data
      queryClient.refetchQueries({ queryKey: ["stock-balance"] });
      // ✅ Force refetch summary queries untuk Overview page (auto sync)
      queryClient.refetchQueries({ queryKey: ["stock-ins-summary"], exact: false });
      queryClient.refetchQueries({ queryKey: ["stock-balances-summary"], exact: false });
      queryClient.refetchQueries({ queryKey: ["alerts-summary"], exact: false });
    },
  });
};

// Update Stock In
export const useUpdateStockIn = () => {
  const queryClient = useQueryClient();

  return useMutation<StockIn, AxiosError<ApiErrorResponse>, UpdateStockInPayload>({
    mutationFn: async ({ id, ...payload }) => {
      const response = await apiClient.put(`/stock-ins/${id}`, payload, {
        headers: { "Content-Type": "application/json" },
      });
      return response.data?.data || response.data;
    },
    onSuccess: (_, { id }) => {
      // Invalidate all stock-ins queries (including those with user_id)
      queryClient.invalidateQueries({ queryKey: ["stock-ins"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["stock-in", id] });
      // Invalidate all stock-balances queries (including those with warehouseId and user_id)
      queryClient.invalidateQueries({ queryKey: ["stock-balances"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["stock-balance"] }); // Also invalidate singular for product-specific queries
      queryClient.invalidateQueries({ queryKey: ["expiry-alerts"] });
      // ✅ Invalidate summary queries untuk Overview page
      queryClient.invalidateQueries({ queryKey: ["stock-ins-summary"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["stock-balances-summary"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["alerts-summary"], exact: false });
      // Force refetch all stock-ins queries to ensure fresh data
      queryClient.refetchQueries({ queryKey: ["stock-ins"], exact: false });
      // Force refetch all stock-balances queries to ensure fresh data
      queryClient.refetchQueries({ queryKey: ["stock-balances"], exact: false });
      // Force refetch all stock-balance queries to ensure fresh data
      queryClient.refetchQueries({ queryKey: ["stock-balance"] });
      // ✅ Force refetch summary queries untuk Overview page (auto sync)
      queryClient.refetchQueries({ queryKey: ["stock-ins-summary"], exact: false });
      queryClient.refetchQueries({ queryKey: ["stock-balances-summary"], exact: false });
      queryClient.refetchQueries({ queryKey: ["alerts-summary"], exact: false });
    },
  });
};

// Delete Stock In
export const useDeleteStockIn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/stock-ins/${id}`);
    },
    onSuccess: () => {
      // ✅ Hanya invalidate, React Query akan otomatis refetch queries yang aktif di background
      queryClient.invalidateQueries({ queryKey: ["stock-ins"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["stock-balances"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["expiry-alerts"] });
      // ✅ Invalidate summary queries untuk Overview page
      queryClient.invalidateQueries({ queryKey: ["stock-ins-summary"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["stock-balances-summary"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["alerts-summary"], exact: false });
      // ✅ Force refetch summary queries untuk Overview page (auto sync)
      queryClient.refetchQueries({ queryKey: ["stock-ins-summary"], exact: false });
      queryClient.refetchQueries({ queryKey: ["stock-balances-summary"], exact: false });
      queryClient.refetchQueries({ queryKey: ["alerts-summary"], exact: false });
    },
  });
};

// ==================== STOCK RETURN ====================

// Fetch All Stock Returns with Server-Side Pagination
export const useFetchStockReturns = (page: number = 1, perPage: number = 10, search?: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useQuery<{ data: StockReturn[]; meta: any }, AxiosError>({
    queryKey: ["stock-returns", user?.id, page, perPage, search],
    staleTime: 60 * 1000, // ✅ 60 seconds - transactional data (Stock Transfers)
    gcTime: 10 * 60 * 1000, // ✅ 10 menit - data tetap di cache
    refetchOnWindowFocus: false, // ✅ Jangan refetch saat window focus
    refetchOnMount: true, // ✅ Refetch saat component mount untuk memastikan data terbaru muncul (sinkronisasi otomatis)
    queryFn: async () => {
      try {
        const params: any = {};
        
        if (user && !isManager(user.roles)) {
          params.user_id = user.id;
        }
        
        // ✅ Server-side pagination: maksimal 100 per page sesuai backend limit
        params.per_page = Math.min(perPage, 100); // Maksimal 100 sesuai backend
        params.page = page;
        
        // ✅ Add search parameter if provided
        if (search && search.trim()) {
          params.search = search.trim();
        }
        
        // ✅ Include relationships if API supports it
        // SEMENTARA DINONAKTIFKAN UNTUK TESTING - jika backend tidak support dengan pagination
        // const withParam = "stock_return_products.product,from_warehouse,from_vending_machine,to_warehouse";
        // params.with = withParam;
        
        let response;
        let responseData;
        
        try {
          response = await apiClient.get("/stock-returns", { params });
          responseData = response.data;
        } catch (error: any) {
          // ✅ Fallback: jika backend tidak support pagination (500 error), coba tanpa parameter
          if (error.response?.status === 500) {
            console.warn("⚠️ Backend mungkin tidak support pagination, trying fallback without pagination params...");
            try {
              const fallbackParams: any = {};
              if (user && !isManager(user.roles)) {
                fallbackParams.user_id = user.id;
              }
              // Coba tanpa per_page dan page
              response = await apiClient.get("/stock-returns", { params: fallbackParams });
              responseData = response.data;
            } catch (fallbackError) {
              console.error("Fallback also failed:", fallbackError);
              throw fallbackError;
            }
          } else {
            throw error;
          }
        }
        
        // ✅ Handle paginated response from backend
        let items: any[] = [];
        let meta: any = null;
        
        if (responseData) {
          // ✅ PRIORITAS 1: Format baru dari backend - { data: [...], meta: { ... } }
          if (responseData.data && Array.isArray(responseData.data) && responseData.meta) {
            items = responseData.data;
            meta = {
              current_page: responseData.meta.current_page || page,
              last_page: responseData.meta.last_page || 1,
              total: responseData.meta.total || 0,
              per_page: responseData.meta.per_page || perPage,
              from: responseData.meta.from || 0,
              to: responseData.meta.to || 0,
              optimal_per_page: responseData.meta.optimal_per_page, // ✅ Baru: optimal per_page dari backend
              max_per_page: responseData.meta.max_per_page, // ✅ Baru: max per_page dari backend
            };
            console.log("📄 Stock Returns - Server-side pagination (new format). Page:", meta.current_page, "Total:", meta.total, "Items:", items.length, "Optimal per_page:", meta.optimal_per_page);
            
            // ✅ DEBUG: Log sample item untuk verifikasi relationships (hanya di development)
            if (items.length > 0 && process.env.NODE_ENV === 'development') {
              const sampleItem = items[0];
              console.log("📦 Sample Stock Return from API:", {
                id: sampleItem.id,
                code: sampleItem.code,
                has_from_warehouse: !!sampleItem.from_warehouse,
                has_from_vending_machine: !!sampleItem.from_vending_machine,
                from_warehouse_name: sampleItem.from_warehouse?.name,
                from_vending_machine_name: sampleItem.from_vending_machine?.name,
                from_warehouse_id: sampleItem.from_warehouse_id,
                from_vending_machine_id: sampleItem.from_vending_machine_id,
              });
            }
          }
          // ✅ PRIORITAS 2: Format lama (fallback) - { data: { data: [...], current_page, ... } }
          else if (responseData.data && responseData.data.data && Array.isArray(responseData.data.data) && typeof responseData.data.current_page === 'number') {
            items = responseData.data.data;
            meta = {
              current_page: responseData.data.current_page,
              last_page: responseData.data.last_page,
              total: responseData.data.total,
              per_page: responseData.data.per_page,
              from: responseData.data.from,
              to: responseData.data.to,
            };
            console.log("📄 Stock Returns - Server-side pagination (old format). Page:", meta.current_page, "Total:", meta.total, "Items:", items.length);
          }
          // ✅ PRIORITAS 3: Format tanpa pagination - { data: [...] }
          else if (Array.isArray(responseData.data)) {
            items = responseData.data;
            meta = {
              current_page: 1,
              last_page: 1,
              total: items.length,
              per_page: items.length,
              from: 1,
              to: items.length,
            };
          }
          // ✅ PRIORITAS 4: Direct array response (fallback)
          else if (Array.isArray(responseData)) {
            items = responseData;
            meta = {
              current_page: 1,
              last_page: 1,
              total: items.length,
              per_page: items.length,
              from: 1,
              to: items.length,
            };
          }
        }
        
        if (!Array.isArray(items)) {
          console.warn("⚠️ Stock Returns data is not an array:", items);
          return { data: [], meta: meta || {} };
        }
        
        console.log("✅ Fetched Stock Returns - Page:", page, "Items:", items.length, "Total:", meta?.total || items.length);
        
        let productsMap: Map<number, any> = new Map();
        let warehousesMap: Map<number, any> = new Map();
        let vendingMachinesMap: Map<number, any> = new Map();
        
        try {
          const cachedProducts = queryClient.getQueryData<any[]>(["products"]);
          const cachedWarehouses = queryClient.getQueryData<any[]>(["warehouses"]);
          const cachedVendingMachines = queryClient.getQueryData<any[]>(["vending-machines"]);
          
          if (cachedProducts && Array.isArray(cachedProducts)) {
            cachedProducts.forEach((p: any) => {
              if (p && p.id) productsMap.set(p.id, p);
            });
          }
          
          if (cachedWarehouses && Array.isArray(cachedWarehouses)) {
            cachedWarehouses.forEach((w: any) => {
              if (w && w.id) warehousesMap.set(w.id, { id: w.id, name: w.name });
            });
          }
          
          if (cachedVendingMachines && Array.isArray(cachedVendingMachines)) {
            cachedVendingMachines.forEach((vm: any) => {
              if (vm && vm.id) vendingMachinesMap.set(vm.id, { id: vm.id, name: vm.name, location: vm.location });
            });
          }
          
          // REMOVED: Aggressive fetching of all resources.
          // We rely on backend eager loading for list views.

            

            

            

            

      } catch (error) {
          console.warn("Failed to fetch products/warehouses/vending-machines:", error);
        }
        
        // ✅ Map and transform data
        const mappedData = items.map((stockReturn: any) => {
          // ✅ DEBUG: Log raw data untuk debugging (hanya di development, untuk item pertama saja)
          if (process.env.NODE_ENV === 'development' && items.indexOf(stockReturn) === 0) {
            console.log("🔍 Raw Stock Return from API (First Item):", {
              id: stockReturn.id,
              code: stockReturn.code,
              source_type: stockReturn.source_type,
              from_warehouse: stockReturn.from_warehouse,
              from_warehouse_id: stockReturn.from_warehouse_id,
              from_vending_machine: stockReturn.from_vending_machine,
              from_vending_machine_id: stockReturn.from_vending_machine_id,
              to_warehouse: stockReturn.to_warehouse,
              to_warehouse_id: stockReturn.to_warehouse_id,
            });
          }
          
          // ✅ PERBAIKAN: Prioritaskan relationships dari response API
          // Jika relationships tidak ada di response, coba dari cache
          // Jika cache juga tidak ada, set null (akan di-handle di UI dengan fallback ke ID)
          let fromWarehouse = null;
          // ✅ PERBAIKAN: Cek apakah from_warehouse_id valid (bukan null, undefined, atau 0)
          const fromWarehouseId = stockReturn.from_warehouse_id;
          const isValidFromWarehouseId = fromWarehouseId != null && fromWarehouseId > 0;
          
          if (stockReturn.from_warehouse) {
            // ✅ Relationships ada di response API
            fromWarehouse = stockReturn.from_warehouse;
          } else if (isValidFromWarehouseId) {
            // ✅ Coba dari cache
            if (warehousesMap.has(fromWarehouseId)) {
              fromWarehouse = warehousesMap.get(fromWarehouseId);
            } else {
              // ✅ Jika tidak ada di cache, set minimal object dengan ID untuk fallback di UI
              fromWarehouse = { id: fromWarehouseId, name: null };
            }
          }
          
          let fromVendingMachine = null;
          // ✅ PERBAIKAN: Cek apakah from_vending_machine_id valid (bukan null, undefined, atau 0)
          const fromVendingMachineId = stockReturn.from_vending_machine_id;
          const isValidFromVendingMachineId = fromVendingMachineId != null && fromVendingMachineId > 0;
          
          if (stockReturn.from_vending_machine) {
            // ✅ Relationships ada di response API
            fromVendingMachine = stockReturn.from_vending_machine;
          } else if (isValidFromVendingMachineId) {
            // ✅ Coba dari cache
            if (vendingMachinesMap.has(fromVendingMachineId)) {
              fromVendingMachine = vendingMachinesMap.get(fromVendingMachineId);
            } else {
              // ✅ Jika tidak ada di cache, set minimal object dengan ID untuk fallback di UI
              fromVendingMachine = { id: fromVendingMachineId, name: null };
            }
          }
          
          const toWarehouse = stockReturn.to_warehouse || 
            (stockReturn.to_warehouse_id && warehousesMap.has(stockReturn.to_warehouse_id) 
              ? warehousesMap.get(stockReturn.to_warehouse_id) 
              : null);
          
          // ✅ DEBUG: Log warning jika relationships tidak ter-load (hanya di development)
          if (process.env.NODE_ENV === 'development') {
            if (!fromWarehouse && isValidFromWarehouseId) {
              console.warn(`⚠️ Stock Return #${stockReturn.id}: from_warehouse relationship not found in response. ID: ${fromWarehouseId}`);
            }
            if (!fromVendingMachine && isValidFromVendingMachineId) {
              console.warn(`⚠️ Stock Return #${stockReturn.id}: from_vending_machine relationship not found in response. ID: ${fromVendingMachineId}`);
            }
            // ✅ DEBUG: Log jika ID tidak valid
            if (!isValidFromWarehouseId && !isValidFromVendingMachineId && stockReturn.source_type) {
              console.warn(`⚠️ Stock Return #${stockReturn.id}: No valid from_warehouse_id or from_vending_machine_id found. source_type: ${stockReturn.source_type}`);
            }
          }
          
          // Ensure stock_return_products is an array and map products correctly
          const stockReturnProductsRaw = stockReturn.stock_return_products || [];
          
          // If stock_return_products is empty but we have total_quantity, log warning
          if (stockReturnProductsRaw.length === 0 && stockReturn.total_quantity > 0) {
            console.warn(`⚠️ Stock Return #${stockReturn.id} has total_quantity ${stockReturn.total_quantity} but no stock_return_products. Backend should include stock_return_products relationship.`);
          }
          
          const stockReturnProducts = stockReturnProductsRaw.map((srp: any) => {
            // Try to get product from relationship first, then from map
            let product = srp.product;
            
            // If product relationship not loaded, try to get from productsMap
            if (!product && srp.product_id && productsMap.has(srp.product_id)) {
              product = productsMap.get(srp.product_id);
            }
            
          // Ensure we have all required fields
          return {
            id: srp.id || 0,
            stock_return_id: srp.stock_return_id || stockReturn.id || 0,
            product_id: srp.product_id || 0,
            stock_in_id: srp.stock_in_id || 0, // Include stock_in_id for batch tracking
            quantity: srp.quantity || 0,
            expiry_date: srp.expiry_date,
            batch_number: srp.batch_number,
            notes: srp.notes,
            product: product || null, // Explicitly set to null if not found
          };
          });
          
          // ✅ PERBAIKAN: Pastikan source_type ter-set dengan benar
          // Cek kedua ID untuk menentukan source_type dengan lebih akurat
          let sourceType: "warehouse" | "vending_machine";
          if (stockReturn.source_type) {
            // ✅ Jika source_type sudah ada, gunakan langsung
            sourceType = stockReturn.source_type;
          } else {
            // ✅ Jika source_type tidak ada, tentukan berdasarkan ID yang valid
            const hasValidVendingMachineId = fromVendingMachineId != null && fromVendingMachineId > 0;
            const hasValidWarehouseId = fromWarehouseId != null && fromWarehouseId > 0;
            
            if (hasValidVendingMachineId) {
              sourceType = "vending_machine";
            } else if (hasValidWarehouseId) {
              sourceType = "warehouse";
            } else {
              // ✅ Fallback: jika tidak ada ID yang valid, default ke warehouse
              sourceType = "warehouse";
            }
          }
          
          // ✅ DEBUG: Log mapped data untuk verifikasi (hanya di development, untuk item pertama saja)
          if (process.env.NODE_ENV === 'development' && items.indexOf(stockReturn) === 0) {
            console.log("✅ Mapped Stock Return (First Item):", {
              id: stockReturn.id,
              code: stockReturn.code,
              source_type_from_api: stockReturn.source_type,
              determined_source_type: sourceType,
              from_warehouse: fromWarehouse,
              from_warehouse_id: stockReturn.from_warehouse_id,
              from_vending_machine: fromVendingMachine,
              from_vending_machine_id: stockReturn.from_vending_machine_id,
            });
            console.log("🔍 Source Type Determination Logic:", {
              hasValidVendingMachineId: fromVendingMachineId != null && fromVendingMachineId > 0,
              hasValidWarehouseId: fromWarehouseId != null && fromWarehouseId > 0,
              fromVendingMachineId,
              fromWarehouseId,
            });
          }
          
          return {
            id: stockReturn.id || 0,
            code: stockReturn.code,
            source_type: sourceType,
            // ✅ PERBAIKAN: Jangan set ke 0 jika tidak ada, biarkan null/undefined untuk UI logic
            from_warehouse_id: isValidFromWarehouseId ? fromWarehouseId : (stockReturn.from_warehouse_id ?? null),
            from_vending_machine_id: isValidFromVendingMachineId ? fromVendingMachineId : (stockReturn.from_vending_machine_id ?? null),
            to_warehouse_id: stockReturn.to_warehouse_id || 0,
            user_id: stockReturn.user_id,
            date: stockReturn.date || "",
            notes: stockReturn.notes,
            total_quantity: stockReturn.total_quantity,
            status: stockReturn.status,
            stock_return_products: stockReturnProducts,
            from_warehouse: fromWarehouse,
            from_vending_machine: fromVendingMachine,
            to_warehouse: toWarehouse,
            created_at: stockReturn.created_at,
            updated_at: stockReturn.updated_at,
          };
        });
        
        // ✅ Return data with pagination meta
        return {
          data: mappedData,
          meta: meta || {
            current_page: page,
            last_page: 1,
            total: mappedData.length,
            per_page: perPage,
            from: (page - 1) * perPage + 1,
            to: (page - 1) * perPage + mappedData.length,
          },
        };
      } catch (error) {
        console.error("Error fetching stock-returns:", error);
        return { data: [], meta: null };
      }
    },
  });
};

// Fetch Single Stock Return
export const useFetchStockReturn = (id: number, options?: Partial<UseQueryOptions<StockReturn, AxiosError>>) => {
  return useQuery<StockReturn, AxiosError>({
    queryKey: ["stock-return", id],
    queryFn: async () => {
      try {
        const response = await apiClient.get(`/stock-returns/${id}`);
        let data = response.data?.data || response.data;
        
        if (!data) {
          return null as any;
        }
        
        let productsMap: Map<number, any> = new Map();
        let warehousesMap: Map<number, any> = new Map();
        let vendingMachinesMap: Map<number, any> = new Map();
        
        try {
          const [productsRes, warehousesRes, vendingMachinesRes] = await Promise.all([
            apiClient.get("/products"),
            apiClient.get("/warehouses"),
            apiClient.get("/vending-machines"),
          ]);
          
          const productsData = productsRes.data?.data || productsRes.data;
          const warehousesData = warehousesRes.data?.data || warehousesRes.data;
          const vendingMachinesData = vendingMachinesRes.data?.data || vendingMachinesRes.data;
          
          if (Array.isArray(productsData)) {
            productsData.forEach((p: any) => {
              if (p && p.id) productsMap.set(p.id, p);
            });
        }
        
          if (Array.isArray(warehousesData)) {
            warehousesData.forEach((w: any) => {
              if (w && w.id) warehousesMap.set(w.id, { id: w.id, name: w.name });
            });
          }
          
          if (Array.isArray(vendingMachinesData)) {
            vendingMachinesData.forEach((vm: any) => {
              if (vm && vm.id) vendingMachinesMap.set(vm.id, { id: vm.id, name: vm.name, location: vm.location });
            });
          }
        } catch (error) {
          console.warn("Failed to fetch products/warehouses/vending-machines:", error);
        }
        
        const fromWarehouse = data.from_warehouse || 
          (data.from_warehouse_id && warehousesMap.has(data.from_warehouse_id) 
            ? warehousesMap.get(data.from_warehouse_id) 
            : null);
        
        const fromVendingMachine = data.from_vending_machine || 
          (data.from_vending_machine_id && vendingMachinesMap.has(data.from_vending_machine_id) 
            ? vendingMachinesMap.get(data.from_vending_machine_id) 
            : null);
        
        const toWarehouse = data.to_warehouse || 
          (data.to_warehouse_id && warehousesMap.has(data.to_warehouse_id) 
            ? warehousesMap.get(data.to_warehouse_id) 
            : null);
        
        const stockReturnProducts = (data.stock_return_products || []).map((srp: any) => {
          const product = srp.product || 
            (srp.product_id && productsMap.has(srp.product_id) 
              ? productsMap.get(srp.product_id) 
              : null);
          
          return {
            id: srp.id || 0,
            stock_return_id: srp.stock_return_id || data.id || 0,
            product_id: srp.product_id || 0,
            stock_in_id: srp.stock_in_id || 0, // Include stock_in_id for batch tracking
            quantity: srp.quantity || 0,
            expiry_date: srp.expiry_date,
            batch_number: srp.batch_number,
            notes: srp.notes,
            product,
          };
        });
        
        return {
          id: data.id || 0,
          code: data.code,
          source_type: data.source_type || (data.from_vending_machine_id ? "vending_machine" : "warehouse"),
          from_warehouse_id: data.from_warehouse_id || 0,
          from_vending_machine_id: data.from_vending_machine_id || 0,
          to_warehouse_id: data.to_warehouse_id || 0,
          user_id: data.user_id,
          date: data.date || "",
          notes: data.notes,
          total_quantity: data.total_quantity,
          status: data.status,
          stock_return_products: stockReturnProducts,
          from_warehouse: fromWarehouse,
          from_vending_machine: fromVendingMachine,
          to_warehouse: toWarehouse,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
      } catch (error) {
        console.error("Error fetching stock-return:", error);
        throw error;
      }
    },
    enabled: !!id,
    ...options,
  });
};

// Create Stock Return
export const useCreateStockReturn = () => {
  const queryClient = useQueryClient();

  return useMutation<StockReturn, AxiosError<ApiErrorResponse>, CreateStockReturnPayload>({
    mutationFn: async (payload) => {
      const response = await apiClient.post("/stock-returns", payload, {
        headers: { "Content-Type": "application/json" },
      });
      return response.data?.data || response.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate all stock-returns queries (including those with user_id)
      queryClient.invalidateQueries({ queryKey: ["stock-returns"], exact: false });
      // Invalidate all stock-balances queries (including those with warehouseId and user_id)
      queryClient.invalidateQueries({ queryKey: ["stock-balances"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["stock-balance"] });
      queryClient.invalidateQueries({ queryKey: ["expiry-alerts"] });
      // ✅ Invalidate summary queries untuk Overview page
      queryClient.invalidateQueries({ queryKey: ["stock-returns-summary"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["stock-balances-summary"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["alerts-summary"], exact: false });
      // Force refetch all stock-returns queries to ensure fresh data
      queryClient.refetchQueries({ queryKey: ["stock-returns"], exact: false });
      // Force refetch all stock-balances queries to ensure fresh data
      queryClient.refetchQueries({ queryKey: ["stock-balances"], exact: false });
      queryClient.refetchQueries({ queryKey: ["stock-balance"] });
      // ✅ Force refetch summary queries untuk Overview page (auto sync)
      queryClient.refetchQueries({ queryKey: ["stock-returns-summary"], exact: false });
      queryClient.refetchQueries({ queryKey: ["stock-balances-summary"], exact: false });
      queryClient.refetchQueries({ queryKey: ["alerts-summary"], exact: false });
      
      // ✅ CRITICAL: Force refetch vending machine stocks if source is vending machine
      // Backend sudah update quantity di tabel vending_machine_stocks saat stock return dibuat
      // Perlu refetch untuk memastikan data ter-update langsung di UI
      if (variables.source_type === "vending_machine" && variables.from_vending_machine_id) {
        queryClient.invalidateQueries({ 
          queryKey: ["vending-machine-stocks", variables.from_vending_machine_id] 
        });
        queryClient.invalidateQueries({ 
          queryKey: ["vending-machine-stocks"] 
        });
        // ✅ Force refetch untuk memastikan data ter-update langsung
        queryClient.refetchQueries({ 
          queryKey: ["vending-machine-stocks", variables.from_vending_machine_id] 
        });
        queryClient.refetchQueries({ 
          queryKey: ["vending-machine-stocks"] 
        });
      }
    },
  });
};

// Update Stock Return
export const useUpdateStockReturn = () => {
  const queryClient = useQueryClient();

  return useMutation<StockReturn, AxiosError<ApiErrorResponse>, UpdateStockReturnPayload>({
    mutationFn: async ({ id, ...payload }) => {
      const response = await apiClient.put(`/stock-returns/${id}`, payload, {
        headers: { "Content-Type": "application/json" },
      });
      return response.data?.data || response.data;
    },
    onSuccess: (_, variables) => {
      const { id, source_type, from_vending_machine_id } = variables;
      // Invalidate all stock-returns queries (including those with user_id)
      queryClient.invalidateQueries({ queryKey: ["stock-returns"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["stock-return", id] });
      // Invalidate all stock-balances queries (including those with warehouseId and user_id)
      queryClient.invalidateQueries({ queryKey: ["stock-balances"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["stock-balance"] });
      queryClient.invalidateQueries({ queryKey: ["expiry-alerts"] });
      // ✅ Invalidate summary queries untuk Overview page
      queryClient.invalidateQueries({ queryKey: ["stock-returns-summary"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["stock-balances-summary"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["alerts-summary"], exact: false });
      // Force refetch all stock-returns queries to ensure fresh data
      queryClient.refetchQueries({ queryKey: ["stock-returns"], exact: false });
      // Force refetch all stock-balances queries to ensure fresh data
      queryClient.refetchQueries({ queryKey: ["stock-balances"], exact: false });
      queryClient.refetchQueries({ queryKey: ["stock-balance"] });
      // ✅ Force refetch summary queries untuk Overview page (auto sync)
      queryClient.refetchQueries({ queryKey: ["stock-returns-summary"], exact: false });
      queryClient.refetchQueries({ queryKey: ["stock-balances-summary"], exact: false });
      queryClient.refetchQueries({ queryKey: ["alerts-summary"], exact: false });
      
      // ✅ CRITICAL: Force refetch vending machine stocks if source is vending machine
      // Backend sudah diperbaiki: menggunakan ID yang sama untuk return dan reduce
      // Backend lebih cepat dan akurat karena langsung menggunakan vending_machine_stock_id
      // Gunakan retry mechanism dengan delay lebih pendek karena backend sudah lebih efisien
      if (source_type === "vending_machine" && from_vending_machine_id) {
        queryClient.invalidateQueries({ 
          queryKey: ["vending-machine-stocks", from_vending_machine_id] 
        });
        queryClient.invalidateQueries({ 
          queryKey: ["vending-machine-stocks"] 
        });
        
        // ✅ Retry mechanism: refetch beberapa kali dengan delay bertahap yang lebih pendek
        // Delay bertahap: 500ms (initial), 800ms (retry 1)
        // Backend sudah lebih cepat karena langsung menggunakan ID yang sama (tanpa query kompleks)
        const refetchWithRetry = async (retryCount = 0, maxRetries = 2) => {
          // Delay lebih pendek: 500ms, 800ms (backend sudah lebih cepat)
          const delay = 500 + (retryCount * 300); // 500ms, 800ms
          await new Promise(resolve => setTimeout(resolve, delay));
          
          try {
            // Refetch dengan await untuk memastikan selesai sebelum retry berikutnya
            await queryClient.refetchQueries({ 
              queryKey: ["vending-machine-stocks", from_vending_machine_id] 
            });
            await queryClient.refetchQueries({ 
              queryKey: ["vending-machine-stocks"] 
            });
            
            // Jika masih ada retry tersisa, lakukan retry berikutnya
            if (retryCount < maxRetries - 1) {
              refetchWithRetry(retryCount + 1, maxRetries);
            }
          } catch (error) {
            console.warn(`[useUpdateStockReturn] Refetch attempt ${retryCount + 1} failed:`, error);
            // Retry jika masih ada attempt tersisa
            if (retryCount < maxRetries - 1) {
              refetchWithRetry(retryCount + 1, maxRetries);
            }
          }
        };
        
        // Mulai retry mechanism (non-blocking)
        refetchWithRetry();
      }
    },
  });
};

// Delete Stock Return
export const useDeleteStockReturn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/stock-returns/${id}`);
    },
    onSuccess: () => {
      // ✅ Hanya invalidate, React Query akan otomatis refetch queries yang aktif di background
      queryClient.invalidateQueries({ queryKey: ["stock-returns"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["stock-balances"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["expiry-alerts"] });
      // ✅ Invalidate vending machine stocks (jika stock return dihapus, backend mungkin mengembalikan quantity)
      queryClient.invalidateQueries({ queryKey: ["vending-machine-stocks"], exact: false });
      // ✅ Invalidate summary queries untuk Overview page
      queryClient.invalidateQueries({ queryKey: ["stock-returns-summary"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["stock-balances-summary"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["alerts-summary"], exact: false });
      // ✅ Force refetch summary queries untuk Overview page (auto sync)
      queryClient.refetchQueries({ queryKey: ["stock-returns-summary"], exact: false });
      queryClient.refetchQueries({ queryKey: ["stock-balances-summary"], exact: false });
      queryClient.refetchQueries({ queryKey: ["alerts-summary"], exact: false });
      // ✅ Force refetch vending machine stocks untuk memastikan data ter-update
      queryClient.refetchQueries({ queryKey: ["vending-machine-stocks"], exact: false });
    },
  });
};

// ==================== STOCK TRANSFER ====================

// Fetch All Stock Transfers with Server-Side Pagination
export const useFetchStockTransfers = (page: number = 1, perPage: number = 10, search?: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useQuery<{ data: StockTransfer[]; meta: any }, AxiosError>({
    queryKey: ["stock-transfers", user?.id, page, perPage, search],
    staleTime: 60 * 1000, // ✅ 60 seconds - transactional data (Stock Returns)
    gcTime: 10 * 60 * 1000, // ✅ 10 menit - data tetap di cache
    refetchOnWindowFocus: false, // ✅ Jangan refetch saat window focus
    refetchOnMount: true, // ✅ Refetch saat component mount untuk memastikan data terbaru muncul (sinkronisasi otomatis)
    queryFn: async () => {
      try {
        const params: any = {};
        
        // Jika bukan manager, filter berdasarkan user_id (generic untuk semua PIC)
        if (user && !isManager(user.roles)) {
          params.user_id = user.id;
          console.log("📋 Fetching Stock Transfers for user_id:", user.id, "(Non-Manager)");
        } else {
          console.log("📋 Fetching ALL Stock Transfers (Manager)");
        }
        
        // ✅ Server-side pagination: maksimal 100 per page sesuai backend limit
        params.per_page = Math.min(perPage, 100); // Maksimal 100 sesuai backend
        params.page = page;
        
        // ✅ Add search parameter if provided
        if (search && search.trim()) {
          params.search = search.trim();
        }
        
        // ✅ Include relationships if API supports it
        const withParam = "stock_transfer_products.product,from_warehouse,to_vending_machine";
        params.with = withParam;
        
        let response;
        let responseData;
        
        try {
          response = await apiClient.get("/stock-transfers", { params });
          responseData = response.data;
        } catch (error: any) {
          // ✅ Fallback: jika backend tidak support pagination (500 error), coba tanpa parameter
          if (error.response?.status === 500) {
            console.warn("⚠️ Backend mungkin tidak support pagination, trying fallback without pagination params...");
            try {
              const fallbackParams: any = {};
              if (user && !isManager(user.roles)) {
                fallbackParams.user_id = user.id;
              }
              // Coba tanpa per_page dan page
              response = await apiClient.get("/stock-transfers", { params: fallbackParams });
              responseData = response.data;
            } catch (fallbackError) {
              console.error("Fallback also failed:", fallbackError);
              throw fallbackError;
            }
          } else {
            throw error;
          }
        }
        
        // ✅ Handle paginated response from backend
        let items: any[] = [];
        let meta: any = null;
        
        if (responseData) {
          // ✅ PRIORITAS 1: Format baru dari backend - { data: [...], meta: { ... } }
          if (responseData.data && Array.isArray(responseData.data) && responseData.meta) {
            items = responseData.data;
            meta = {
              current_page: responseData.meta.current_page || page,
              last_page: responseData.meta.last_page || 1,
              total: responseData.meta.total || 0,
              per_page: responseData.meta.per_page || perPage,
              from: responseData.meta.from || 0,
              to: responseData.meta.to || 0,
              optimal_per_page: responseData.meta.optimal_per_page, // ✅ Baru: optimal per_page dari backend
              max_per_page: responseData.meta.max_per_page, // ✅ Baru: max per_page dari backend
            };
            console.log("📄 Stock Transfers - Server-side pagination (new format). Page:", meta.current_page, "Total:", meta.total, "Items:", items.length, "Optimal per_page:", meta.optimal_per_page);
          }
          // ✅ PRIORITAS 2: Format lama (fallback) - { data: { data: [...], current_page, ... } }
          else if (responseData.data && responseData.data.data && Array.isArray(responseData.data.data) && typeof responseData.data.current_page === 'number') {
            items = responseData.data.data;
            meta = {
              current_page: responseData.data.current_page,
              last_page: responseData.data.last_page,
              total: responseData.data.total,
              per_page: responseData.data.per_page,
              from: responseData.data.from,
              to: responseData.data.to,
            };
            console.log("📄 Stock Transfers - Server-side pagination (old format). Page:", meta.current_page, "Total:", meta.total, "Items:", items.length);
          }
          // ✅ PRIORITAS 3: Format tanpa pagination - { data: [...] }
          else if (Array.isArray(responseData.data)) {
            items = responseData.data;
            meta = {
              current_page: 1,
              last_page: 1,
              total: items.length,
              per_page: items.length,
              from: 1,
              to: items.length,
            };
          }
          // ✅ PRIORITAS 4: Direct array response (fallback)
          else if (Array.isArray(responseData)) {
            items = responseData;
            meta = {
              current_page: 1,
              last_page: 1,
              total: items.length,
              per_page: items.length,
              from: 1,
              to: items.length,
            };
          }
        }
        
        if (!Array.isArray(items)) {
          console.warn("⚠️ Stock Transfers data is not an array:", items);
          return { data: [], meta: meta || {} };
        }
        
        console.log("✅ Fetched Stock Transfers - Page:", page, "Items:", items.length, "Total:", meta?.total || items.length);
        
        // ✅ Use React Query cache for products
        let productsMap: Map<number, any> = new Map();
        
        try {
          const cachedProducts = queryClient.getQueryData<any[]>(["products"]);
          if (cachedProducts && Array.isArray(cachedProducts)) {
            cachedProducts.forEach((p: any) => {
              if (p && p.id) productsMap.set(p.id, p);
            });
          }
          
          // REMOVED: Aggressive fetching of all products.
          // We rely on backend eager loading for list views.
          
        } catch (error) {
          console.warn("Failed to fetch products for stock transfers:", error);
        }
        
        // ✅ Map and transform data
        const mappedData = items.map((transfer: any) => {
          // ✅ Map stock_transfer_products with product data
          const stockTransferProducts = (transfer.stock_transfer_products || []).map((stp: any) => {
            const product = stp.product || 
              (stp.product_id && productsMap.has(stp.product_id) 
                ? productsMap.get(stp.product_id) 
                : null);
            
            return {
              ...stp,
              product,
            };
          });
          
          return {
          id: transfer.id || 0,
          code: transfer.code,
          from_warehouse_id: transfer.from_warehouse_id || 0,
          to_vending_machine_id: transfer.to_vending_machine_id || 0,
          user_id: transfer.user_id,
          date: transfer.date || "",
          reference: transfer.reference,
          notes: transfer.notes,
          total_quantity: transfer.total_quantity,
          status: transfer.status,
            stock_transfer_products: stockTransferProducts,
          from_warehouse: transfer.from_warehouse,
          to_vending_machine: transfer.to_vending_machine,
          created_at: transfer.created_at,
          updated_at: transfer.updated_at,
          };
        });
        
        // ✅ Return data with pagination meta
        return {
          data: mappedData,
          meta: meta || {
            current_page: page,
            last_page: 1,
            total: mappedData.length,
            per_page: perPage,
            from: (page - 1) * perPage + 1,
            to: (page - 1) * perPage + mappedData.length,
          },
        };
      } catch (error) {
        console.error("Error fetching stock-transfers:", error);
        return { data: [], meta: null };
      }
    },
  });
};

// Fetch Single Stock Transfer
export const useFetchStockTransfer = (id: number, options?: Partial<UseQueryOptions<StockTransfer, AxiosError>>) => {
  return useQuery<StockTransfer, AxiosError>({
    queryKey: ["stock-transfer", id],
    queryFn: async () => {
      try {
      const response = await apiClient.get(`/stock-transfers/${id}`);
        let data = response.data?.data || response.data;
        
        if (!data) {
          return null as any;
        }
        
        // Check if stock_transfer_products is empty - try to fetch separately if needed
        let stockTransferProducts = data.stock_transfer_products || [];
        
        // If stock_transfer_products is empty but total_quantity > 0, try to fetch separately
        if (stockTransferProducts.length === 0 && data.total_quantity > 0) {
          console.warn("⚠️ stock_transfer_products is empty but total_quantity > 0. Trying to fetch separately...");
          try {
            // Try to fetch stock_transfer_products from a separate endpoint if available
            // This is a fallback - backend should ideally include stock_transfer_products in the main response
            const stockTransferProductsRes = await apiClient.get(`/stock-transfers/${id}/products`);
            const stockTransferProductsData = stockTransferProductsRes.data?.data || stockTransferProductsRes.data;
            if (Array.isArray(stockTransferProductsData) && stockTransferProductsData.length > 0) {
              stockTransferProducts = stockTransferProductsData;
              console.log("✅ Successfully fetched stock_transfer_products separately:", stockTransferProducts.length);
            }
          } catch (error) {
            console.warn("⚠️ Could not fetch stock_transfer_products separately. Backend needs to include stock_transfer_products in the main response.", error);
          }
        }
        
        return {
          ...data,
          stock_transfer_products: stockTransferProducts,
        };
      } catch (error) {
        console.error("Error fetching stock-transfer:", error);
        throw error;
      }
    },
    enabled: !!id,
    ...options,
  });
};

// Create Stock Transfer (with FEFO/FIFO logic handled by backend)
export const useCreateStockTransfer = () => {
  const queryClient = useQueryClient();

  return useMutation<StockTransfer, AxiosError<ApiErrorResponse>, CreateStockTransferPayload>({
    mutationFn: async (payload) => {
      const response = await apiClient.post("/stock-transfers", payload, {
        headers: { "Content-Type": "application/json" },
      });
      return response.data?.data || response.data;
    },
    onSuccess: async () => {
      // ✅ Invalidate queries terlebih dahulu
      queryClient.invalidateQueries({ queryKey: ["stock-transfers"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["stock-ins"], exact: false }); // ✅ CRITICAL: Stock balance depends on stock-ins
      queryClient.invalidateQueries({ queryKey: ["stock-balances"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["stock-balance"] });
      queryClient.invalidateQueries({ queryKey: ["expiry-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["vending-machine-stocks"] });
      // ✅ Invalidate summary queries untuk Overview page
      queryClient.invalidateQueries({ queryKey: ["stock-transfers-summary"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["stock-balances-summary"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["alerts-summary"], exact: false });
      
      // ✅ Refetch stock-transfers untuk memastikan data ter-update sebelum navigate
      // Non-blocking: tidak await agar tidak delay notifikasi, tapi tetap refetch di background
      queryClient.refetchQueries({ queryKey: ["stock-transfers"], exact: false });
      // ✅ Force refetch summary queries untuk Overview page (auto sync)
      queryClient.refetchQueries({ queryKey: ["stock-transfers-summary"], exact: false });
      queryClient.refetchQueries({ queryKey: ["stock-balances-summary"], exact: false });
      queryClient.refetchQueries({ queryKey: ["alerts-summary"], exact: false });
    },
  });
};

// Update Stock Transfer
export const useUpdateStockTransfer = () => {
  const queryClient = useQueryClient();

  return useMutation<StockTransfer, AxiosError<ApiErrorResponse>, UpdateStockTransferPayload>({
    mutationFn: async ({ id, ...payload }) => {
      console.log("📤 Sending PUT request to /stock-transfers/" + id);
      console.log("📤 Payload being sent:", JSON.stringify(payload, null, 2));
      console.log("📤 Status in payload:", payload.status);
      
      const response = await apiClient.put(`/stock-transfers/${id}`, payload, {
        headers: { "Content-Type": "application/json" },
      });
      
      console.log("✅ Response received:", response.data);
      console.log("✅ Status in response:", response.data?.data?.status || response.data?.status);
      
      return response.data?.data || response.data;
    },
    onSuccess: async (response, { id }) => {
      console.log("🔄 Stock Transfer updated, invalidating and refetching queries...");
      console.log("🔄 Updated stock transfer response:", response);
      console.log("🔄 Status in updated response:", response?.status);
      
      // Invalidate all related queries first - including stock-ins because stock balance depends on it
      await Promise.all([
        // Invalidate all stock-transfers queries (including those with user_id)
        queryClient.invalidateQueries({ queryKey: ["stock-transfers"], exact: false }),
        queryClient.invalidateQueries({ queryKey: ["stock-transfer", id] }), // CRITICAL: Invalidate the specific transfer
        queryClient.invalidateQueries({ queryKey: ["stock-ins"], exact: false }), // ✅ CRITICAL: Stock balance depends on stock-ins
        // Invalidate all stock-balances queries (including those with warehouseId and user_id)
        queryClient.invalidateQueries({ queryKey: ["stock-balances"], exact: false }),
        queryClient.invalidateQueries({ queryKey: ["stock-balance"] }), // Also invalidate singular for product-specific queries
        queryClient.invalidateQueries({ queryKey: ["expiry-alerts"] }),
        queryClient.invalidateQueries({ queryKey: ["vending-machine-stocks"] }),
        // ✅ Invalidate summary queries untuk Overview page
        queryClient.invalidateQueries({ queryKey: ["stock-transfers-summary"], exact: false }),
        queryClient.invalidateQueries({ queryKey: ["stock-balances-summary"], exact: false }),
        queryClient.invalidateQueries({ queryKey: ["alerts-summary"], exact: false }),
      ]);
      
      // Wait a bit for backend to process the update and recalculate quantity_remaining
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Force refetch to ensure fresh data after update
      console.log("🔄 Refetching stock transfer and related data...");
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["stock-transfers"], exact: false }),
        queryClient.refetchQueries({ queryKey: ["stock-transfer", id] }), // CRITICAL: Refetch the specific transfer
        queryClient.refetchQueries({ queryKey: ["stock-ins"], exact: false }),
        queryClient.refetchQueries({ queryKey: ["stock-balances"], exact: false }),
        queryClient.refetchQueries({ queryKey: ["stock-balance"] }),
        // ✅ Force refetch summary queries untuk Overview page (auto sync)
        queryClient.refetchQueries({ queryKey: ["stock-transfers-summary"], exact: false }),
        queryClient.refetchQueries({ queryKey: ["stock-balances-summary"], exact: false }),
        queryClient.refetchQueries({ queryKey: ["alerts-summary"], exact: false }),
      ]);
      
      console.log("✅ Stock transfer and related data refetched after update");
    },
  });
};

// Delete Stock Transfer
export const useDeleteStockTransfer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/stock-transfers/${id}`);
    },
    onSuccess: () => {
      // ✅ Hanya invalidate, React Query akan otomatis refetch queries yang aktif di background
      // Backend sudah siap setelah response delete, tidak perlu delay buatan
      queryClient.invalidateQueries({ queryKey: ["stock-transfers"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["stock-ins"], exact: false }); // ✅ CRITICAL: Stock balance depends on stock-ins
      queryClient.invalidateQueries({ queryKey: ["stock-balances"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["stock-balance"] });
      queryClient.invalidateQueries({ queryKey: ["expiry-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["vending-machine-stocks"], exact: false });
      
      // ✅ CRITICAL: Force refetch vending-machine-stocks untuk sinkronisasi langsung
      // Tanpa ini, data vending machine stock tidak akan ter-update setelah stock transfer dihapus
      queryClient.refetchQueries({ queryKey: ["vending-machine-stocks"], exact: false });
      
      // ✅ Invalidate summary queries untuk Overview page
      queryClient.invalidateQueries({ queryKey: ["stock-transfers-summary"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["stock-balances-summary"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["alerts-summary"], exact: false });
      // ✅ Force refetch summary queries untuk Overview page (auto sync)
      queryClient.refetchQueries({ queryKey: ["stock-transfers-summary"], exact: false });
      queryClient.refetchQueries({ queryKey: ["stock-balances-summary"], exact: false });
      queryClient.refetchQueries({ queryKey: ["alerts-summary"], exact: false });
    },
  });
};

// Remove Single Product from Stock Transfer
export const useRemoveStockTransferProduct = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; message?: string },
    AxiosError<ApiErrorResponse>,
    { transferId: number; productId: number }
  >({
    mutationFn: async ({ transferId, productId }) => {
      // Try endpoint: DELETE /api/stock-transfers/{transferId}/products/{productId}
      // If not available, backend should provide alternative endpoint
      const response = await apiClient.delete(
        `/stock-transfers/${transferId}/products/${productId}`
      );
      return response.data?.data || response.data || { success: true };
    },
    onSuccess: async (_, { transferId }) => {
      console.log("🔄 Product removed from stock transfer, invalidating queries...");
      
      // Invalidate all related queries
      await Promise.all([
        // Invalidate all stock-transfers queries (including those with user_id)
        queryClient.invalidateQueries({ queryKey: ["stock-transfers"], exact: false }),
        queryClient.invalidateQueries({ queryKey: ["stock-transfer", transferId] }),
        queryClient.invalidateQueries({ queryKey: ["stock-ins"], exact: false }),
        // Invalidate all stock-balances queries (including those with warehouseId and user_id)
        queryClient.invalidateQueries({ queryKey: ["stock-balances"], exact: false }),
        queryClient.invalidateQueries({ queryKey: ["stock-balance"] }),
        queryClient.invalidateQueries({ queryKey: ["expiry-alerts"] }),
        queryClient.invalidateQueries({ queryKey: ["vending-machine-stocks"] }),
        // ✅ Invalidate summary queries untuk Overview page
        queryClient.invalidateQueries({ queryKey: ["stock-transfers-summary"], exact: false }),
        queryClient.invalidateQueries({ queryKey: ["stock-balances-summary"], exact: false }),
        queryClient.invalidateQueries({ queryKey: ["alerts-summary"], exact: false }),
      ]);
      
      // Wait for backend to process and update stock balances
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Force refetch stock balances to ensure fresh data
      console.log("🔄 Refetching stock balances after product removal...");
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["stock-transfers"], exact: false }),
        queryClient.refetchQueries({ queryKey: ["stock-balances"], exact: false }),
        queryClient.refetchQueries({ queryKey: ["stock-balance"] }),
        // ✅ Force refetch summary queries untuk Overview page (auto sync)
        queryClient.refetchQueries({ queryKey: ["stock-transfers-summary"], exact: false }),
        queryClient.refetchQueries({ queryKey: ["stock-balances-summary"], exact: false }),
        queryClient.refetchQueries({ queryKey: ["alerts-summary"], exact: false }),
      ]);
      
      console.log("✅ Stock balances refetched after product removal");
    },
  });
};

// Remove Single Product from Stock Return
export const useRemoveStockReturnProduct = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; message?: string },
    AxiosError<ApiErrorResponse>,
    { returnId: number; productId: number }
  >({
    mutationFn: async ({ returnId, productId }) => {
      const response = await apiClient.delete(
        `/stock-returns/${returnId}/products/${productId}`
      );
      return response.data?.data || response.data || { success: true };
    },
    onSuccess: async (_, { returnId }) => {
      console.log("🔄 Product removed from stock return, invalidating queries...");
      
      // Invalidate all related queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["stock-returns"], exact: false }),
        queryClient.invalidateQueries({ queryKey: ["stock-return", returnId] }),
        queryClient.invalidateQueries({ queryKey: ["stock-balances"], exact: false }),
        queryClient.invalidateQueries({ queryKey: ["stock-balance"] }),
        queryClient.invalidateQueries({ queryKey: ["expiry-alerts"] }),
        queryClient.invalidateQueries({ queryKey: ["vending-machine-stocks"], exact: false }),
        queryClient.invalidateQueries({ queryKey: ["stock-returns-summary"], exact: false }),
        queryClient.invalidateQueries({ queryKey: ["stock-balances-summary"], exact: false }),
        queryClient.invalidateQueries({ queryKey: ["alerts-summary"], exact: false }),
      ]);
      
      // Wait for backend to process and update stock balances
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Force refetch to ensure fresh data
      console.log("🔄 Refetching after product removal...");
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["stock-returns"], exact: false }),
        queryClient.refetchQueries({ queryKey: ["stock-balances"], exact: false }),
        queryClient.refetchQueries({ queryKey: ["stock-balance"] }),
        queryClient.refetchQueries({ queryKey: ["vending-machine-stocks"], exact: false }),
        queryClient.refetchQueries({ queryKey: ["stock-returns-summary"], exact: false }),
        queryClient.refetchQueries({ queryKey: ["stock-balances-summary"], exact: false }),
        queryClient.refetchQueries({ queryKey: ["alerts-summary"], exact: false }),
      ]);
      
      console.log("✅ Queries refetched after product removal");
    },
  });
};

// ==================== STOCK BALANCE ====================

// Fetch Stock Balances (with FEFO/FIFO sorting)
export const useFetchStockBalances = (warehouseId?: number, options?: { enableAutoSync?: boolean; enabled?: boolean }) => {
  const { user } = useAuth();
  const enableAutoSync = options?.enableAutoSync !== false; // Default true
  const enabled = options?.enabled !== false; // Default true (support conditional loading)
  
  return useQuery<StockBalance[], AxiosError>({
    queryKey: ["stock-balances", warehouseId, user?.id], // Include user_id untuk cache per user
    staleTime: 60 * 1000, // ✅ 60 seconds - single stock in detail
    gcTime: 10 * 60 * 1000, // ✅ Keep in cache for 10 minutes
    refetchInterval: enableAutoSync ? 2000 : false, // ✅ Auto-refresh every 2 seconds for real-time sync
    refetchIntervalInBackground: true, // ✅ Continue refetching even when tab is in background
    placeholderData: (previousData) => previousData, // ✅ Show previous data while fetching new data (no loading state)
    enabled: enabled && !!user, // ✅ Support conditional loading
    queryFn: async () => {
      try {
        const params: any = {};
        
        if (warehouseId) {
          params.warehouse_id = warehouseId;
        }
        
        // Jika bukan manager, filter berdasarkan user_id (generic untuk semua PIC)
        if (user && !isManager(user.roles)) {
          params.user_id = user.id;
        }
        
        // Build URL with params
        const queryString = new URLSearchParams(
          Object.entries(params).reduce((acc, [key, value]) => {
            if (value !== undefined && value !== null) {
              acc[key] = value.toString();
            }
            return acc;
          }, {} as Record<string, string>)
        ).toString();
        
        const url = queryString 
          ? `/stock-balances?${queryString}`
          : "/stock-balances";
        const response = await apiClient.get(url);
        let data = response.data;
        
        if (data && data.data && Array.isArray(data.data)) {
          data = data.data;
        }
        
        if (!Array.isArray(data)) {
          return [];
        }
        
        // Fetch products and warehouses for mapping
        let productsMap: Map<number, any> = new Map();
        let warehousesMap: Map<number, any> = new Map();
        
        try {
          const [productsRes, warehousesRes] = await Promise.all([
            apiClient.get("/products"),
            apiClient.get("/warehouses"),
          ]);
          
          const productsData = productsRes.data?.data || productsRes.data;
          const warehousesData = warehousesRes.data?.data || warehousesRes.data;
          
          if (Array.isArray(productsData)) {
            productsData.forEach((p: any) => {
              if (p && p.id) productsMap.set(p.id, p);
            });
          }
          
          if (Array.isArray(warehousesData)) {
            warehousesData.forEach((w: any) => {
              if (w && w.id) warehousesMap.set(w.id, { id: w.id, name: w.name });
            });
          }
      } catch (error) {
          console.warn("Failed to fetch products/warehouses:", error);
        }
        
        const normalized = data
          .filter((b: any) => (b.quantity_remaining || 0) > 0) // Only available stock
          .map((balance: any) => {
            const product = balance.product || 
              (balance.product_id && productsMap.has(balance.product_id) 
                ? productsMap.get(balance.product_id) 
                : null);
            
            const warehouse = balance.warehouse || 
              (balance.warehouse_id && warehousesMap.has(balance.warehouse_id) 
                ? warehousesMap.get(balance.warehouse_id) 
                : null);
            
            return {
              id: balance.id || 0,
              warehouse_id: balance.warehouse_id || 0,
              product_id: balance.product_id || 0,
              stock_in_id: balance.stock_in_id || 0,
              quantity_remaining: balance.quantity_remaining || 0,
              date_in: balance.date_in || balance.date || "",
              expiry_date: balance.expiry_date,
              batch_number: balance.batch_number,
              product,
              warehouse,
              stock_in: balance.stock_in,
              stock_return: balance.stock_return, // ✅ Include stock_return for batch code
              created_at: balance.created_at,
              updated_at: balance.updated_at,
            };
          });
        
        // Sort by FEFO: expiry_date first (ascending), then date_in (ascending)
        return normalized.sort((a, b) => {
          // If both have expiry_date, sort by expiry_date
          if (a.expiry_date && b.expiry_date) {
            const expiryA = new Date(a.expiry_date).getTime();
            const expiryB = new Date(b.expiry_date).getTime();
            if (expiryA !== expiryB) return expiryA - expiryB;
          }
          // If only one has expiry_date, prioritize it
          if (a.expiry_date && !b.expiry_date) return -1;
          if (!a.expiry_date && b.expiry_date) return 1;
          // If both don't have expiry_date or same expiry, sort by date_in (FIFO)
          const dateA = new Date(a.date_in).getTime();
          const dateB = new Date(b.date_in).getTime();
            return dateA - dateB;
          });
      } catch (error) {
        console.error("Error fetching stock-balances:", error);
        return [];
      }
    },
  });
};

// ✅ NEW: Fetch Stock Balances WITH Product Prices (optimized for Stock Balance page)
// This hook returns both stock balances AND product_prices from backend
// Eliminates need for separate useFetchAllStockIns call
export const useFetchStockBalancesWithPrices = (warehouseId?: number, options?: { enableAutoSync?: boolean; enabled?: boolean }) => {
  const { user } = useAuth();
  const enableAutoSync = options?.enableAutoSync !== false;
  const enabled = options?.enabled !== false;
  
  return useQuery<{ data: StockBalance[]; productPrices: Record<number, number> }, AxiosError>({
    queryKey: ["stock-balances-with-prices", warehouseId, user?.id],
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: enableAutoSync ? 2000 : false,
    refetchIntervalInBackground: true,
    placeholderData: (previousData) => previousData,
    enabled: enabled && !!user,
    queryFn: async () => {
      try {
        const params: any = { per_page: 1000 }; // Fetch all data
        
        if (warehouseId) {
          params.warehouse_id = warehouseId;
        }
        
        if (user && !isManager(user.roles)) {
          params.user_id = user.id;
        }
        
        const queryString = new URLSearchParams(
          Object.entries(params).reduce((acc, [key, value]) => {
            if (value !== undefined && value !== null) {
              acc[key] = value.toString();
            }
            return acc;
          }, {} as Record<string, string>)
        ).toString();
        
        const url = `/stock-balances?${queryString}`;
        console.log("📦 Fetching stock balances from:", url);
        
        const response = await apiClient.get(url);
        const responseData = response.data;
        
        console.log("📦 Raw response:", responseData);
        
        // Extract stock balances data - match original hook's extraction pattern
        let data = responseData;
        if (data && data.data && Array.isArray(data.data)) {
          data = data.data;
        }
        if (!Array.isArray(data)) {
          console.warn("📦 Data is not array:", data);
          data = [];
        }
        
        console.log("📦 Extracted data length:", data.length);
        
        // ✅ Extract product_prices from backend response
        const productPrices: Record<number, number> = responseData?.product_prices || {};
        console.log("📦 Product prices:", productPrices);
        
        const normalized = data
          .filter((b: any) => (b.quantity_remaining || 0) > 0)
          .map((balance: any) => ({
            id: balance.id || 0,
            warehouse_id: balance.warehouse_id || 0,
            product_id: balance.product_id || 0,
            stock_in_id: balance.stock_in_id || 0,
            stock_return_id: balance.stock_return_id || 0,
            quantity_remaining: balance.quantity_remaining || 0,
            date_in: balance.date_in || balance.date || "",
            expiry_date: balance.expiry_date,
            batch_number: balance.batch_number,
            product: balance.product,
            warehouse: balance.warehouse,
            stock_in: balance.stock_in,
            stock_return: balance.stock_return, // ✅ Include stock_return for batch code
            created_at: balance.created_at,
            updated_at: balance.updated_at,
          }));
        
        console.log("📦 Normalized data length:", normalized.length);
        
        // Sort by FEFO/FIFO
        const sorted = normalized.sort((a: StockBalance, b: StockBalance) => {
          if (a.expiry_date && b.expiry_date) {
            const expiryA = new Date(a.expiry_date).getTime();
            const expiryB = new Date(b.expiry_date).getTime();
            if (expiryA !== expiryB) return expiryA - expiryB;
          }
          if (a.expiry_date && !b.expiry_date) return -1;
          if (!a.expiry_date && b.expiry_date) return 1;
          const dateA = new Date(a.date_in).getTime();
          const dateB = new Date(b.date_in).getTime();
          return dateA - dateB;
        });
        
        console.log("📦 Final sorted data length:", sorted.length);
        
        return { data: sorted, productPrices };
      } catch (error) {
        console.error("Error fetching stock-balances-with-prices:", error);
        return { data: [], productPrices: {} };
      }
    },
  });
};

// Fetch Stock Balance for a specific product (for FEFO/FIFO selection in transfer)
export const useFetchProductStockBalance = (
  productId: number,
  warehouseId?: number,
  options?: Partial<UseQueryOptions<StockBalance[], AxiosError>>
) => {
  return useQuery<StockBalance[], AxiosError>({
    queryKey: ["stock-balance", productId, warehouseId],
    staleTime: 60 * 1000, // ✅ 60 seconds - single stock transfer detail
    gcTime: 0, // ✅ Don't cache to ensure fresh data
    queryFn: async () => {
      try {
        // Ensure productId is valid
        if (!productId || productId <= 0) {
          console.warn("⚠️ Invalid productId for stock balance fetch:", productId);
          return [];
        }

        let url = `/stock-balances?product_id=${productId}`;
        if (warehouseId && warehouseId > 0) {
          url += `&warehouse_id=${warehouseId}`;
        }
        
        const response = await apiClient.get(url);
        
        let data = response.data;
        
        if (data && data.data && Array.isArray(data.data)) {
          data = data.data;
        }
        
        if (!Array.isArray(data)) {
          return [];
        }
        
        // Filter by product_id to ensure only the selected product's stock is shown
        // Don't filter by quantity_remaining > 0 here, let the UI handle that
        // This ensures we can show "Stock not available" message when needed
        const productBalances = data.filter((b: any) => {
          const matchesProduct = (b.product_id || 0) === productId;
          const matchesWarehouse = !warehouseId || warehouseId <= 0 || (b.warehouse_id || 0) === warehouseId;
          return matchesProduct && matchesWarehouse;
        });
        
        const availableBalances = productBalances;
        
        // Sort by FEFO/FIFO
        return availableBalances
          .map((balance: any) => ({
            id: balance.id || 0,
            warehouse_id: balance.warehouse_id || 0,
            product_id: balance.product_id || 0,
            stock_in_id: balance.stock_in_id || 0,
            quantity_remaining: balance.quantity_remaining || 0,
            date_in: balance.date_in || balance.date || "",
            expiry_date: balance.expiry_date,
            batch_number: balance.batch_number,
            product: balance.product,
            warehouse: balance.warehouse,
            stock_in: balance.stock_in,
          }))
          .sort((a, b) => {
            // FEFO: expiry_date first
            if (a.expiry_date && b.expiry_date) {
              const expiryA = new Date(a.expiry_date).getTime();
              const expiryB = new Date(b.expiry_date).getTime();
              if (expiryA !== expiryB) return expiryA - expiryB;
            }
            if (a.expiry_date && !b.expiry_date) return -1;
            if (!a.expiry_date && b.expiry_date) return 1;
            // FIFO: date_in
            const dateA = new Date(a.date_in).getTime();
            const dateB = new Date(b.date_in).getTime();
            return dateA - dateB;
        });
      } catch (error) {
        console.error("Error fetching product stock balance:", error);
        return [];
      }
    },
    enabled: productId > 0, // Only fetch when productId is valid
    ...options, // Options can override staleTime and gcTime if needed
  });
};

// ==================== HOOKS UNTUK USE CASE TANPA PAGINATION ====================
// ✅ Hook-hook ini untuk component yang butuh semua data (Overview, StockBalance, dll)
// ✅ Menggunakan pagination dengan per_page besar untuk fetch semua data

// Fetch All Stock Ins (untuk Overview/Summary - tanpa pagination UI)
export const useFetchAllStockIns = () => {
  const { data, isPending, isFetching, error, ...rest } = useFetchStockIns(1, 1000);
  return {
    data: data?.data || [],
    isPending,
    isFetching,
    error,
    ...rest
  };
};

// Fetch All Stock Transfers (untuk Overview/Summary - tanpa pagination UI)
export const useFetchAllStockTransfers = () => {
  const { data, isPending, isFetching, error, ...rest } = useFetchStockTransfers(1, 1000);
  return {
    data: data?.data || [],
    isPending,
    isFetching,
    error,
    ...rest
  };
};

// Fetch All Stock Returns (untuk StockBalance - tanpa pagination UI)
export const useFetchAllStockReturns = () => {
  const { data, isPending, isFetching, error, ...rest } = useFetchStockReturns(1, 1000);
  return {
    data: data?.data || [],
    isPending,
    isFetching,
    error,
    ...rest
  };
};

// ==================== SUMMARY ENDPOINTS (Backend Aggregation) ====================

// ✅ Fetch Stock In Summary (untuk Overview - lebih efisien dari fetch all)
export const useFetchStockInSummary = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["stock-ins-summary", user?.id],
    queryFn: async () => {
      const params: any = {};
      if (user && !isManager(user.roles)) {
        params.user_id = user.id;
      }
      const response = await apiClient.get("/stock-ins/summary", { params });
      return response.data?.data || response.data;
    },
    staleTime: 0, // ✅ Data selalu dianggap stale - memastikan refetch setelah invalidate (auto sync via mutation)
    gcTime: 10 * 60 * 1000, // ✅ 10 menit
    refetchOnWindowFocus: false, // ✅ Jangan refetch saat window focus
    refetchOnMount: false, // ✅ OPTIMASI: false untuk initial load lebih cepat (data akan tetap fresh karena staleTime: 0)
    refetchInterval: false, // ✅ NONAKTIFKAN auto-refresh polling - hanya refresh saat ada perubahan (melalui mutation invalidation)
    refetchIntervalInBackground: false, // ✅ NONAKTIFKAN - tidak ada polling di background
    placeholderData: (previousData) => previousData, // ✅ Show previous data while fetching (no flickering)
    notifyOnChangeProps: ['data', 'error'], // ✅ Hanya re-render saat data atau error berubah, bukan saat isFetching
    enabled: !!user, // ✅ OPTIMASI: Hanya fetch jika user sudah loaded (mencegah fetch sebelum user ready)
  });
};

// ✅ Fetch Stock Transfer Summary (untuk Overview - lebih efisien dari fetch all)
export const useFetchStockTransferSummary = (options?: { enabled?: boolean }) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["stock-transfers-summary", user?.id],
    queryFn: async () => {
      const params: any = {};
      if (user && !isManager(user.roles)) {
        params.user_id = user.id;
      }
      const response = await apiClient.get("/stock-transfers/summary", { params });
      return response.data?.data || response.data;
    },
    staleTime: 0, // ✅ Data selalu dianggap stale - memastikan refetch setelah invalidate (auto sync via mutation)
    gcTime: 10 * 60 * 1000, // ✅ 10 menit
    refetchOnWindowFocus: false, // ✅ Jangan refetch saat window focus
    refetchOnMount: false, // ✅ OPTIMASI: false untuk initial load lebih cepat (data akan tetap fresh karena staleTime: 0)
    refetchInterval: false, // ✅ NONAKTIFKAN auto-refresh polling - hanya refresh saat ada perubahan (melalui mutation invalidation)
    refetchIntervalInBackground: false, // ✅ NONAKTIFKAN - tidak ada polling di background
    placeholderData: (previousData) => previousData, // ✅ Show previous data while fetching (no flickering)
    notifyOnChangeProps: ['data', 'error'], // ✅ Hanya re-render saat data atau error berubah, bukan saat isFetching
    enabled: options?.enabled !== false && !!user, // ✅ Support conditional loading + hanya fetch jika user ready
  });
};

// ✅ Fetch Stock Return Summary (untuk Overview - lebih efisien dari fetch all)
export const useFetchStockReturnSummary = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["stock-returns-summary", user?.id],
    queryFn: async () => {
      const params: any = {};
      if (user && !isManager(user.roles)) {
        params.user_id = user.id;
      }
      const response = await apiClient.get("/stock-returns/summary", { params });
      return response.data?.data || response.data;
    },
    staleTime: 5 * 60 * 1000, // ✅ 5 menit - data dianggap fresh lebih lama
    gcTime: 10 * 60 * 1000, // ✅ 10 menit
    refetchOnWindowFocus: false, // ✅ Jangan refetch saat window focus (auto sync via mutation)
    refetchOnMount: false, // ✅ Jangan refetch saat mount jika data masih fresh
    refetchInterval: false, // ✅ NONAKTIFKAN - hanya refresh saat ada perubahan (melalui mutation invalidation)
    refetchIntervalInBackground: false, // ✅ NONAKTIFKAN
    placeholderData: (previousData) => previousData, // ✅ Show previous data while fetching (no flickering)
  });
};

// ✅ Fetch Alerts Summary (untuk Overview - lebih efisien dari fetch all alerts)
export const useFetchAlertsSummary = (options?: { enabled?: boolean }) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["alerts-summary", user?.id],
    queryFn: async () => {
      const params: any = {};
      if (user && !isManager(user.roles)) {
        params.user_id = user.id;
      }
      const response = await apiClient.get("/stock-balances/alerts-summary", { params });
      return response.data?.data || response.data;
    },
    staleTime: 0, // ✅ Data selalu dianggap stale - memastikan refetch setelah invalidate (auto sync via mutation)
    gcTime: 10 * 60 * 1000, // ✅ 10 menit
    refetchOnWindowFocus: false, // ✅ Jangan refetch saat window focus
    refetchOnMount: false, // ✅ OPTIMASI: false untuk initial load lebih cepat (data akan tetap fresh karena staleTime: 0)
    refetchInterval: false, // ✅ NONAKTIFKAN auto-refresh polling - hanya refresh saat ada perubahan (melalui mutation invalidation)
    refetchIntervalInBackground: false, // ✅ NONAKTIFKAN - tidak ada polling di background
    placeholderData: (previousData) => previousData, // ✅ Show previous data while fetching (no flickering)
    notifyOnChangeProps: ['data', 'error'], // ✅ Hanya re-render saat data atau error berubah, bukan saat isFetching
    enabled: options?.enabled !== false && !!user, // ✅ Support conditional loading + hanya fetch jika user ready
  });
};

// ✅ Fetch Stock Balance Summary (untuk Overview - lebih efisien dari fetch all)
export const useFetchStockBalanceSummary = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["stock-balances-summary", user?.id],
    queryFn: async () => {
      const params: any = {};
      // Backend akan otomatis filter berdasarkan warehouse_id untuk PIC
      const response = await apiClient.get("/stock-balances/summary", { params });
      return response.data?.data || response.data;
    },
    staleTime: 0, // ✅ Data selalu dianggap stale - memastikan refetch setelah invalidate (auto sync via mutation)
    gcTime: 10 * 60 * 1000, // ✅ 10 menit
    refetchOnWindowFocus: false, // ✅ Jangan refetch saat window focus
    refetchOnMount: false, // ✅ OPTIMASI: false untuk initial load lebih cepat (data akan tetap fresh karena staleTime: 0)
    refetchInterval: false, // ✅ NONAKTIFKAN auto-refresh polling - hanya refresh saat ada perubahan (melalui mutation invalidation)
    refetchIntervalInBackground: false, // ✅ NONAKTIFKAN - tidak ada polling di background
    placeholderData: (previousData) => previousData, // ✅ No flickering
    notifyOnChangeProps: ['data', 'error'], // ✅ Hanya re-render saat data atau error berubah, bukan saat isFetching
    enabled: !!user, // ✅ Only fetch when user is loaded
  });
};

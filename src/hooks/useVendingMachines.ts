import { useQuery, useMutation, useQueryClient, UseQueryOptions } from "@tanstack/react-query";
import apiClient from "../api/axiosConfig";
import { AxiosError } from "axios";
import { VendingMachine, VendingMachineStock, ApiErrorResponse } from "../types/types";

import { useAuth } from "./useAuth";
import { isManager } from "../utils/roleHelpers";

// Fetch All Vending Machines
export const useFetchVendingMachines = () => {
  const { user } = useAuth();
  
  return useQuery<VendingMachine[], AxiosError>({
    queryKey: ["vending-machines"],
    staleTime: 30 * 1000, // ✅ 30 seconds - balanced cache for vending machines data
    gcTime: 5 * 60 * 1000, // ✅ 5 minutes - keep in cache
    refetchOnWindowFocus: false, // ✅ Jangan refetch saat window focus
    refetchOnMount: true, // ✅ ENABLED - ensure fresh data after CRUD operations
    queryFn: async () => {
      try {
        const params: any = {};
        
        // Jika bukan manager, filter berdasarkan assigned_user_id
        if (user && !isManager(user.roles)) {
          params.assigned_user_id = user.id;
        }
        // Manager tidak perlu filter, akan fetch semua data
        
        const response = await apiClient.get("/vending-machines", { params });
        let data = response.data;
        
        if (data && data.data && Array.isArray(data.data)) {
          data = data.data;
        }
        
        if (!Array.isArray(data)) {
          return [];
        }
        
        return data.map((vm: any) => ({
          id: vm.id || 0,
          name: vm.name || "",
          location: vm.location,
          status: vm.status,
          assigned_user_id: vm.assigned_user_id,
          assigned_user: vm.assigned_user,
          created_at: vm.created_at,
          updated_at: vm.updated_at,
        }));
      } catch (error) {
        console.error("Error fetching vending-machines:", error);
        return [];
      }
    },
  });
};

// Fetch Single Vending Machine
export const useFetchVendingMachine = (
  id: number,
  options?: Partial<UseQueryOptions<VendingMachine, AxiosError>>
) => {
  return useQuery<VendingMachine, AxiosError>({
    queryKey: ["vending-machine", id],
    queryFn: async () => {
      const response = await apiClient.get(`/vending-machines/${id}`);
      const data = response.data?.data || response.data;
      
      // Normalize data to include assigned_user fields
      return {
        id: data.id || 0,
        name: data.name || "",
        location: data.location,
        status: data.status,
        assigned_user_id: data.assigned_user_id,
        assigned_user: data.assigned_user,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    },
    enabled: !!id,
    ...options,
  });
};

// Helper function untuk safely get expiry_date dengan multiple fallbacks
// ✅ OPTIMASI: Backend sudah include stock_in.stock_in_products, jadi priority diupdate
const getExpiryDateSafely = (
  stp: any,
  stockInId: number | undefined,
  stockInsMap: Map<number, any>
): string | undefined => {
  try {
    // ✅ Priority 1: From stock_in.stock_in_products (BACKEND SUDAH INCLUDE - MOST RELIABLE)
    // Ini adalah sumber data utama karena backend sudah eager load stock_in.stock_in_products
    if (stp?.stock_in?.stock_in_products && Array.isArray(stp.stock_in.stock_in_products)) {
      try {
        const matching = stp.stock_in.stock_in_products.find(
          (sip: any) => sip?.product_id === stp?.product_id
        );
        if (matching?.expiry_date && typeof matching.expiry_date === 'string') {
          const cleaned = matching.expiry_date.trim();
          if (cleaned !== '' && cleaned !== 'null' && cleaned !== 'undefined') {
            return cleaned;
          }
        }
      } catch (err) {
        console.warn('[getExpiryDateSafely] Error accessing stock_in.stock_in_products:', err);
      }
    }

    // Priority 2: Direct from stock_transfer_products.expiry_date (if backend stores it)
    if (stp?.expiry_date && typeof stp.expiry_date === 'string' && stp.expiry_date.trim() !== '') {
      const cleaned = stp.expiry_date.trim();
      if (cleaned !== 'null' && cleaned !== 'undefined') {
        return cleaned;
      }
    }
    if (stp?.expiryDate && typeof stp.expiryDate === 'string' && stp.expiryDate.trim() !== '') {
      const cleaned = stp.expiryDate.trim();
      if (cleaned !== 'null' && cleaned !== 'undefined') {
        return cleaned;
      }
    }

    // Priority 3: From stock_in.expiry_date (fallback jika stock_in_products tidak ada)
    if (stp?.stock_in?.expiry_date && typeof stp.stock_in.expiry_date === 'string') {
      const cleaned = stp.stock_in.expiry_date.trim();
      if (cleaned !== '' && cleaned !== 'null' && cleaned !== 'undefined') {
        return cleaned;
      }
    }
    if (stp?.stock_in?.expiryDate && typeof stp.stock_in.expiryDate === 'string') {
      const cleaned = stp.stock_in.expiryDate.trim();
      if (cleaned !== '' && cleaned !== 'null' && cleaned !== 'undefined') {
        return cleaned;
      }
    }

    // Priority 4: From stockInsMap (fallback jika stock_in relationship tidak di-load)
    if (stockInId && stockInsMap.has(stockInId)) {
      try {
        const stockIn = stockInsMap.get(stockInId);
        if (stockIn?.stock_in_products && Array.isArray(stockIn.stock_in_products)) {
          const matching = stockIn.stock_in_products.find(
            (sip: any) => sip?.product_id === stp?.product_id
          );
          if (matching?.expiry_date && typeof matching.expiry_date === 'string') {
            const cleaned = matching.expiry_date.trim();
            if (cleaned !== '' && cleaned !== 'null' && cleaned !== 'undefined') {
              return cleaned;
            }
          }
        }
      } catch (err) {
        console.warn('[getExpiryDateSafely] Error accessing stockInsMap:', err);
      }
    }

    return undefined;
  } catch (error) {
    console.warn('[getExpiryDateSafely] Unexpected error:', error);
    return undefined;
  }
};

// Fetch Vending Machine Stocks
export const useFetchVendingMachineStocks = (vendingMachineId?: number) => {
  const queryClient = useQueryClient();
  
  return useQuery<VendingMachineStock[], AxiosError>({
    queryKey: ["vending-machine-stocks", vendingMachineId],
    staleTime: 30 * 1000, // ✅ 30 seconds - consistent with other queries
    gcTime: 5 * 60 * 1000, // ✅ 5 minutes - keep in cache
    refetchOnWindowFocus: false,
    refetchOnMount: true, // ✅ Refetch saat component mount untuk memastikan data fresh
    queryFn: async () => {
      if (!vendingMachineId) return [];
      
      // ✅ Try vending-machine-stocks endpoint first (BACKEND SUDAH UPDATE SAAT STOCK RETURN)
      // Endpoint ini sudah di-update oleh backend saat stock return dibuat, jadi quantity sudah akurat
      let url = `/vending-machine-stocks?vending_machine_id=${vendingMachineId}`;
      
      let response;
      let useStockTransfers = false;
      
      try {
        response = await apiClient.get(url);
        let data = response.data?.data || response.data;
        
        // If data exists and has items, use it
        if (Array.isArray(data) && data.length > 0) {
          // Fetch products for mapping
          let productsMap: Map<number, any> = new Map();
          try {
            const cachedProducts = queryClient.getQueryData<any[]>(["products"]);
            if (cachedProducts && Array.isArray(cachedProducts)) {
              cachedProducts.forEach((p: any) => {
                if (p && p.id) productsMap.set(p.id, p);
              });
            }
            
            if (productsMap.size === 0) {
              const productsRes = await apiClient.get("/products");
              const productsData = productsRes.data?.data || productsRes.data;
              if (Array.isArray(productsData)) {
                productsData.forEach((p: any) => {
                  if (p && p.id) productsMap.set(p.id, p);
                });
              }
            }
          } catch (error) {
            console.warn("Failed to fetch products:", error);
          }
          
          return data.map((stock: any) => {
            const product = stock.product || 
              (stock.product_id && productsMap.has(stock.product_id) 
                ? productsMap.get(stock.product_id) 
                : null);
            
            // Safe extraction untuk endpoint vending-machine-stocks
            let expiryDate: string | undefined = stock.expiry_date;
            
            // Clean up
            if (!expiryDate || expiryDate === "null" || expiryDate === "undefined" || (typeof expiryDate === 'string' && expiryDate.trim() === "")) {
              expiryDate = undefined;
            }
            
            // Fallback: Try from stock_in.stock_in_products
            if (!expiryDate && stock.stock_in?.stock_in_products && Array.isArray(stock.stock_in.stock_in_products)) {
              try {
                const matching = stock.stock_in.stock_in_products.find(
                  (sip: any) => sip?.product_id === stock?.product_id
                );
                if (matching?.expiry_date && typeof matching.expiry_date === 'string') {
                  const cleaned = matching.expiry_date.trim();
                  if (cleaned !== '' && cleaned !== 'null' && cleaned !== 'undefined') {
                    expiryDate = cleaned;
                  }
                }
              } catch (err) {
                console.warn("Error accessing stock_in.stock_in_products:", err);
              }
            }
            
            // ✅ Build stock_in object dengan memastikan stock_in_products tersedia
            // Backend seharusnya sudah include stock_in.stock_in_products
            let stockInObject = stock.stock_in;
            if (stockInObject && !Array.isArray(stockInObject.stock_in_products)) {
              // Jika stock_in ada tapi stock_in_products tidak di-load, set ke empty array
              stockInObject = {
                ...stockInObject,
                stock_in_products: []
              };
            }
            
            return {
              id: stock.id || 0,
              vending_machine_id: stock.vending_machine_id || 0,
              product_id: stock.product_id || 0,
              stock_in_id: stock.stock_in_id || 0,
              quantity: stock.quantity || 0,
              expiry_date: expiryDate, // ✅ Sudah di-extract dengan fallback ke stock_in_products
              date_transferred: stock.date_transferred,
              product,
              vending_machine: stock.vending_machine,
              stock_in: stockInObject, // ✅ Include stock_in dengan stock_in_products untuk UI fallback
              created_at: stock.created_at,
              updated_at: stock.updated_at,
            };
          });
        } else {
          // Empty array or no data, use stock-transfers as fallback
          useStockTransfers = true;
        }
      } catch (error: any) {
        // If 404 or other error, use stock-transfers
        if (error.response?.status === 404 || !response) {
          console.warn("vending-machine-stocks endpoint not found, trying stock-transfers");
          useStockTransfers = true;
        } else {
          // Other error, try stock-transfers as fallback
          console.warn("Error fetching vending-machine-stocks, trying stock-transfers:", error);
          useStockTransfers = true;
        }
      }
      
      // ✅ Fetch from stock-transfers if needed (fallback)
      if (useStockTransfers) {
        // ✅ Fetch stock transfers with relationships
        let transferResponse;
        try {
          transferResponse = await apiClient.get(`/stock-transfers?with=stock_transfer_products.product,stock_transfer_products.stock_in,stock_transfer_products.stock_in.stock_in_products,to_vending_machine&to_vending_machine_id=${vendingMachineId}`);
        } catch (err: any) {
          // Fallback to regular endpoint
          try {
            transferResponse = await apiClient.get(`/stock-transfers?to_vending_machine_id=${vendingMachineId}`);
          } catch (err2: any) {
            console.error("Failed to fetch stock-transfers:", err2);
            return [];
          }
        }
        
        let transferData = transferResponse.data?.data || transferResponse.data;
        
        if (!Array.isArray(transferData)) {
          return [];
        }
        
        // ✅ Filter transfers by to_vending_machine_id to prevent data collision
        transferData = transferData.filter((transfer: any) => {
          const transferVendingMachineId = transfer.to_vending_machine_id || transfer.to_vending_machine?.id;
          return transferVendingMachineId === vendingMachineId;
        });
        
        if (transferData.length === 0) {
          return [];
        }
        
        // ✅ Fetch stock ins to get stock_in_products with expiry_date
        // ✅ JANGAN GUNAKAN CACHE SEBAGAI FALLBACK UTAMA - SELALU FETCH DARI API
        // Ini untuk memastikan data selalu fresh dan sinkron dengan backend
        let stockInsMap: Map<number, any> = new Map();
        try {
          // ✅ SELALU FETCH DARI API, JANGAN GUNAKAN CACHE
          // Cache bisa berisi data lama yang sudah dihapus, menyebabkan data tidak sinkron
          let stockInsRes;
          try {
            stockInsRes = await apiClient.get("/stock-ins?with=stock_in_products");
          } catch (err: any) {
            // Fallback to regular endpoint
            stockInsRes = await apiClient.get("/stock-ins");
          }
          const stockInsData = stockInsRes.data?.data || stockInsRes.data;
          if (Array.isArray(stockInsData)) {
            stockInsData.forEach((si: any) => {
              if (si && si.id) stockInsMap.set(si.id, si);
            });
          }
        } catch (err) {
          console.warn("Failed to fetch stock-ins:", err);
        }
        
        // ✅ Use React Query cache for products
        let productsMap: Map<number, any> = new Map();
        try {
          const cachedProducts = queryClient.getQueryData<any[]>(["products"]);
          if (cachedProducts && Array.isArray(cachedProducts)) {
            cachedProducts.forEach((p: any) => {
              if (p && p.id) productsMap.set(p.id, p);
            });
          }
          
          if (productsMap.size === 0) {
            const productsRes = await apiClient.get("/products");
            const productsData = productsRes.data?.data || productsRes.data;
            if (Array.isArray(productsData)) {
              productsData.forEach((p: any) => {
                if (p && p.id) productsMap.set(p.id, p);
              });
            }
          }
        } catch (err) {
          console.warn("Failed to fetch products:", err);
        }
        
        // ✅ Extract stocks from transfers
        const stocks: VendingMachineStock[] = [];
        transferData.forEach((transfer: any) => {
          // ✅ Double-check: Verify to_vending_machine_id matches
          const transferVendingMachineId = transfer.to_vending_machine_id || transfer.to_vending_machine?.id;
          if (transferVendingMachineId !== vendingMachineId) {
            return; // Skip this transfer if it doesn't match
          }
          
          if (transfer.stock_transfer_products && Array.isArray(transfer.stock_transfer_products)) {
            transfer.stock_transfer_products.forEach((stp: any) => {
              const product = stp.product || 
                (stp.product_id && productsMap.has(stp.product_id) 
                  ? productsMap.get(stp.product_id) 
                  : null);
              
              // ✅ Get expiry_date dengan safe extraction menggunakan helper function
              // Backend sudah include stock_in.stock_in_products, jadi tidak perlu fetch lagi
              const stockInId = stp.stock_in_id;
              let expiryDate = getExpiryDateSafely(stp, stockInId, stockInsMap);
              
              // ✅ Build stock_in object - BACKEND SUDAH INCLUDE stock_in.stock_in_products
              // Batch code: stp.stock_in.code (sudah tersedia dari backend)
              let stockInObject: any = undefined;
              try {
                if (stp.stock_in) {
                  // ✅ Backend sudah include stock_in dengan stock_in_products
                  stockInObject = {
                    id: stp.stock_in.id || stockInId,
                    code: stp.stock_in.code || '', // ✅ Batch code dari backend
                    date: stp.stock_in.date || '',
                    stock_in_products: Array.isArray(stp.stock_in.stock_in_products) 
                      ? stp.stock_in.stock_in_products 
                      : []
                  };
                } else if (stockInId && stockInsMap.has(stockInId)) {
                  // Fallback: Jika stock_in tidak di-load, gunakan stockInsMap
                  const stockIn = stockInsMap.get(stockInId);
                  stockInObject = {
                    id: stockInId,
                    code: stockIn?.code || '', // ✅ Batch code dari stockInsMap
                    date: stockIn?.date || '',
                    stock_in_products: Array.isArray(stockIn?.stock_in_products) 
                      ? stockIn.stock_in_products 
                      : []
                  };
                } else if (stockInId) {
                  // ✅ Fallback: Jika stock_in tidak ada, set minimal object dengan stock_in_id
                  // Batch code akan di-generate di UI jika tidak ada
                  stockInObject = {
                    id: stockInId,
                    code: '', // Akan di-handle di UI dengan fallback
                    date: '',
                    stock_in_products: []
                  };
                }
              } catch (err) {
                console.warn('[useVendingMachines] Error building stock_in object:', err);
              }
              
              stocks.push({
                id: stp.id || Math.random(), // Use random if no id
                vending_machine_id: transfer.to_vending_machine_id || vendingMachineId || 0,
                product_id: stp.product_id || 0,
                stock_in_id: stockInId || 0,
                quantity: stp.quantity || 0,
                expiry_date: expiryDate, // ✅ Sudah safe
                date_transferred: transfer.date || transfer.created_at,
                product,
                vending_machine: transfer.to_vending_machine,
                stock_in: stockInObject, // ✅ Include stock_in_products untuk UI fallback
                created_at: stp.created_at || transfer.created_at,
                updated_at: stp.updated_at || transfer.updated_at,
              });
            });
          }
        });
        
        return stocks;
      }
      
      return [];
    },
    enabled: !!vendingMachineId, // Only fetch when vendingMachineId is provided
  });
};

// Create Vending Machine
export interface CreateVendingMachinePayload {
  name: string;
  location?: string;
  status?: string;
  assigned_user_id?: number | null;
}

export const useCreateVendingMachine = () => {
  const queryClient = useQueryClient();

  return useMutation<VendingMachine, AxiosError<ApiErrorResponse>, CreateVendingMachinePayload>({
    mutationFn: async (payload) => {
      const response = await apiClient.post("/vending-machines", payload, {
        headers: { "Content-Type": "application/json" },
      });
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vending-machines"], refetchType: 'all' });
    },
  });
};

// Update Vending Machine
export interface UpdateVendingMachinePayload extends CreateVendingMachinePayload {
  id: number;
}

export const useUpdateVendingMachine = () => {
  const queryClient = useQueryClient();

  return useMutation<VendingMachine, AxiosError<ApiErrorResponse>, UpdateVendingMachinePayload>({
    mutationFn: async ({ id, ...payload }) => {
      // Use POST with _method: PUT for Laravel compatibility
      const formData = new FormData();
      formData.append("name", payload.name);
      if (payload.location) {
        formData.append("location", payload.location);
      }
      if (payload.status) {
        formData.append("status", payload.status);
      }
      if (payload.assigned_user_id !== undefined && payload.assigned_user_id !== null) {
        formData.append("assigned_user_id", payload.assigned_user_id.toString());
      } else if (payload.assigned_user_id === null) {
        // Allow unassigning by sending null
        formData.append("assigned_user_id", "");
      }
      formData.append("_method", "PUT");

      const response = await apiClient.post(`/vending-machines/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const data = response.data?.data || response.data;
      
      // ✅ Normalize response data untuk memastikan format konsisten dengan yang diharapkan frontend
      return {
        id: data.id || 0,
        name: data.name || "",
        location: data.location,
        status: data.status,
        assigned_user_id: data.assigned_user_id,
        assigned_user: data.assigned_user, // ✅ Backend sudah include ini
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    },
    onSuccess: (updatedData, { id }) => {
      // ✅ Update cache secara langsung dengan response data (optimistic update)
      // Ini akan membuat UI update lebih cepat tanpa perlu menunggu refetch
      if (updatedData) {
        // Update single vending machine cache
        queryClient.setQueryData(["vending-machine", id], updatedData);
        
        // Update vending machines list cache
        queryClient.setQueriesData<VendingMachine[]>(
          { queryKey: ["vending-machines"] },
          (oldData) => {
            if (!oldData) return oldData;
            return oldData.map((vm) => 
              vm.id === id ? updatedData : vm
            );
          }
        );
      }
      
      // ✅ Invalidate queries - React Query akan otomatis refetch saat component mount (karena refetchOnMount: true)
      queryClient.invalidateQueries({ queryKey: ["vending-machines"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["vending-machine", id] });
    },
  });
};

// Delete Vending Machine
export const useDeleteVendingMachine = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/vending-machines/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vending-machines"], refetchType: 'all' });
    },
  });
};


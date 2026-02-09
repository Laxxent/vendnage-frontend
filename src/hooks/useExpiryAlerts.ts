import { useQuery } from "@tanstack/react-query";
import apiClient from "../api/axiosConfig";
import { AxiosError } from "axios";
import { ExpiryAlert } from "../types/types";
import { useAuth } from "./useAuth";
import { isManager } from "../utils/roleHelpers";

// Fetch Expiry Alerts
export const useFetchExpiryAlerts = (daysAhead: number = 30, options?: { enabled?: boolean }) => {
  const { user } = useAuth();
  
  return useQuery<ExpiryAlert[], AxiosError>({
    queryKey: ["expiry-alerts", daysAhead, user?.id], // Include user_id untuk cache per user
    staleTime: 2 * 60 * 1000, // ✅ Cache for 2 minutes
    gcTime: 5 * 60 * 1000, // ✅ Keep in cache for 5 minutes
    enabled: options?.enabled !== false, // ✅ Allow conditional fetching
    queryFn: async () => {
      // Store user?.id in local variable to ensure closure works correctly
      const userId = user?.id;
      
      console.log(`🔄 Fetching expiry alerts for ${daysAhead} days ahead...`);
      try {
        const params: any = {
          days_ahead: daysAhead,
        };
        
        // Jika bukan manager, filter berdasarkan user_id (generic untuk semua PIC)
        if (user && !isManager(user.roles)) {
          params.user_id = userId;
        }
        
        const queryString = new URLSearchParams(
          Object.entries(params).reduce((acc, [key, value]) => {
            if (value !== undefined && value !== null) {
              acc[key] = value.toString();
            }
            return acc;
          }, {} as Record<string, string>)
        ).toString();
        
        const response = await apiClient.get(`/expiry-alerts?${queryString}`);
        let data = response.data;
        
        if (data && data.data && Array.isArray(data.data)) {
          data = data.data;
        }
        
        if (!Array.isArray(data)) {
          // Fallback: Calculate from stock balances
          console.warn("⚠️ Backend expiry-alerts endpoint returned invalid data. Calculating from stock balances...");
          return await calculateExpiryAlertsFromStockBalances(daysAhead, userId);
        }
        
        // If we got valid data from backend, use it (but filter based on daysAhead)
        if (data.length > 0) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          return data
            .map((alert: any) => ({
              product_id: alert.product_id || 0,
              product_name: alert.product_name || "",
              batch_code: alert.batch_code || "",
              expiry_date: alert.expiry_date || "",
              days_until_expiry: alert.days_until_expiry || 0,
              quantity: alert.quantity || 0,
              warehouse_id: alert.warehouse_id,
              warehouse_name: alert.warehouse_name,
              status: alert.status || "warning",
            }))
            .filter((alert) => {
              // Filter: Only include if expired OR within the daysAhead threshold
              // If expired (days_until_expiry < 0): always include
              // If not expired: only include if days_until_expiry <= daysAhead
              const isExpired = alert.days_until_expiry < 0;
              const isWithinThreshold = alert.days_until_expiry <= daysAhead;
              const shouldInclude = isExpired || isWithinThreshold;
              
              if (!shouldInclude) {
                console.log(`⏭️ Skipping backend alert: ${alert.product_name} - ${alert.days_until_expiry} days remaining (threshold: ${daysAhead} days)`);
              }
              
              return shouldInclude;
            });
        }
        
        // If backend returned empty array, try fallback calculation from stock balances
        // This is normal for new PIC users who haven't created any stock data yet
        console.log("ℹ️ Backend expiry-alerts endpoint returned empty array. Trying fallback calculation from stock balances...");
        return await calculateExpiryAlertsFromStockBalances(daysAhead, userId);
      } catch (error: any) {
        // If endpoint doesn't exist (404) or other error, use fallback
        if (error.response?.status === 404) {
          console.warn("⚠️ Backend expiry-alerts endpoint not found (404). Calculating from stock balances...");
        } else {
          console.error("Error fetching expiry-alerts:", error);
        }
        return await calculateExpiryAlertsFromStockBalances(daysAhead, userId);
      }
    },
    // Ensure query refetches when daysAhead changes
    refetchOnMount: "always",
    refetchOnWindowFocus: false,

  });
};

// Fallback function to calculate expiry alerts from stock balances
async function calculateExpiryAlertsFromStockBalances(daysAhead: number, userId?: number): Promise<ExpiryAlert[]> {
  console.log(`📊 Calculating expiry alerts from stock balances for ${daysAhead} days ahead...`);
  
  // Fetch stock balances directly
  let stockBalances: any[] = [];
  try {
    const params: any = {};
    if (userId) {
      params.user_id = userId;
    }
    
    const queryString = new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null) {
          acc[key] = value.toString();
        }
        return acc;
      }, {} as Record<string, string>)
    ).toString();
    
    // Include stock_in relationship to get batch code
    // Try with stock_in relationship first
    let url = queryString 
      ? `/stock-balances?${queryString}&with=stock_in` 
      : "/stock-balances?with=stock_in";
    
    let response = await apiClient.get(url);
    let data = response.data;
    
    if (data && data.data && Array.isArray(data.data)) {
      data = data.data;
    }
    
    if (Array.isArray(data)) {
      stockBalances = data;
      
      // If some balances don't have stock_in loaded or stock_in.code is missing, try to fetch stock_in separately
      const balancesWithoutStockIn = stockBalances.filter(
        (b: any) => b.stock_in_id && b.stock_in_id > 0 && (!b.stock_in || !b.stock_in.code)
      );
      
      if (balancesWithoutStockIn.length > 0) {
        console.log(`⚠️ Found ${balancesWithoutStockIn.length} stock balances without stock_in relationship or stock_in.code. Attempting to fetch stock_in separately...`);
        console.log(`📋 Balances needing stock_in:`, balancesWithoutStockIn.map((b: any) => ({
          balance_id: b.id,
          product_id: b.product_id,
          warehouse_id: b.warehouse_id,
          stock_in_id: b.stock_in_id,
          has_stock_in: !!b.stock_in,
          stock_in_code: b.stock_in?.code,
        })));
        
        // Get unique stock_in_ids
        const stockInIds = [...new Set(balancesWithoutStockIn.map((b: any) => b.stock_in_id).filter((id: any) => id && id > 0))];
        
        console.log(`📋 Unique stock_in_ids to fetch:`, stockInIds);
        
        // Fetch stock_ins in batches
        const stockInsMap = new Map<number, any>();
        try {
          for (const stockInId of stockInIds) {
            try {
              console.log(`🔄 Fetching stock_in ${stockInId}...`);
              const stockInResponse = await apiClient.get(`/stock-ins/${stockInId}`);
              const stockInData = stockInResponse.data?.data || stockInResponse.data;
              if (stockInData && stockInData.id) {
                stockInsMap.set(stockInId, {
                  id: stockInData.id,
                  code: stockInData.code || `STK-IN-${stockInData.id}`,
                  date: stockInData.date || stockInData.created_at,
                });
                console.log(`✅ Loaded stock_in ${stockInId}: ${stockInData.code || `STK-IN-${stockInData.id}`}`);
              } else {
                console.warn(`⚠️ Stock_in ${stockInId} response is invalid:`, stockInData);
              }
            } catch (err: any) {
              console.error(`❌ Failed to fetch stock_in ${stockInId}:`, err.response?.data || err.message);
            }
          }
          
          // Update stock balances with stock_in data
          let updatedCount = 0;
          stockBalances = stockBalances.map((balance: any) => {
            if (balance.stock_in_id && stockInsMap.has(balance.stock_in_id)) {
              const stockIn = stockInsMap.get(balance.stock_in_id);
              // Only update if stock_in is missing or stock_in.code is missing
              if (!balance.stock_in || !balance.stock_in.code) {
                updatedCount++;
                return {
                  ...balance,
                  stock_in: stockIn,
                };
              }
            }
            return balance;
          });
          
          console.log(`✅ Updated ${updatedCount} stock balances with stock_in data (loaded ${stockInsMap.size} stock_in records)`);
        } catch (error) {
          console.error("❌ Failed to fetch stock_in records separately:", error);
        }
      } else {
        console.log("✅ All stock balances have stock_in relationship with code");
      }
    }
  } catch (error) {
    console.error("Error fetching stock balances for expiry alerts:", error);
    return [];
  }
  
  if (stockBalances.length === 0) {
    // This is normal for new PIC users who haven't created any stock data yet
    console.log("ℹ️ No stock balances found for expiry alerts calculation. This is normal if no stock data exists yet.");
    return [];
  }

  console.log("📦 Stock Balances for expiry calculation:", stockBalances.length);
  console.log("📦 Sample stock balance:", JSON.stringify(stockBalances[0], null, 2));
  
  // Debug: Check how many balances have stock_in relationship
  const balancesWithStockIn = stockBalances.filter((b: any) => b.stock_in && b.stock_in.code);
  const balancesWithoutStockIn = stockBalances.filter((b: any) => !b.stock_in || !b.stock_in.code);
  const balancesWithStockInId = stockBalances.filter((b: any) => b.stock_in_id && b.stock_in_id > 0);
  const balancesWithoutStockInId = stockBalances.filter((b: any) => !b.stock_in_id || b.stock_in_id === 0);
  
  console.log("📊 Stock Balance Analysis:", {
    total: stockBalances.length,
    with_stock_in_relationship: balancesWithStockIn.length,
    without_stock_in_relationship: balancesWithoutStockIn.length,
    with_stock_in_id: balancesWithStockInId.length,
    without_stock_in_id: balancesWithoutStockInId.length,
    balances_without_stock_in: balancesWithoutStockIn.map((b: any) => ({
      id: b.id,
      product_id: b.product_id,
      warehouse_id: b.warehouse_id,
      stock_in_id: b.stock_in_id,
      has_stock_in: !!b.stock_in,
      stock_in_code: b.stock_in?.code,
    })),
  });

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
      console.log(`✅ Loaded ${productsMap.size} products for mapping`);
    }
    
    if (Array.isArray(warehousesData)) {
      warehousesData.forEach((w: any) => {
        if (w && w.id) warehousesMap.set(w.id, { id: w.id, name: w.name });
      });
      console.log(`✅ Loaded ${warehousesMap.size} warehouses for mapping`);
    }
  } catch (error) {
    console.warn("Failed to fetch products/warehouses for expiry alerts:", error);
  }

  const alerts: ExpiryAlert[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thresholdDate = new Date(today);
  thresholdDate.setDate(thresholdDate.getDate() + daysAhead);
  
  console.log(`📅 Today: ${today.toISOString().split('T')[0]}`);
  console.log(`📅 Threshold Date (${daysAhead} days ahead): ${thresholdDate.toISOString().split('T')[0]}`);

  stockBalances.forEach((balance) => {
    // Skip if no expiry date
    if (!balance.expiry_date || balance.expiry_date === "" || balance.expiry_date === "null") {
      return;
    }

    // Get quantity - check multiple possible fields
    const quantity = balance.quantity_remaining ?? balance.quantity ?? balance.stock ?? 0;
    
    // Log for debugging
    if (quantity <= 0) {
      console.log(`⚠️ Balance ${balance.id} has quantity ${quantity} (product_id: ${balance.product_id}, expiry: ${balance.expiry_date})`);
    }
    
    // Skip if no remaining stock
    // Note: We still want to show alerts even if quantity is 0, as it might indicate a data issue
    // But for now, we'll skip to avoid showing empty alerts
    if (quantity <= 0) {
      return;
    }

    try {
      const expiryDate = new Date(balance.expiry_date);
      expiryDate.setHours(0, 0, 0, 0);
      
      if (isNaN(expiryDate.getTime())) {
        console.warn(`⚠️ Invalid expiry date for balance ${balance.id}:`, balance.expiry_date);
        return; // Invalid date
      }

      // Calculate days until expiry (rounded to whole number)
      const diffTime = expiryDate.getTime() - today.getTime();
      const daysUntilExpiry = Math.round(diffTime / (1000 * 60 * 60 * 24));

      // Determine status first
      let status: "expired" | "expiring_soon" | "warning" = "warning";
      
      if (expiryDate < today) {
        status = "expired";
      } else if (daysUntilExpiry <= 7) {
        status = "expiring_soon";
      } else {
        status = "warning";
      }

      // Filter: Only include if expired OR within the daysAhead threshold
      // If expired: always include
      // If not expired: only include if daysUntilExpiry <= daysAhead
      const shouldInclude = expiryDate < today || daysUntilExpiry <= daysAhead;
      
      if (!shouldInclude) {
        console.log(`⏭️ Skipping product ${balance.product_id}: ${daysUntilExpiry} days remaining (threshold: ${daysAhead} days)`);
        return;
      }

      // Get product and warehouse names from maps or nested objects
      const product = balance.product || 
        (balance.product_id && productsMap.has(balance.product_id) 
          ? productsMap.get(balance.product_id) 
          : null);
      const warehouse = balance.warehouse || 
        (balance.warehouse_id && warehousesMap.has(balance.warehouse_id) 
          ? warehousesMap.get(balance.warehouse_id) 
          : null);

      // Get batch code from multiple possible sources
      // Priority: stock_in.code > batch_code > batch_number > stock_in_id > empty
      // Note: For stock returns/transfers, stock_in_id should still reference the original stock_in
      let batchCode = "";
      
      if (balance.stock_in?.code) {
        // Priority 1: stock_in.code (from stock in) - most reliable
        batchCode = balance.stock_in.code;
      } else if (balance.batch_code) {
        // Priority 2: batch_code field (direct field) - if backend provides it
        batchCode = balance.batch_code;
      } else if (balance.batch_number) {
        // Priority 3: batch_number field - alternative batch identifier
        batchCode = balance.batch_number;
      } else if (balance.stock_in_id && balance.stock_in_id > 0) {
        // Priority 4: Generate from stock_in_id if available
        // This should work for stock returns/transfers that reference stock_in
        // NOTE: This is a fallback - ideally stock_in.code should be available
        batchCode = `STK-IN-${balance.stock_in_id}`;
        
        // Debug: Log when we have stock_in_id but no stock_in relationship
        if (!balance.stock_in) {
          console.warn(`⚠️ Balance ${balance.id} has stock_in_id ${balance.stock_in_id} but no stock_in relationship. Using generated code: ${batchCode}`, {
            product_id: balance.product_id,
            warehouse_id: balance.warehouse_id,
            stock_in_id: balance.stock_in_id,
          });
        }
      } else {
        // Priority 5: If no batch code available, leave empty
        // This handles edge cases where stock comes from stock return/transfer without stock_in_id
        batchCode = "";
        
        // Debug: Log balance data to understand structure for empty batch codes
        console.error(`❌ CRITICAL: Empty batch code for balance ${balance.id} - no stock_in_id available!`, {
          balance_id: balance.id,
          stock_in_id: balance.stock_in_id,
          stock_in: balance.stock_in,
          batch_code: balance.batch_code,
          batch_number: balance.batch_number,
          has_stock_in: !!balance.stock_in,
          stock_in_code: balance.stock_in?.code,
          product_id: balance.product_id,
          warehouse_id: balance.warehouse_id,
          full_balance: JSON.stringify(balance, null, 2),
        });
      }

      const alert: ExpiryAlert = {
        product_id: balance.product_id || 0,
        product_name: product?.name || balance.product?.name || balance.product_name || `Product #${balance.product_id || 'Unknown'}`,
        batch_code: batchCode,
        expiry_date: balance.expiry_date,
        days_until_expiry: daysUntilExpiry,
        quantity: quantity,
        warehouse_id: balance.warehouse_id || 0,
        warehouse_name: warehouse?.name || balance.warehouse?.name || balance.warehouse_name || `Warehouse #${balance.warehouse_id || 'Unknown'}`,
        status: status,
      };

      console.log(`✅ Created alert (${daysAhead} days filter):`, {
        product_id: alert.product_id,
        product_name: alert.product_name,
        days_until_expiry: alert.days_until_expiry,
        status: alert.status,
        batch_code: alert.batch_code,
        quantity: alert.quantity,
        warehouse_name: alert.warehouse_name,
      });

      alerts.push(alert);
    } catch (error) {
      console.warn("Error processing expiry date for balance:", balance, error);
    }
  });

  // Sort by expiry date (earliest first)
  alerts.sort((a, b) => {
    const dateA = new Date(a.expiry_date).getTime();
    const dateB = new Date(b.expiry_date).getTime();
    return dateA - dateB;
  });

  console.log(`✅ Calculated ${alerts.length} expiry alerts from stock balances`);
  return alerts;
}


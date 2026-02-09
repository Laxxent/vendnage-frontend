import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useFetchProduct } from "../hooks/useProducts";
import { useAuth } from "../hooks/useAuth";
import { useFetchStockBalanceSummary, useFetchStockInSummary, useFetchStockTransferSummary, useFetchAlertsSummary, useFetchStockBalances, useFetchStockIns, useFetchStockTransfers } from "../hooks/useStockManagement";
import { useFetchWarehouses } from "../hooks/useWarehouses";
import UserProfileCard from "../components/UserProfileCard";
import LoadingSpinner from "../components/LoadingSpinner";
import { StockIn, StockTransfer } from "../types/types";

const Overview = () => {
  const { loading: authLoading, user } = useAuth();
  
  // ✅ Priority 1: Critical data (blocking) - fetch semua summary data untuk akurasi (lebih ringan dan cepat)
  // ✅ Gunakan isPending untuk initial load check (hanya true saat initial load, tidak akan true lagi saat refetch)
  const { data: warehouses = [], isPending: warehousesPending } = useFetchWarehouses();
  const { data: stockInSummary } = useFetchStockInSummary();
  // ✅ OPTIMASI: Gunakan summary endpoint untuk stock balances (lebih ringan dari fetch all data)
  // ✅ Fallback: Jika summary error atau tidak tersedia, gunakan fetch all (hanya jika diperlukan)
  const { data: stockBalanceSummary, isPending: stockBalancesPending, error: stockBalanceSummaryError } = useFetchStockBalanceSummary();
  const { data: allStockBalances = [], isPending: stockBalancesAllPending } = useFetchStockBalances(
    undefined, 
    { 
      enableAutoSync: false,
      // ✅ Hanya fetch all jika summary error atau tidak tersedia
      enabled: !!stockBalanceSummaryError || (stockBalanceSummary === undefined && !stockBalancesPending)
    }
  );
  // ✅ Fix: Stock Transfer Summary selalu di-fetch seperti Stock In Summary (untuk akurasi data PIC)
  const { data: stockTransferSummary } = useFetchStockTransferSummary();
  
  // ✅ OPTIMASI: Fetch alerts summary langsung (tidak perlu conditional) agar card langsung muncul dengan data
  // ✅ Card "Low Stock", "Expired", "Expiring Soon" akan langsung menampilkan data tanpa menunggu
  const { data: alertsSummary } = useFetchAlertsSummary({
    enabled: !!user, // ✅ Hanya fetch jika user ready (fetch langsung, tidak perlu menunggu critical data)
  });
  
  // ✅ OPTIMASI: Fetch minimal data untuk perhitungan "today" yang akurat (non-blocking, menggunakan cache)
  // ✅ Fetch hanya page 1 dengan 25 items untuk menghitung data hari ini (ringan dan cepat)
  // ✅ Non-blocking: tidak akan memperlambat loading karena fetch di background dan menggunakan cache
  const { data: stockInsForToday } = useFetchStockIns(1, 25, ""); // ✅ Fetch minimal untuk perhitungan akurat
  const { data: stockTransfersForToday } = useFetchStockTransfers(1, 25, ""); // ✅ Fetch minimal untuk perhitungan akurat
  
  // ✅ Priority 2: Non-critical data (lazy load after critical data) - untuk recent activities saja

  
  // ✅ Load recent activities after critical data is loaded


  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const { data: selectedProduct } = useFetchProduct(selectedProductId || 0);

  // ✅ Calculate Stock In (today) - menggunakan data yang sama dengan halaman list untuk akurasi
  const totalStockInToday = useMemo(() => {
    // ✅ Priority 1: Gunakan data dari list endpoint (akurat, konsisten dengan halaman list)
    if (stockInsForToday?.data) {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      // ✅ Filter data hari ini dari hasil fetch (konsisten dengan halaman list)
      const todayCount = stockInsForToday.data.filter((si: StockIn) => {
        const dateStr = si.date || si.created_at;
        if (!dateStr) return false;
        return dateStr.startsWith(todayStr);
      }).length;
      
      return todayCount;
    }
    
    // ✅ Priority 2: Fallback ke summary jika data list belum ready (untuk initial load cepat)
    if (stockInSummary) {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      // ✅ Jika summary memiliki field today_count, gunakan itu
      if (stockInSummary.today_count !== undefined) {
        return stockInSummary.today_count;
      }
      
      // ✅ Fallback: Filter dari recent_10 (terbatas, tapi lebih baik dari 0)
      const recent10 = stockInSummary.recent_10 || [];
      return recent10.filter((si: any) => {
        const dateStr = si.date || si.created_at;
        if (!dateStr) return false;
        return dateStr.startsWith(todayStr);
      }).length;
    }
    
    return 0;
  }, [stockInsForToday, stockInSummary]); // ✅ Gunakan data list untuk akurasi, summary sebagai fallback

  // ✅ Calculate Stock Transfer (today) - menggunakan data yang sama dengan halaman list untuk akurasi
  const totalStockTransferToday = useMemo(() => {
    // ✅ Priority 1: Gunakan data dari list endpoint (akurat, konsisten dengan halaman list)
    if (stockTransfersForToday?.data) {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      // ✅ Filter data hari ini dari hasil fetch (konsisten dengan halaman list)
      const todayCount = stockTransfersForToday.data.filter((st: StockTransfer) => {
        const dateStr = st.date || st.created_at;
        if (!dateStr) return false;
        return dateStr.startsWith(todayStr);
      }).length;
      
      return todayCount;
    }
    
    // ✅ Priority 2: Fallback ke summary jika data list belum ready (untuk initial load cepat)
    if (stockTransferSummary) {
      // ✅ Jika summary memiliki field today_count, gunakan itu
      if (stockTransferSummary.today_count !== undefined) {
        return stockTransferSummary.today_count;
      }
      
      // ✅ Fallback: Filter dari recent_10 (jangan langsung return length, filter dulu)
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const recent10 = stockTransferSummary.recent_10 || [];
      return recent10.filter((st: any) => {
        const dateStr = st.date || st.created_at;
        if (!dateStr) return false;
        return dateStr.startsWith(todayStr);
      }).length;
    }
    
    return 0;
  }, [stockTransfersForToday, stockTransferSummary]); // ✅ Gunakan data list untuk akurasi, summary sebagai fallback

  // ✅ Calculate Total Stock Available - gunakan summary data dengan fallback yang lebih baik
  const totalStockAvailable = useMemo(() => {
    // ✅ Priority 1: Gunakan summary jika tersedia (lebih cepat dari fetch all data)
    if (stockBalanceSummary?.total_stock_available !== undefined) {
      return stockBalanceSummary.total_stock_available;
    }
    
    // ✅ Priority 2: Fallback ke fetch all jika summary error atau tidak tersedia
    if (stockBalanceSummaryError && allStockBalances && allStockBalances.length > 0) {
      // ✅ Hitung total quantity_remaining dari semua stock balances (hanya yang quantity_remaining > 0)
      // ✅ Ini konsisten dengan perhitungan di Stock Balance page
      return allStockBalances.reduce((total, balance) => {
        return total + (balance.quantity_remaining || 0);
      }, 0);
    }
    
    // ✅ Fallback: Return 0 jika summary tidak tersedia dan fetch all juga belum selesai
    // User masih bisa melihat data di halaman Stock Balance yang menggunakan fetch all
    return 0;
  }, [stockBalanceSummary, stockBalanceSummaryError, allStockBalances]);

  // ✅ Check jika stock available masih loading (hanya untuk card ini, tidak blocking semua)
  const isStockAvailableLoading = 
    (stockBalancesPending && (stockBalanceSummary as any)?.total_stock_available === undefined && !stockBalanceSummaryError) ||
    (stockBalanceSummaryError && stockBalancesAllPending && allStockBalances.length === 0);

  // ✅ Calculate Alerts - menggunakan alerts summary dari backend (lebih efisien dan akurat)
  const expiredCount = useMemo(() => {
    return alertsSummary?.expired_products || 0;
  }, [alertsSummary]);

  const expiringSoonCount = useMemo(() => {
    return alertsSummary?.expiring_soon || 0;
  }, [alertsSummary]);

  const lowStockCount = useMemo(() => {
    return alertsSummary?.low_stock || 0;
  }, [alertsSummary]);

  // Recent Stock In - menggunakan recent_10 dari summary
  const recentStockIns = useMemo(() => {
    if (!stockInSummary) return []; // ✅ Hanya check data, isPending tidak perlu karena hanya true saat initial load
    
    // ✅ Gunakan recent_10 dari summary (sudah di-sort dan di-limit oleh backend)
    const recent10 = stockInSummary.recent_10 || [];
    return recent10.slice(0, 5); // Ambil 5 terbaru
  }, [stockInSummary]); // ✅ Hapus isPending dari dependency - hanya true saat initial load

  // Recent Stock Transfers - menggunakan recent_10 dari summary
  const recentStockTransfers = useMemo(() => {
    if (!stockTransferSummary) return []; // ✅ Hanya check data, isPending tidak perlu karena hanya true saat initial load
    
    // ✅ Gunakan recent_10 dari summary (sudah di-sort dan di-limit oleh backend)
    const recent10 = stockTransferSummary.recent_10 || [];
    return recent10.slice(0, 5); // Ambil 5 terbaru
  }, [stockTransferSummary]); // ✅ Hapus isPending dari dependency - hanya true saat initial load

  // Most Transferred Products (1 bulan terakhir) - menggunakan data dari backend
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const mostTransferredProducts = useMemo(() => {
    // ✅ Skip calculation if stock transfers data tidak ada
    if (!stockTransferSummary) {
      return [];
    }
    
    // ✅ Gunakan most_transferred_products langsung dari backend (data dari 1 bulan terakhir)
    let products = stockTransferSummary.most_transferred_products || [];
    
    // ✅ Filter berdasarkan warehouse jika dipilih
    // Note: Backend mungkin tidak support warehouse filter untuk most_transferred_products
    // Jadi kita filter di frontend berdasarkan recent_10 sebagai workaround
    if (selectedWarehouseId) {
      const recent10 = stockTransferSummary.recent_10 || [];
      const productIdsFromWarehouse = new Set<number>();
      
      // Kumpulkan product_id dari transfers yang berasal dari warehouse yang dipilih
      recent10.forEach((transfer: any) => {
        if (transfer.from_warehouse_id === selectedWarehouseId && transfer.stock_transfer_products) {
          transfer.stock_transfer_products.forEach((stp: any) => {
            if (stp.product_id) {
              productIdsFromWarehouse.add(stp.product_id);
            }
          });
        }
      });
      
      // Filter products yang ada di warehouse yang dipilih
      products = products.filter((p: any) => productIdsFromWarehouse.has(p.product_id));
    }
    
    // ✅ Sort berdasarkan total_quantity
    products.sort((a: any, b: any) => {
      if (sortOrder === "desc") {
        return b.total_quantity - a.total_quantity; // Descending: paling banyak dulu
      } else {
        return a.total_quantity - b.total_quantity; // Ascending: paling sedikit dulu
      }
    });

    return products;
  }, [stockTransferSummary, selectedWarehouseId, sortOrder]); // ✅ Hapus isPending dari dependency - hanya true saat initial load

  // Format date
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("id-ID", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  // ✅ Optimized Loading: Only show spinner untuk initial load saja
  // ✅ OPTIMASI: Render UI cepat (tidak blocking) - card "Stock Available" akan menampilkan skeleton jika data belum ready
  // ✅ Alerts summary sudah di-fetch langsung, jadi card "Low Stock" akan langsung muncul dengan data
  const isCriticalDataLoading = 
    authLoading ||
    (warehousesPending && warehouses.length === 0); // ✅ Hanya tunggu warehouses (tidak blocking summary queries)

  if (isCriticalDataLoading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <div
        id="Top-Bar"
        className="flex items-center w-full gap-6 mt-[30px] mb-6"
      >
            <div className="flex items-center gap-6 h-[92px] bg-white w-full rounded-3xl p-[18px]">
              <div className="flex flex-col gap-[6px] flex-1 min-w-0">
                <h1 className="font-bold text-2xl">Dashboard</h1>
              </div>
            </div>
            <UserProfileCard />
          </div>

          <main className="flex flex-col gap-6 flex-1">
            {/* Summary Cards */}
            <section className="grid grid-cols-3 gap-6">
              {/* Total Stock In */}
              <div className="flex flex-col rounded-3xl p-[18px] gap-5 bg-white">
                <div className="flex size-14 rounded-full bg-green-100 items-center justify-center">
                  <img
                    src="assets/images/icons/receive-square-blue-fill.svg"
                    className="size-6"
                    alt="icon"
                  />
                </div>
                <div className="flex flex-col gap-[6px]">
                  <p className="font-semibold text-[32px]">
                    {totalStockInToday.toLocaleString("id") || 0}
                  </p>
                  <p className="font-medium text-lg text-monday-gray">
                    Stock In (Today)
                  </p>
                </div>
              </div>

              {/* Total Stock Transfer */}
              <div className="flex flex-col rounded-3xl p-[18px] gap-5 bg-white">
                <div className="flex size-14 rounded-full bg-orange-100 items-center justify-center">
                  <img
                    src="assets/images/icons/arrow-right-blue.svg"
                    className="size-6"
                    alt="icon"
                  />
                </div>
                <div className="flex flex-col gap-[6px]">
                  <p className="font-semibold text-[32px]">
                    {totalStockTransferToday.toLocaleString("id") || 0}
                  </p>
                  <p className="font-medium text-lg text-monday-gray">
                    Stock Transfer (Today)
                  </p>
                </div>
              </div>

              {/* Total Stock Available */}
              <div className="flex flex-col rounded-3xl p-[18px] gap-5 bg-white">
                <div className="flex size-14 rounded-full bg-purple-100 items-center justify-center">
                  <img
                    src="assets/images/icons/box-black.svg"
                    className="size-6"
                    alt="icon"
                  />
                </div>
                <div className="flex flex-col gap-[6px]">
                  {isStockAvailableLoading ? (
                    // ✅ Loading skeleton untuk card "Stock Available" (tidak menampilkan 0)
                    <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
                  ) : (
                    <p className="font-semibold text-[32px]">
                      {totalStockAvailable.toLocaleString("id") || 0}
                    </p>
                  )}
                  <p className="font-medium text-lg text-monday-gray">
                    Stock Available
                  </p>
                </div>
              </div>
            </section>

            {/* Alerts Section */}
            <section className="flex flex-col gap-4 rounded-3xl p-[18px] bg-white">
              <h2 className="font-bold text-xl">Alerts & Warnings</h2>
              <div className="grid grid-cols-3 gap-4">
                <Link
                  to="/stock-management/expiry-alert"
                  className="flex items-center justify-between rounded-2xl p-4 border-2 border-red-200 bg-red-50 hover:bg-red-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-12 rounded-full bg-red-500 items-center justify-center">
                      <img
                        src="assets/images/icons/close-circle-black.svg"
                        className="size-6"
                        alt="icon"
                      />
                    </div>
                    <div className="flex flex-col">
                      <p className="font-semibold text-2xl text-red-600">
                        {expiredCount}
                      </p>
                      <p className="font-medium text-sm text-red-700">
                        Expired Products
                      </p>
                    </div>
                  </div>
                  <img
                    src="assets/images/icons/arrow-right-blue.svg"
                    className="size-6"
                    alt="icon"
                  />
                </Link>

                <Link
                  to="/stock-management/expiry-alert"
                  className="flex items-center justify-between rounded-2xl p-4 border-2 border-orange-200 bg-orange-50 hover:bg-orange-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-12 rounded-full bg-orange-500 items-center justify-center">
                      <img
                        src="assets/images/icons/note-2-blue-fill.svg"
                        className="size-6"
                        alt="icon"
                      />
                    </div>
                    <div className="flex flex-col">
                      <p className="font-semibold text-2xl text-orange-600">
                        {expiringSoonCount}
                      </p>
                      <p className="font-medium text-sm text-orange-700">
                        Expiring Soon
                      </p>
                    </div>
                  </div>
                  <img
                    src="assets/images/icons/arrow-right-blue.svg"
                    className="size-6"
                    alt="icon"
                  />
                </Link>

                <Link
                  to="/stock-management/stock-balance"
                  className="flex items-center justify-between rounded-2xl p-4 border-2 border-yellow-200 bg-yellow-50 hover:bg-yellow-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-12 rounded-full bg-yellow-500 items-center justify-center">
                      <img
                        src="assets/images/icons/note-2-blue-fill.svg"
                        className="size-6"
                        alt="icon"
                      />
                    </div>
                    <div className="flex flex-col">
                      <p className="font-semibold text-2xl text-yellow-600">
                        {lowStockCount}
                      </p>
                      <p className="font-medium text-sm text-yellow-700">
                        Low Stock
                      </p>
                    </div>
                  </div>
                  <img
                    src="assets/images/icons/arrow-right-blue.svg"
                    className="size-6"
                    alt="icon"
                  />
                </Link>
              </div>
            </section>

            {/* Recent Activities */}
            <div className="flex gap-6 flex-1">
              {/* Recent Stock In - hanya check data, isPending tidak akan true lagi saat refetch */}
              {stockInSummary ? (
                <section className="flex flex-col gap-5 flex-1 rounded-3xl p-[18px] bg-white">
                  <div className="flex items-center justify-between">
                    <h2 className="font-bold text-xl">Recent Stock In (Today)</h2>
                    <Link
                      to="/stock-management/stock-in"
                      className="font-semibold text-sm text-monday-blue hover:underline view-all-link"
                      data-view-all="true"
                    >
                      View All
                    </Link>
                  </div>
                  {recentStockIns.length > 0 ? (
                    <div className="flex flex-col gap-3 overflow-y-auto pr-2" style={{ maxHeight: '130px', scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 #f1f5f9' }}>
                      {recentStockIns.map((stockIn: StockIn) => (
                        <Link
                          key={stockIn.id}
                          to={`/stock-management/stock-in/edit/${stockIn.id}`}
                          className="flex items-center justify-between p-4 rounded-2xl border border-monday-border hover:bg-gray-50 transition-colors flex-shrink-0"
                        >
                          <div className="flex flex-col gap-1">
                            <p className="font-semibold text-base">
                              {stockIn.warehouse?.name || "Unknown Warehouse"}
                            </p>
                            <p className="font-medium text-sm text-monday-gray">
                              {stockIn.code || `STK-IN-${stockIn.id}`}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <p className="font-semibold text-base">
                              {stockIn.total_quantity || 0} items
                            </p>
                            <p className="font-medium text-sm text-monday-gray">
                              {formatDate(stockIn.date)}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <img
                        src="assets/images/icons/document-text-grey.svg"
                        className="size-12 mb-3 opacity-50"
                        alt="empty icon"
                      />
                      <p className="font-semibold text-monday-gray">
                        No stock in records yet
                      </p>
                    </div>
                  )}
                </section>
              ) : (
                <section className="flex flex-col gap-5 flex-1 rounded-3xl p-[18px] bg-white animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-32"></div>
                  <div className="space-y-3">
                    <div className="h-16 bg-gray-100 rounded-2xl"></div>
                    <div className="h-16 bg-gray-100 rounded-2xl"></div>
                  </div>
                </section>
              )}

              {/* Recent Stock Transfers - hanya check data, isPending tidak akan true lagi saat refetch */}
              {stockTransferSummary ? (
                <section className="flex flex-col gap-5 flex-1 rounded-3xl p-[18px] bg-white">
                  <div className="flex items-center justify-between">
                    <h2 className="font-bold text-xl">Recent Stock Transfers (Today)</h2>
                    <Link
                      to="/stock-management/stock-transfer"
                      className="font-semibold text-sm text-monday-blue hover:underline view-all-link"
                      data-view-all="true"
                    >
                      View All
                    </Link>
                  </div>
                  {recentStockTransfers.length > 0 ? (
                    <div className="flex flex-col gap-3 overflow-y-auto pr-2" style={{ maxHeight: '130px', scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 #f1f5f9' }}>
                      {recentStockTransfers.map((transfer: StockTransfer) => (
                        <Link
                          key={transfer.id}
                          to={`/stock-management/stock-transfer/edit/${transfer.id}`}
                          className="flex items-center justify-between p-4 rounded-2xl border border-monday-border hover:bg-gray-50 transition-colors flex-shrink-0"
                        >
                          <div className="flex flex-col gap-1">
                            <p className="font-semibold text-base">
                              {transfer.from_warehouse?.name || "Unknown"} →{" "}
                              {transfer.to_vending_machine?.name || "Unknown"}
                            </p>
                            <p className="font-medium text-sm text-monday-gray">
                              {transfer.code || `STK-TRF-${transfer.id}`}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <p className="font-semibold text-base">
                              {transfer.total_quantity || 0} items
                            </p>
                            <p className="font-medium text-sm text-monday-gray">
                              {formatDate(transfer.date)}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <img
                        src="assets/images/icons/document-text-grey.svg"
                        className="size-12 mb-3 opacity-50"
                        alt="empty icon"
                      />
                      <p className="font-semibold text-monday-gray">
                        No stock transfer records yet
                      </p>
                    </div>
                  )}
                </section>
              ) : (
                <section className="flex flex-col gap-5 flex-1 rounded-3xl p-[18px] bg-white animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-40"></div>
                  <div className="space-y-3">
                    <div className="h-16 bg-gray-100 rounded-2xl"></div>
                    <div className="h-16 bg-gray-100 rounded-2xl"></div>
                  </div>
                </section>
              )}
            </div>

            {/* Quick Stats & Actions */}
            <div className="flex gap-6">
              {/* Most Transferred Products */}
              <section className="flex flex-col gap-5 flex-1 rounded-3xl p-[18px] bg-white">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-xl">Most Transferred Products in 1 month</h2>
                </div>
                
                {/* Filters */}
                <div className="flex items-center gap-3">
                  {/* Warehouse Filter */}
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-monday-gray whitespace-nowrap flex-shrink-0">
                      Filter Warehouse:
                    </span>
                    <label className="relative">
                      <select
                        value={selectedWarehouseId || ""}
                        onChange={(e) => setSelectedWarehouseId(e.target.value ? Number(e.target.value) : null)}
                        className="appearance-none rounded-xl border-[1.5px] border-monday-border bg-white px-4 py-2.5 pr-10 text-sm font-semibold text-monday-gray shadow-sm hover:shadow-md transition-shadow min-w-[200px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-monday-blue focus:border-monday-blue"
                      >
                        <option value="">All Warehouses</option>
                        {warehouses.map((warehouse) => (
                          <option key={warehouse.id} value={warehouse.id}>
                            {warehouse.name}
                          </option>
                        ))}
                      </select>
                      <img
                        src="/assets/images/icons/arrow-down-grey.svg"
                        alt="arrow"
                        className="absolute top-1/2 right-3 -translate-y-1/2 size-4 pointer-events-none flex-shrink-0 z-10"
                      />
                    </label>
                  </div>

                  {/* Sort Order Filter */}
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-monday-gray whitespace-nowrap flex-shrink-0">
                      Sort By:
                    </span>
                    <label className="relative">
                      <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
                        className="appearance-none rounded-xl border-[1.5px] border-monday-border bg-white px-4 py-2.5 pr-10 text-sm font-semibold text-monday-gray shadow-sm hover:shadow-md transition-shadow min-w-[150px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-monday-blue focus:border-monday-blue"
                      >
                        <option value="desc">Most to Least</option>
                        <option value="asc">Least to Most</option>
                      </select>
                      <img
                        src="/assets/images/icons/arrow-down-grey.svg"
                        alt="arrow"
                        className="absolute top-1/2 right-3 -translate-y-1/2 size-4 pointer-events-none flex-shrink-0 z-10"
                      />
                    </label>
                  </div>
                </div>

                {/* Products List */}
                {mostTransferredProducts.length > 0 ? (
                  <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto">
                    {mostTransferredProducts.map((product: { product_id: number; product_name: string; total_quantity: number }) => (
                      <div
                        key={product.product_id}
                        className="flex items-center justify-between p-4 rounded-2xl border border-monday-border"
                      >
                        <p className="font-semibold text-base">
                          {product.product_name}
                        </p>
                        <p className="font-semibold text-base">
                          {product.total_quantity.toLocaleString("id")} items
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <p className="font-semibold text-monday-gray">
                      No transfer data available for the last month
                    </p>
                  </div>
                )}
              </section>

              {/* Quick Actions */}
              <section className="flex flex-col gap-5 w-[300px] shrink-0 rounded-3xl p-[18px] bg-white">
                <h2 className="font-bold text-xl">Quick Actions</h2>
                <div className="flex flex-col gap-3">
                  <Link
                    to="/stock-management/stock-in/add"
                    className="flex items-center justify-between rounded-2xl p-4 gap-[10px] bg-monday-blue/10 hover:bg-monday-blue/20 transition-colors"
                  >
                    <p className="font-semibold text-monday-blue">
                      Add Stock In
                    </p>
                    <img
                      src="assets/images/icons/arrow-right-blue.svg"
                      className="flex size-6 shrink-0"
                      alt="icon"
                    />
                  </Link>
                  <Link
                    to="/stock-management/stock-transfer/add"
                    className="flex items-center justify-between rounded-2xl p-4 gap-[10px] bg-monday-blue/10 hover:bg-monday-blue/20 transition-colors"
                  >
                    <p className="font-semibold text-monday-blue">
                      Add Stock Transfer
                    </p>
                    <img
                      src="assets/images/icons/arrow-right-blue.svg"
                      className="flex size-6 shrink-0"
                      alt="icon"
                    />
                  </Link>
                  <Link
                    to="/stock-management/stock-balance"
                    className="flex items-center justify-between rounded-2xl p-4 gap-[10px] bg-monday-blue/10 hover:bg-monday-blue/20 transition-colors"
                  >
                    <p className="font-semibold text-monday-blue">
                      View Stock Balance
                    </p>
                    <img
                      src="assets/images/icons/arrow-right-blue.svg"
                      className="flex size-6 shrink-0"
                      alt="icon"
                    />
                  </Link>
                  <Link
                    to="/stock-management/expiry-alert"
                    className="flex items-center justify-between rounded-2xl p-4 gap-[10px] bg-monday-blue/10 hover:bg-monday-blue/20 transition-colors"
                  >
                    <p className="font-semibold text-monday-blue">
                      View Expiry Alerts
                    </p>
                    <img
                      src="assets/images/icons/arrow-right-blue.svg"
                      className="flex size-6 shrink-0"
                      alt="icon"
                    />
                  </Link>
                </div>
              </section>
            </div>
          </main>

      {/* Product Details Modal */}
      {selectedProductId && selectedProduct && (
        <div className="modal flex flex-1 items-center justify-center h-full fixed top-0 w-full">
          <div
            onClick={() => setSelectedProductId(null)}
            className="absolute w-full h-full bg-[#292D32B2] cursor-pointer"
          />
          <div className="relative flex flex-col w-[406px] shrink-0 rounded-3xl p-[18px] gap-6 bg-white">
            <div className="modal-header flex items-center justify-between">
              <p className="font-semibold text-xl">Product Details</p>
              <button
                onClick={() => setSelectedProductId(null)}
                className="flex size-14 rounded-full items-center justify-center bg-monday-gray-background"
              >
                <img
                  src="assets/images/icons/close-circle-black.svg"
                  className="size-6"
                  alt="icon"
                />
              </button>
            </div>
            <div className="modal-content flex flex-col rounded-3xl border border-monday-border p-4 gap-5">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-2">
                  <p className="flex items-center gap-[6px] font-semibold text-lg">
                    <img
                      src={selectedProduct.category.photo}
                      className="size-6 flex shrink-0"
                      alt="icon"
                    />
                    {selectedProduct.name}
                  </p>
                  <p className="font-bold text-lg">
                    {selectedProduct.category.name}
                  </p>
                  <p className="font-semibold text-[17px] text-monday-blue">
                    Rp {selectedProduct.price.toLocaleString("id")}
                  </p>
                </div>
                <div className="flex size-[100px] rounded-2xl bg-monday-gray-background items-center justify-center overflow-hidden">
                  <img
                    src={selectedProduct.thumbnail}
                    className="size-full object-contain"
                    alt="icon"
                  />
                </div>
              </div>
              <hr className="border-monday-border" />
              <div>
                <p className="font-medium text-sm text-monday-gray">
                  Product About
                </p>
                <p className="font-semibold leading-[160%]">
                  {selectedProduct.about}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Overview;

import { useFetchExpiryAlerts } from "../../hooks/useExpiryAlerts";
import { useFetchWarehouses } from "../../hooks/useWarehouses";
import UserProfileCard from "../../components/UserProfileCard";
import { useState, useMemo, useEffect, useRef } from "react";
import LoadingSpinner from "../../components/LoadingSpinner";
import { PaginationControls } from "../../components/PaginationControls";

import { useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { Link } from "react-router-dom";
import { useFetchStockReturns, useFetchStockTransfers, useFetchStockIns } from "../../hooks/useStockManagement";

const ExpiryAlertPage = () => {
  const queryClient = useQueryClient();
  const { data: warehouses } = useFetchWarehouses();
  const [daysAhead, setDaysAhead] = useState<number>(30);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | undefined>(undefined);
  const itemsPerPage = 11;
  const { data: alerts = [], isPending, isError, error } = useFetchExpiryAlerts(daysAhead);
  const prevDaysAheadRef = useRef<number>(daysAhead);

  // Invalidate and refetch when daysAhead changes (but not on initial mount)
  useEffect(() => {
    // Only refetch if daysAhead actually changed (not on initial mount)
    if (prevDaysAheadRef.current !== daysAhead) {
      console.log(`🔄 Days ahead changed from ${prevDaysAheadRef.current} to ${daysAhead}, invalidating and refetching query...`);
      // Invalidate all expiry-alerts queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["expiry-alerts"] });
      // Explicitly refetch the current query
      queryClient.refetchQueries({ queryKey: ["expiry-alerts", daysAhead] });
      prevDaysAheadRef.current = daysAhead;
      // Reset to page 1 when filter changes
      setCurrentPage(1);
    }
  }, [daysAhead, queryClient]);

  // Reset to page 1 when search query or warehouse filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedWarehouseId]);

  // Debug logging
  useEffect(() => {
    if (!isPending) {
      console.log("=== Expiry Alerts Data ===");
      console.log("Days Ahead:", daysAhead);
      console.log("Total Alerts:", alerts.length);
      console.log("Alerts Data:", JSON.stringify(alerts, null, 2));
    }
  }, [alerts, isPending, daysAhead]);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString || dateString === "" || dateString === "null" || dateString === "undefined") {
      return "N/A";
    }
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "N/A";
      }
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      console.warn("Error formatting date:", dateString, error);
      return "N/A";
    }
  };

  // Grouped alerts (kept for potential future use)
  // const groupedAlerts = useMemo(() => {
  //   const expired: ExpiryAlert[] = [];
  //   const expiringSoon: ExpiryAlert[] = [];
  //   const warning: ExpiryAlert[] = [];

  //   alerts.forEach((alert) => {
  //     if (alert.status === "expired") {
  //       expired.push(alert);
  //     } else if (alert.status === "expiring_soon") {
  //       expiringSoon.push(alert);
  //     } else {
  //       warning.push(alert);
  //     }
  //   });

  //   return { expired, expiringSoon, warning };
  // }, [alerts]);

  // ✅ STEP 1: Filter by Warehouse FIRST (before search)
  const filteredByWarehouse = useMemo(() => {
    if (!selectedWarehouseId) {
      return alerts; // Show all if no warehouse selected
    }
    
    // Filter to only include alerts from selected warehouse
    return alerts.filter((alert) => {
      const alertWarehouseId = alert.warehouse_id;
      return alertWarehouseId === selectedWarehouseId;
    });
  }, [alerts, selectedWarehouseId]);

  // ✅ STEP 2: Filter by Search Query (after warehouse filter)
  const filteredAlerts = useMemo(() => {
    if (!searchQuery.trim()) {
      return filteredByWarehouse;
    }
    const query = searchQuery.toLowerCase().trim();
    return filteredByWarehouse.filter((alert) => {
      const productMatch = alert.product_name?.toLowerCase().includes(query);
      const batchCodeMatch = alert.batch_code?.toLowerCase().includes(query);
      const warehouseMatch = alert.warehouse_name?.toLowerCase().includes(query);
      return productMatch || batchCodeMatch || warehouseMatch;
    });
  }, [filteredByWarehouse, searchQuery]);

  // ✅ Function to export to Excel
  const exportToExcel = () => {
    try {
      if (filteredAlerts.length === 0) {
        alert("No data to export");
        return;
      }

    // Prepare data for export with proper formatting
    const exportData = filteredAlerts.map((alert) => {
      const isExpired = alert.status === "expired";
      const isExpiringSoon = alert.status === "expiring_soon";
      
      const statusText = 
        isExpired ? "Expired" :
        isExpiringSoon ? "Expiring Soon" : "Warning";
      
      const daysText = isExpired 
        ? `${Math.abs(Math.round(alert.days_until_expiry))} days overdue`
        : `${Math.round(alert.days_until_expiry)} days`;

      return {
        "Status": statusText,
        "Product Name": alert.product_name || "N/A",
        "Batch Code": alert.batch_code || "N/A",
        "Warehouse": alert.warehouse_name || "N/A",
        "Expiry Date": formatDate(alert.expiry_date),
        "Days Remaining": daysText,
        "Stock Quantity": `${alert.quantity} unit`,
      };
    });

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expiry Alerts");

    // Set column widths for better readability
    const colWidths = [
      { wch: 15 }, // Status
      { wch: 30 }, // Product Name
      { wch: 20 }, // Batch Code
      { wch: 20 }, // Warehouse
      { wch: 20 }, // Expiry Date
      { wch: 18 }, // Days Remaining
      { wch: 15 }, // Stock Quantity
    ];
    ws['!cols'] = colWidths;

    // Generate filename with filter info
    const timestamp = new Date().toISOString().split("T")[0];
    let filename = `Expiry_Alerts_${daysAhead}days_${timestamp}`;
    
    if (selectedWarehouseId) {
      const warehouse = warehouses?.find(w => w.id === selectedWarehouseId);
      const warehouseName = warehouse?.name?.replace(/[^a-zA-Z0-9]/g, "_") || `Warehouse_${selectedWarehouseId}`;
      filename = `Expiry_Alerts_${warehouseName}_${daysAhead}days_${timestamp}`;
    }
    
    if (searchQuery.trim()) {
      const searchSlug = searchQuery.trim().replace(/[^a-zA-Z0-9]/g, "_").substring(0, 20);
      filename = `${filename}_${searchSlug}`;
    }

      // Export to Excel
      XLSX.writeFile(wb, `${filename}.xlsx`);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert("Failed to export to Excel. Please try again.");
    }
  };

  // ✅ Function to export to CSV
  const exportToCSV = () => {
    try {
      if (filteredAlerts.length === 0) {
        alert("No data to export");
        return;
      }

      // Prepare headers
      const headers = ["Status", "Product Name", "Batch Code", "Warehouse", "Expiry Date", "Days Remaining", "Stock Quantity"];
      
      // Prepare data rows
      const rows = filteredAlerts.map((alert) => {
        const isExpired = alert.status === "expired";
        const isExpiringSoon = alert.status === "expiring_soon";
        
        const statusText = 
          isExpired ? "Expired" :
          isExpiringSoon ? "Expiring Soon" : "Warning";
        
        const daysText = isExpired 
          ? `${Math.abs(Math.round(alert.days_until_expiry))} days overdue`
          : `${Math.round(alert.days_until_expiry)} days`;

        return [
          statusText,
          alert.product_name || "N/A",
          alert.batch_code || "N/A",
          alert.warehouse_name || "N/A",
          formatDate(alert.expiry_date),
          daysText,
          `${alert.quantity} unit`,
        ];
      });

      // Combine headers and rows
      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
      ].join("\n");

      // Create blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      // Generate filename with filter info
      const timestamp = new Date().toISOString().split("T")[0];
      let filename = `Expiry_Alerts_${daysAhead}days_${timestamp}`;
      
      if (selectedWarehouseId) {
        const warehouse = warehouses?.find(w => w.id === selectedWarehouseId);
        const warehouseName = warehouse?.name?.replace(/[^a-zA-Z0-9]/g, "_") || `Warehouse_${selectedWarehouseId}`;
        filename = `Expiry_Alerts_${warehouseName}_${daysAhead}days_${timestamp}`;
      }
      
      if (searchQuery.trim()) {
        const searchSlug = searchQuery.trim().replace(/[^a-zA-Z0-9]/g, "_").substring(0, 20);
        filename = `${filename}_${searchSlug}`;
      }

      link.setAttribute("href", url);
      link.setAttribute("download", `${filename}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exporting to CSV:", error);
      alert("Failed to export to CSV. Please try again.");
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredAlerts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAlerts = filteredAlerts.slice(startIndex, endIndex);

  // Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // Debug: Log button render status
  useEffect(() => {
    console.log("🔍 Expiry Alert Debug:", {
      filteredAlertsLength: filteredAlerts.length,
      hasExportFunctions: typeof exportToExcel === 'function' && typeof exportToCSV === 'function',
      selectedWarehouseId,
      daysAhead
    });
  }, [filteredAlerts.length, selectedWarehouseId, daysAhead]);

  // ✅ Fetch stock returns, stock transfers, dan stock ins untuk mapping batch code ke ID
  const { data: stockReturnsData } = useFetchStockReturns(1, 500, ""); // Fetch untuk mapping
  const { data: stockTransfersData } = useFetchStockTransfers(1, 500, ""); // Fetch untuk mapping
  const { data: stockInsData } = useFetchStockIns(1, 500, ""); // Fetch untuk mapping
  
  const stockReturns = stockReturnsData?.data || [];
  const stockTransfers = stockTransfersData?.data || [];
  const stockIns = stockInsData?.data || [];
  
  // ✅ Buat mapping dari batch code ke ID
  const batchCodeToIdMap = useMemo(() => {
    const map = new Map<string, { type: 'stock-in' | 'stock-retur' | 'stock-transfer', id: number }>();
    
    // Map stock ins
    stockIns.forEach((stockIn: any) => {
      if (stockIn.code) {
        map.set(stockIn.code, { type: 'stock-in', id: stockIn.id });
      }
    });
    
    // Map stock returns
    stockReturns.forEach((stockReturn: any) => {
      if (stockReturn.code) {
        map.set(stockReturn.code, { type: 'stock-retur', id: stockReturn.id });
      }
    });
    
    // Map stock transfers
    stockTransfers.forEach((stockTransfer: any) => {
      if (stockTransfer.code) {
        map.set(stockTransfer.code, { type: 'stock-transfer', id: stockTransfer.id });
      }
    });
    
    return map;
  }, [stockIns, stockReturns, stockTransfers]);

  // ✅ Parse batch code untuk mendapatkan ID dan edit URL (dengan mapping)
  const parseBatchCode = (batchCode: string) => {
    if (!batchCode) return null;
    
    // ✅ Prioritas 1: Cek mapping langsung dari batch code
    if (batchCodeToIdMap.has(batchCode)) {
      const mapped = batchCodeToIdMap.get(batchCode)!;
      return {
        type: mapped.type,
        id: mapped.id,
        editUrl: mapped.type === 'stock-in' 
          ? `/stock-management/stock-in/edit/${mapped.id}`
          : mapped.type === 'stock-retur'
          ? `/stock-management/stock-retur/edit/${mapped.id}`
          : `/stock-management/stock-transfer/edit/${mapped.id}`
      };
    }
    
    // ✅ Prioritas 2: Fallback ke parsing batch code (untuk format lama atau edge cases)
    const stockInMatch = batchCode.match(/STK-IN-(\d+)(?:-(\d+))?$/);
    if (stockInMatch) {
      const id = stockInMatch[2] || stockInMatch[1];
      return {
        type: 'stock-in',
        id: parseInt(id),
        editUrl: `/stock-management/stock-in/edit/${id}`
      };
    }
    
    const stockReturMatch = batchCode.match(/STK-RET-(\d+)(?:-(\d+))?$/);
    if (stockReturMatch) {
      const id = stockReturMatch[2] || stockReturMatch[1];
      return {
        type: 'stock-retur',
        id: parseInt(id),
        editUrl: `/stock-management/stock-retur/edit/${id}`
      };
    }
    
    const stockTransferMatch = batchCode.match(/(?:STK-)?TRF-(\d+)(?:-(\d+))?$/);
    if (stockTransferMatch) {
      const id = stockTransferMatch[2] || stockTransferMatch[1];
      return {
        type: 'stock-transfer',
        id: parseInt(id),
        editUrl: `/stock-management/stock-transfer/edit/${id}`
      };
    }
    
    return null;
  };

  if (isPending) {
    return <LoadingSpinner />;
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-red-800 font-bold text-xl mb-2">Error Loading Expiry Alerts</h2>
          <p className="text-red-600 mb-4">
            {error?.message || "Failed to load expiry alerts. Please try again."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
        <div
          id="Top-Bar"
          className="flex items-center w-full gap-6 mt-[30px] mb-6"
        >
          <div className="flex items-center gap-6 h-[92px] bg-white w-full rounded-3xl p-[18px]">
            <div className="flex flex-col gap-[6px] w-full">
              <h1 className="font-bold text-2xl">Expiry Alert</h1>
              <p className="font-medium text-base text-monday-gray">
                Monitor products that are expiring or have expired
              </p>
            </div>
            <div className="flex items-center flex-shrink-0 gap-4">
              {/* Search Input */}
              <div className="relative flex-shrink-0">
                {isSearchOpen || searchQuery ? (
                  <div className="flex items-center bg-white border border-monday-border rounded-full pl-5 pr-4 py-3 max-w-[380px] w-[380px] shadow-sm transition-all duration-300 focus-within:border-gray-500 focus-within:shadow-md">
                    <img
                      src="/assets/images/icons/search-normal-black.svg"
                      className="size-5 flex-shrink-0 mr-3 opacity-70"
                      alt="search icon"
                    />
                    <input
                      type="text"
                      placeholder="Search expiry alerts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-transparent border-none outline-none flex-1 text-base font-normal placeholder:text-gray-500 placeholder:font-normal min-w-0"
                      autoFocus={isSearchOpen && !searchQuery}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          setSearchQuery("");
                          setIsSearchOpen(false);
                        }
                      }}
                      onBlur={() => {
                        if (!searchQuery) {
                          setIsSearchOpen(false);
                        }
                      }}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setSearchQuery("");
                          setIsSearchOpen(false);
                        }}
                        className="flex-shrink-0 flex items-center justify-center size-6 rounded-full hover:bg-gray-100 transition-colors ml-2 p-1"
                        title="Clear search"
                      >
                        <img
                          src="/assets/images/icons/close-circle-black.svg"
                          className="size-4"
                          alt="close"
                        />
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsSearchOpen(true)}
                    className="flex size-14 rounded-full bg-monday-gray-background items-center justify-center overflow-hidden hover:bg-monday-gray transition-colors cursor-pointer"
                    title="Search expiry alerts"
                  >
                    <img
                      src="/assets/images/icons/search-normal-black.svg"
                      className="size-6"
                      alt="search icon"
                    />
                  </button>
                )}
              </div>
            </div>
          </div>
          <UserProfileCard />
        </div>
        <main className="flex flex-col gap-6 flex-1">
          <section
            id="Expiry-Alerts"
            className="flex flex-col gap-6 flex-1 rounded-3xl p-[18px] px-0 bg-white"
            style={{ overflow: 'visible', overflowX: 'visible' }}
          >
            <div
              id="Header"
              className="flex items-center justify-between px-[18px] gap-4"
              style={{ overflow: 'visible', width: '100%', position: 'relative', minHeight: '80px' }}
            >
              <div className="flex flex-col gap-[6px] flex-1 min-w-0" style={{ maxWidth: 'calc(100% - 700px)' }}>
                <p className="flex items-center gap-[6px]">
                  <img
                    src="/assets/images/icons/Checklist-green-circle.svg"
                    className="size-6 flex shrink-0"
                    alt="icon"
                  />
                  <span className="font-semibold text-2xl">
                    {filteredAlerts.length} Products Need Attention
                  </span>
                </p>
                <p className="font-semibold text-lg text-monday-gray">
                  Products that have expired or will expire within {daysAhead} days
                  {selectedWarehouseId && ` (Filtered by ${warehouses?.find(w => w.id === selectedWarehouseId)?.name || "Warehouse"})`}
                  {searchQuery && ` (${filteredAlerts.length} of ${filteredByWarehouse.length} shown)`}
                </p>
              </div>
              {/* Warehouse Filter, Alert Filter, and Download Buttons */}
              <div className="flex items-center gap-3 flex-shrink-0" style={{ overflow: 'visible', flexWrap: 'nowrap', minWidth: 'fit-content', maxWidth: 'none', paddingRight: '0' }}>
                {/* Warehouse Filter */}
                <span className="text-sm font-semibold text-gray-700 whitespace-nowrap" style={{ display: 'inline-block', lineHeight: '1.5' }}>
                  Filter Warehouse:
                </span>
                <label className="relative rounded-xl border-[1.5px] border-monday-border focus-within:border-monday-black transition-300 bg-white shadow-sm hover:shadow-md min-w-[200px]">
                  <select
                    value={selectedWarehouseId || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSelectedWarehouseId(value ? parseInt(value) : undefined);
                      setCurrentPage(1); // Reset to page 1 when filter changes
                    }}
                    className="appearance-none w-full px-4 py-2.5 pr-10 font-semibold text-sm outline-none bg-transparent cursor-pointer"
                  >
                    <option value="">All Warehouses</option>
                    {warehouses?.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </option>
                    ))}
                  </select>
                  <img
                    src="/assets/images/icons/arrow-down-grey.svg"
                    className="absolute top-1/2 right-3 -translate-y-1/2 size-4 pointer-events-none"
                    alt="dropdown arrow"
                  />
                </label>

              {/* Alert Filter */}
                <span className="text-sm font-semibold text-gray-700 whitespace-nowrap" style={{ display: 'inline-block', lineHeight: '1.5' }}>
                  Alert for:
                </span>
                <label className="relative rounded-xl border-[1.5px] border-monday-border focus-within:border-monday-black transition-300 bg-white shadow-sm hover:shadow-md min-w-[200px]">
                  <select
                    value={daysAhead}
                    onChange={(e) => {
                      const newDaysAhead = parseInt(e.target.value);
                      console.log(`🔄 Changing filter from ${daysAhead} to ${newDaysAhead} days`);
                      setDaysAhead(newDaysAhead);
                    }}
                    className="appearance-none w-full px-4 py-2.5 pr-10 font-semibold text-sm outline-none bg-transparent cursor-pointer"
                  >
                    <option value="7">7 days ahead</option>
                    <option value="14">14 days ahead</option>
                    <option value="30">30 days ahead</option>
                    <option value="60">60 days ahead</option>
                    <option value="90">90 days ahead</option>
                  </select>
                  <img
                    src="/assets/images/icons/arrow-down-grey.svg"
                    className="absolute top-1/2 right-3 -translate-y-1/2 size-4 pointer-events-none"
                    alt="dropdown arrow"
                  />
                </label>

                {/* Download Buttons - Always Visible */}
                <div 
                  className="flex items-center gap-2 flex-shrink-0" 
                  style={{ 
                    display: 'flex', 
                    visibility: 'visible',
                    opacity: 1,
                    position: 'relative',
                    zIndex: 10,
                    flexShrink: 0,
                    marginLeft: '12px',
                    padding: '0',
                    backgroundColor: 'transparent'
                  }}
                >
                  <button
                    type="button"
                    onClick={exportToExcel}
                    disabled={filteredAlerts.length === 0}
                    style={{ 
                      display: 'flex', 
                      visibility: 'visible',
                      opacity: filteredAlerts.length > 0 ? 1 : 0.5,
                      width: '56px',
                      height: '56px',
                      minWidth: '56px',
                      minHeight: '56px',
                      flexShrink: 0,
                      border: 'none',
                      outline: 'none',
                      backgroundColor: filteredAlerts.length > 0 ? '#16a34a' : '#9ca3af'
                    }}
                    className="flex rounded-full items-center justify-center transition-colors shadow-sm hover:shadow-md cursor-pointer"
                    title={filteredAlerts.length > 0 ? "Download as Excel" : "No data to export"}
                  >
                    <img
                      src="/assets/images/icons/document-text-grey.svg"
                      alt="download excel icon"
                      style={{ filter: 'brightness(0) invert(1)', display: 'block', width: '24px', height: '24px' }}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={exportToCSV}
                    disabled={filteredAlerts.length === 0}
                    style={{ 
                      display: 'flex', 
                      visibility: 'visible',
                      opacity: filteredAlerts.length > 0 ? 1 : 0.5,
                      width: '56px',
                      height: '56px',
                      minWidth: '56px',
                      minHeight: '56px',
                      flexShrink: 0,
                      border: 'none',
                      outline: 'none',
                      backgroundColor: filteredAlerts.length > 0 ? '#2563eb' : '#9ca3af'
                    }}
                    className="flex rounded-full items-center justify-center transition-colors shadow-sm hover:shadow-md cursor-pointer"
                    title={filteredAlerts.length > 0 ? "Download as CSV" : "No data to export"}
                  >
                    <img
                      src="/assets/images/icons/document-text-grey.svg"
                      alt="download csv icon"
                      style={{ filter: 'brightness(0) invert(1)', display: 'block', width: '24px', height: '24px' }}
                    />
                  </button>
                </div>
              </div>
            </div>
            <hr className="border-monday-border" />
            <div id="Alerts-List" className="flex flex-col px-4 gap-6 flex-1 min-h-0">
              {filteredAlerts.length > 0 ? (
                <>
                  <div className="overflow-x-auto flex-1">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-monday-border bg-monday-gray-background">
                          <th className="text-left py-4 px-6 font-semibold text-sm">Status</th>
                          <th className="text-left py-4 px-6 font-semibold text-sm">Product</th>
                          <th className="text-left py-4 px-6 font-semibold text-sm">Batch Code</th>
                          <th className="text-left py-4 px-6 font-semibold text-sm">Warehouse</th>
                          <th className="text-left py-4 px-6 font-semibold text-sm">Expiry Date</th>
                          <th className="text-left py-4 px-6 font-semibold text-sm">Days Remaining</th>
                          <th className="text-left py-4 px-6 font-semibold text-sm">Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                        {paginatedAlerts.map((alert) => {
                        const isExpired = alert.status === "expired";
                        const isExpiringSoon = alert.status === "expiring_soon";
                        
                        const statusText = 
                          isExpired ? "Expired" :
                          isExpiringSoon ? "Expiring Soon" : "Warning";
                        const daysText = isExpired 
                          ? `${Math.abs(Math.round(alert.days_until_expiry))} days overdue`
                          : `${Math.round(alert.days_until_expiry)} days`;

                        // ✅ Parse batch code untuk mendapatkan edit URL
                        const batchInfo = parseBatchCode(alert.batch_code || "");

                        return (
                          <tr
                            key={`${alert.product_id}-${alert.warehouse_id}-${alert.batch_code || 'empty'}-${alert.expiry_date}-${alert.quantity}`}
                            className="border-b border-monday-border hover:bg-gray-50 transition-colors"
                          >
                              <td className="py-4 px-6">
                              <div className="flex items-center gap-2">
                                <div 
                                  className={`size-3 rounded-full ${
                                    isExpired ? "bg-red-600" :
                                    isExpiringSoon ? "bg-orange-500" : "bg-yellow-400"
                                  }`}
                                  style={{
                                    backgroundColor: isExpired ? "#dc2626" : isExpiringSoon ? "#f97316" : "#facc15",
                                    width: "12px",
                                    height: "12px",
                                    borderRadius: "50%"
                                  }}
                                ></div>
                                <span 
                                  className={`font-semibold text-sm px-2.5 py-1 rounded-md ${
                                    isExpired 
                                      ? "text-red-700 bg-red-50 border border-red-200" :
                                      isExpiringSoon 
                                      ? "text-orange-700 bg-orange-50 border border-orange-200" 
                                      : "text-yellow-700 bg-yellow-50 border border-yellow-200"
                                  }`}
                                  style={{
                                    color: isExpired ? "#b91c1c" : isExpiringSoon ? "#c2410c" : "#a16207",
                                    backgroundColor: isExpired ? "#fef2f2" : isExpiringSoon ? "#fff7ed" : "#fefce8",
                                    borderColor: isExpired ? "#fecaca" : isExpiringSoon ? "#fed7aa" : "#fef08a",
                                    borderWidth: "1px",
                                    borderStyle: "solid",
                                    padding: "4px 10px",
                                    borderRadius: "6px",
                                    display: "inline-block"
                                  }}
                                >
                                  {statusText}
                                </span>
                              </div>
                            </td>
                              <td className="py-4 px-6">
                              {batchInfo ? (
                                <Link
                                  to={batchInfo.editUrl}
                                  className="font-semibold text-base text-gray-900 hover:text-monday-blue hover:underline transition-colors cursor-pointer"
                                  title={`Click to edit ${batchInfo.type === 'stock-in' ? 'Stock In' : batchInfo.type === 'stock-retur' ? 'Stock Return' : 'Stock Transfer'}`}
                                >
                                  {alert.product_name}
                                </Link>
                              ) : (
                                <p className="font-semibold text-base text-gray-900">
                                  {alert.product_name}
                                </p>
                              )}
                            </td>
                              <td className="py-4 px-6">
                              <p className="font-medium text-sm text-gray-700">
                                {alert.batch_code || ""}
                              </p>
                            </td>
                              <td className="py-4 px-6">
                              <p className="font-medium text-sm text-gray-700">
                                {alert.warehouse_name || "N/A"}
                              </p>
                            </td>
                              <td className="py-4 px-6">
                              <p 
                                className={`font-semibold text-sm ${
                                  isExpired ? "text-red-700" :
                                  isExpiringSoon ? "text-orange-700" : "text-yellow-700"
                                }`}
                                style={{
                                  color: isExpired ? "#b91c1c" : isExpiringSoon ? "#c2410c" : "#a16207"
                                }}
                              >
                                {formatDate(alert.expiry_date)}
                              </p>
                            </td>
                              <td className="py-4 px-6">
                              <p 
                                className={`font-bold text-sm ${
                                  isExpired ? "text-red-700" :
                                  isExpiringSoon ? "text-orange-700" : "text-yellow-700"
                                }`}
                                style={{
                                  color: isExpired ? "#b91c1c" : isExpiringSoon ? "#c2410c" : "#a16207"
                                }}
                              >
                                {daysText}
                              </p>
                            </td>
                              <td className="py-4 px-6">
                              <p className="font-semibold text-base text-gray-900">
                                {alert.quantity} unit
                              </p>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                    {totalPages > 1 && (
                      <PaginationControls
                        currentPage={currentPage}
                        lastPage={totalPages}
                        onPageChange={setCurrentPage}
                        from={startIndex + 1}
                        to={Math.min(endIndex, filteredAlerts.length)}
                        total={filteredAlerts.length}
                      />
                    )}
                </>
              ) : searchQuery.trim() ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <img
                    src="/assets/images/icons/search-normal-black.svg"
                    className="size-16 mb-4 opacity-50"
                    alt="search icon"
                  />
                  <p className="font-semibold text-xl text-gray-500 mb-2">
                    No Results Found
                  </p>
                  <p className="font-medium text-base text-monday-gray">
                    No expiry alerts found matching "{searchQuery}"
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setIsSearchOpen(false);
                    }}
                    className="btn btn-primary font-semibold mt-4"
                  >
                    Clear Search
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <img
                    src="/assets/images/icons/Checklist-green-circle.svg"
                    className="size-16 mb-4 opacity-50"
                    alt="empty icon"
                  />
                  <p className="font-semibold text-xl text-gray-500 mb-2">
                    No Alerts
                  </p>
                  <p className="font-medium text-base text-monday-gray">
                    No products will expire within {daysAhead} days ahead.
                  </p>
                </div>
              )}
            </div>
          </section>
        </main>
    </>
  );
};

export default ExpiryAlertPage;

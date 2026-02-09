import { Link } from "react-router-dom";
import { useFetchStockReturns, useDeleteStockReturn } from "../../hooks/useStockManagement";
import UserProfileCard from "../../components/UserProfileCard";
import { useState, useCallback, useEffect } from "react";
import LoadingSpinner from "../../components/LoadingSpinner";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal";
import SuccessNotification from "../../components/SuccessNotification";
import { PaginationControls } from "../../components/PaginationControls";
import { StockReturn } from "../../types/types";
import { useDebounce } from "../../hooks/useDebounce";

const StockReturnList = () => {
  // ✅ Server-side pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [perPage, setPerPage] = useState<number>(10);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  
  // ✅ Debounce search query (500ms delay)
  const debouncedSearch = useDebounce(searchQuery, 500);
  
  // ✅ Fetch data dengan server-side pagination
  const { data, isPending, isFetching } = useFetchStockReturns(currentPage, perPage, debouncedSearch);
  
  const stockReturns = data?.data || [];
  const paginationMeta = data?.meta || {
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: perPage,
    from: 0,
    to: 0,
  };
  
  const { mutate: deleteStockReturn, isPending: isDeleting } = useDeleteStockReturn();
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    stockReturnId: number | null;
    stockReturnName: string;
  }>({
    isOpen: false,
    stockReturnId: null,
    stockReturnName: "",
  });
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [deletedStockReturnName, setDeletedStockReturnName] = useState("");

  useEffect(() => {
    if (showSuccessNotification) {
      const timer = setTimeout(() => {
        setShowSuccessNotification(false);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [showSuccessNotification]);

  // ✅ Reset to page 1 when search query changes (debounced)
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  // ✅ Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (paginationMeta.last_page > 0 && currentPage > paginationMeta.last_page) {
      setCurrentPage(1);
    }
  }, [paginationMeta.last_page, currentPage]);

  const handleDeleteClick = useCallback((id: number, name: string) => {
    setDeleteModal({
      isOpen: true,
      stockReturnId: id,
      stockReturnName: name,
    });
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (deleteModal.stockReturnId) {
      const stockReturnNameToDelete = deleteModal.stockReturnName;
      deleteStockReturn(deleteModal.stockReturnId, {
        onSuccess: () => {
          // ✅ Tampilkan notifikasi langsung tanpa delay
          setDeletedStockReturnName(stockReturnNameToDelete);
          setShowSuccessNotification(true);
        },
      });
      setDeleteModal({
        isOpen: false,
        stockReturnId: null,
        stockReturnName: "",
      });
    }
  }, [deleteModal.stockReturnId, deleteModal.stockReturnName, deleteStockReturn]);

  const handleCloseModal = useCallback(() => {
    setDeleteModal({
      isOpen: false,
      stockReturnId: null,
      stockReturnName: "",
    });
  }, []);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString || dateString === "" || dateString === "null" || dateString === "undefined") {
      return "N/A";
    }
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "N/A";
      }
      return date.toLocaleDateString("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      console.warn("Error formatting date:", dateString, error);
      return "N/A";
    }
  };

  // ✅ Format expiry dates dari products (ambil yang paling awal jika ada multiple)
  const formatExpiryDate = (products: any[] | undefined) => {
    if (!products || products.length === 0) return "N/A";
    
    // Ambil semua expiry_date yang valid
    const expiryDates = products
      .map(p => p.expiry_date)
      .filter((date): date is string => !!date && date !== "" && date !== "null" && date !== "undefined");
    
    if (expiryDates.length === 0) return "N/A";
    
    // Ambil yang paling awal (untuk FEFO tracking)
    const sortedDates = expiryDates
      .map(date => new Date(date))
      .filter(date => !isNaN(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());
    
    if (sortedDates.length === 0) return "N/A";
    
    return formatDate(sortedDates[0].toISOString());
  };

  // ✅ Show loading spinner only on initial load
  if (isPending && !data) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <div
        id="Top-Bar"
        className="flex items-center w-full gap-6 mt-[30px] mb-6"
      >
            <div className="flex items-center gap-6 h-[92px] bg-white w-full rounded-3xl p-[18px]">
              <div className="flex flex-col gap-[6px] w-full">
                <h1 className="font-bold text-2xl">Stock Return</h1>
                <p className="font-medium text-base text-monday-gray">
                  Manage products returned to warehouse
                </p>
              </div>
              <div className="flex items-center flex-shrink-0 gap-4">
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
                        placeholder="Search Stock Return..."
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
                      title="Search Stock Returns"
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
              id="Stock-Returns"
              className="flex flex-col gap-6 flex-1 rounded-3xl p-[18px] px-0 bg-white"
            >
              <div
                id="Header"
                className="flex items-center justify-between px-[18px]"
              >
                <div className="flex flex-col gap-[6px]">
                  <p className="flex items-center gap-[6px]">
                    <img
                      src="/assets/images/icons/box-black.svg"
                      className="size-6 flex shrink-0"
                      alt="icon"
                    />
                    <span className="font-semibold text-2xl">
                      {isPending && !data
                        ? "..."
                        : debouncedSearch.trim()
                        ? `${paginationMeta.total || 0} Stock Return Found`
                        : `${paginationMeta.total || 0} Total Stock Return`}
                    </span>
                  </p>
                  <p className="font-semibold text-lg text-monday-gray">
                    List of all products returned to warehouse
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {/* ✅ Dropdown "Items per page" */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600 whitespace-nowrap">
                      Items per page:
                    </span>
                    <select
                      value={perPage}
                      onChange={(e) => {
                        setPerPage(Number(e.target.value));
                        setCurrentPage(1); // ✅ Reset ke page 1 saat ubah items per page
                      }}
                      disabled={isFetching}
                      className="px-3 py-2 border border-monday-border rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-monday-blue focus:border-monday-blue cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                  <Link
                    to="/stock-management/stock-retur/add"
                    className="btn btn-primary font-semibold flex items-center justify-center"
                    title="Add Stock Return"
                  >
                    <img
                      src="/assets/images/icons/add-square-white.svg"
                      className="flex size-6 shrink-0"
                      alt="add icon"
                    />
                  </Link>
                </div>
              </div>
              <hr className="border-monday-border" />
              <div id="Stock-Return-List" className="flex flex-col px-4 gap-5 flex-1 min-h-0">
                {(isPending && !data) || isFetching ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-monday-border">
                          <th className="text-left py-4 px-4 font-semibold text-lg">Code</th>
                          <th className="text-left py-4 px-4 font-semibold text-lg">From</th>
                          <th className="text-left py-4 px-4 font-semibold text-lg">To Warehouse</th>
                          <th className="text-left py-4 px-4 font-semibold text-lg">Date</th>
                          <th className="text-left py-4 px-4 font-semibold text-lg">Expiry Date</th>
                          <th className="text-left py-4 px-4 font-semibold text-lg">Products</th>
                          <th className="text-left py-4 px-4 font-semibold text-lg">Total Quantity</th>
                          <th className="text-center py-4 px-4 font-semibold text-lg">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[1, 2, 3].map((i) => (
                          <tr key={i} className="border-b border-monday-border animate-pulse">
                            <td className="py-4 px-4">
                              <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="h-5 bg-gray-200 rounded w-1/2"></div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="h-5 bg-gray-200 rounded w-1/2"></div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="h-5 bg-gray-200 rounded w-1/2"></div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="h-5 bg-gray-200 rounded w-1/2"></div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="h-5 bg-gray-200 rounded w-1/2"></div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="h-5 bg-gray-200 rounded w-1/2"></div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center justify-center gap-2">
                                <div className="h-10 bg-gray-200 rounded w-[100px]"></div>
                                <div className="h-10 bg-gray-200 rounded w-[100px]"></div>
                              </div>
                            </td>
                          </tr>
                        ))}
                        </tbody>
                      </table>
                    </div>
                  ) : stockReturns && stockReturns.length > 0 ? (
                  <>
                    {/* Desktop Table View */}
                    <div className="overflow-x-auto flex-1 block">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b-2 border-monday-border bg-monday-gray-background">
                            <th className="text-left py-4 px-4 font-semibold text-lg">Code</th>
                            <th className="text-left py-4 px-4 font-semibold text-lg">From</th>
                            <th className="text-left py-4 px-4 font-semibold text-lg">To Warehouse</th>
                            <th className="text-left py-4 px-4 font-semibold text-lg">Date</th>
                            <th className="text-left py-4 px-4 font-semibold text-lg">Expiry Date</th>
                            <th className="text-left py-4 px-4 font-semibold text-lg">Products</th>
                            <th className="text-left py-4 px-4 font-semibold text-lg">Total Quantity</th>
                            <th className="text-center py-4 px-4 font-semibold text-lg">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stockReturns.map((stockReturn: StockReturn) => {
                            const stockReturnId = stockReturn.id;
                            const products = stockReturn.stock_return_products || [];
                            const totalQty = stockReturn.total_quantity || 
                              stockReturn.stock_return_products?.reduce((sum, srp) => sum + (srp.quantity || 0), 0) || 0;
                            
                            // Prepare data for list display - ensure we have valid product data
                            const productsData = products
                              .filter((srp) => srp && (srp.product_id || srp.product)) // Filter out invalid entries
                              .map((srp) => {
                                // Try multiple ways to get product name
                                const productName = srp.product?.name || 
                                                  (srp.product_id ? `Product ID: ${srp.product_id}` : 'Unknown Product');
                                const quantity = srp.quantity || 0;
                                return {
                                  name: productName,
                                  quantity: quantity,
                                  product_id: srp.product_id || 0,
                                };
                              });
                            
                            return (
                              <tr
                                key={stockReturnId}
                                className="border-b border-monday-border hover:bg-gray-50 transition-colors"
                              >
                                <td className="py-4 px-4">
                                  <p className="font-semibold text-lg text-gray-900">
                                    {stockReturn.code || `#${stockReturn.id}`}
                                  </p>
                                </td>
                                <td className="py-4 px-4">
                                  <div className="flex flex-col gap-1">
                                    <p className="font-medium text-base text-gray-700">
                                      {(() => {
                                        // ✅ PERBAIKAN: Pastikan source_type ter-set dengan benar
                                        // Cek kedua ID untuk menentukan source_type dengan lebih akurat
                                        let sourceType: "warehouse" | "vending_machine";
                                        if (stockReturn.source_type) {
                                          sourceType = stockReturn.source_type;
                                        } else {
                                          const hasValidVendingMachineId = stockReturn.from_vending_machine_id != null && stockReturn.from_vending_machine_id > 0;
                                          const hasValidWarehouseId = stockReturn.from_warehouse_id != null && stockReturn.from_warehouse_id > 0;
                                          
                                          if (hasValidVendingMachineId) {
                                            sourceType = "vending_machine";
                                          } else if (hasValidWarehouseId) {
                                            sourceType = "warehouse";
                                          } else {
                                            sourceType = "warehouse"; // Default fallback
                                          }
                                        }
                                        
                                        if (sourceType === "vending_machine") {
                                          // ✅ Prioritaskan name dari relationship
                                          if (stockReturn.from_vending_machine?.name) {
                                            return stockReturn.from_vending_machine.name;
                                          }
                                          // ✅ Fallback ke ID jika valid (bukan null, undefined, atau 0)
                                          const vmId = stockReturn.from_vending_machine_id;
                                          if (vmId != null && vmId > 0) {
                                            return `Vending Machine #${vmId}`;
                                          }
                                          // ✅ Terakhir "N/A"
                                          return "N/A";
                                        } else {
                                          // ✅ Prioritaskan name dari relationship
                                          if (stockReturn.from_warehouse?.name) {
                                            return stockReturn.from_warehouse.name;
                                          }
                                          // ✅ Fallback ke ID jika valid (bukan null, undefined, atau 0)
                                          const whId = stockReturn.from_warehouse_id;
                                          if (whId != null && whId > 0) {
                                            return `Warehouse #${whId}`;
                                          }
                                          // ✅ Terakhir "N/A"
                                          return "N/A";
                                        }
                                      })()}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {stockReturn.source_type === "vending_machine" ? "(Vending Machine)" : "(Warehouse)"}
                                    </p>
                                  </div>
                                </td>
                                <td className="py-4 px-4">
                                  <p className="font-medium text-base text-gray-700">
                                    {stockReturn.to_warehouse?.name || "N/A"}
                                  </p>
                                </td>
                                <td className="py-4 px-4">
                                  <p className="font-medium text-base text-gray-700">
                                    {formatDate(stockReturn.date)}
                                  </p>
                                </td>
                                <td className="py-4 px-4">
                                  <p className="font-medium text-base text-gray-700">
                                    {formatExpiryDate(products)}
                                  </p>
                                </td>
                                <td className="py-4 px-4">
                                  {productsData.length > 0 ? (
                                    <ul className="list-disc list-inside space-y-1">
                                      {productsData.map((product, idx) => (
                                        <li key={idx} className="font-medium text-base text-gray-700">
                                          {product.name}
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="font-medium text-base text-gray-500 italic">
                                      No products found
                                    </p>
                                  )}
                                </td>
                                <td className="py-4 px-4">
                                  <p className="font-semibold text-base text-gray-900">
                                    {totalQty} unit
                                  </p>
                                </td>
                                <td className="py-4 px-4">
                                  <div className="flex items-center justify-center gap-2">
                                    <Link
                                      to={`/stock-management/stock-retur/edit/${stockReturnId}`}
                                      className="btn btn-black font-semibold text-sm py-2 px-3 transition-all flex items-center justify-center"
                                      style={{ border: "2px solid transparent" }}
                                      title="Edit"
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = "#9ca3af";
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = "transparent";
                                      }}
                                    >
                                      <img
                                        src="/assets/images/icons/edit-white.svg"
                                        className="flex size-4 shrink-0"
                                        alt="edit icon"
                                      />
                                    </Link>
                                    <button
                                      onClick={() =>
                                        handleDeleteClick(
                                          stockReturnId,
                                          stockReturn.code || `Stock Return #${stockReturn.id}`
                                        )
                                      }
                                      disabled={isDeleting}
                                      className="btn btn-red font-semibold text-sm py-2 px-3 transition-all flex items-center justify-center"
                                      style={{ border: "2px solid transparent" }}
                                      title="Delete"
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = "#800000";
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = "transparent";
                                      }}
                                    >
                                      <i
                                        className="fa fa-trash text-white text-sm"
                                        aria-hidden="true"
                                      ></i>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Mobile/Tablet Card View */}
                    <div className="md:hidden flex flex-col gap-4">
                      {stockReturns.map((stockReturn: StockReturn) => {
                        const stockReturnId = stockReturn.id;
                        const products = stockReturn.stock_return_products || [];
                        const totalQty = stockReturn.total_quantity || 
                          stockReturn.stock_return_products?.reduce((sum, srp) => sum + (srp.quantity || 0), 0) || 0;
                        
                        // Prepare data for list display
                        const productsData = products
                          .filter((srp) => srp && (srp.product_id || srp.product))
                          .map((srp) => {
                            const productName = srp.product?.name || 
                                              (srp.product_id ? `Product ID: ${srp.product_id}` : 'Unknown Product');
                            const quantity = srp.quantity || 0;
                            return {
                              name: productName,
                              quantity: quantity,
                            };
                          });
                        
                        return (
                          <div
                            key={stockReturnId}
                            className="bg-white border border-monday-border rounded-2xl p-4 shadow-sm"
                          >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-3 pb-3 border-b border-monday-border">
                              <div className="flex-1">
                                <p className="font-bold text-base text-gray-900 mb-1">
                                  {stockReturn.code || `#${stockReturn.id}`}
                                </p>
                                <div className="flex flex-col gap-1">
                                  <p className="font-medium text-sm text-gray-600">
                                    From: {(() => {
                                      // ✅ PERBAIKAN: Pastikan source_type ter-set dengan benar
                                      // Cek kedua ID untuk menentukan source_type dengan lebih akurat
                                      let sourceType: "warehouse" | "vending_machine";
                                      if (stockReturn.source_type) {
                                        sourceType = stockReturn.source_type;
                                      } else {
                                        const hasValidVendingMachineId = stockReturn.from_vending_machine_id != null && stockReturn.from_vending_machine_id > 0;
                                        const hasValidWarehouseId = stockReturn.from_warehouse_id != null && stockReturn.from_warehouse_id > 0;
                                        
                                        if (hasValidVendingMachineId) {
                                          sourceType = "vending_machine";
                                        } else if (hasValidWarehouseId) {
                                          sourceType = "warehouse";
                                        } else {
                                          sourceType = "warehouse"; // Default fallback
                                        }
                                      }
                                      
                                      if (sourceType === "vending_machine") {
                                        // ✅ Prioritaskan name dari relationship
                                        if (stockReturn.from_vending_machine?.name) {
                                          return `${stockReturn.from_vending_machine.name} (Vending Machine)`;
                                        }
                                        // ✅ Fallback ke ID jika valid (bukan null, undefined, atau 0)
                                        const vmId = stockReturn.from_vending_machine_id;
                                        if (vmId != null && vmId > 0) {
                                          return `Vending Machine #${vmId} (Vending Machine)`;
                                        }
                                        // ✅ Terakhir "N/A"
                                        return "N/A (Vending Machine)";
                                      } else {
                                        // ✅ Prioritaskan name dari relationship
                                        if (stockReturn.from_warehouse?.name) {
                                          return `${stockReturn.from_warehouse.name} (Warehouse)`;
                                        }
                                        // ✅ Fallback ke ID jika valid (bukan null, undefined, atau 0)
                                        const whId = stockReturn.from_warehouse_id;
                                        if (whId != null && whId > 0) {
                                          return `Warehouse #${whId} (Warehouse)`;
                                        }
                                        // ✅ Terakhir "N/A"
                                        return "N/A (Warehouse)";
                                      }
                                    })()}
                                  </p>
                                  <p className="font-medium text-sm text-gray-600">
                                    To: {stockReturn.to_warehouse?.name || "N/A"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Link
                                  to={`/stock-management/stock-retur/edit/${stockReturnId}`}
                                  className="btn btn-black font-semibold text-xs py-1.5 px-2.5 transition-all flex items-center justify-center"
                                  title="Edit"
                                >
                                  <img
                                    src="/assets/images/icons/edit-white.svg"
                                    className="flex size-3.5 shrink-0"
                                    alt="edit icon"
                                  />
                                </Link>
                                <button
                                  onClick={() =>
                                    handleDeleteClick(
                                      stockReturnId,
                                      stockReturn.code || `Stock Return #${stockReturn.id}`
                                    )
                                  }
                                  disabled={isDeleting}
                                  className="btn btn-red font-semibold text-xs py-1.5 px-2.5 transition-all flex items-center justify-center"
                                  title="Delete"
                                >
                                  <i
                                    className="fa fa-trash text-white text-xs"
                                    aria-hidden="true"
                                  ></i>
                                </button>
                              </div>
                            </div>
                            
                            {/* Date */}
                            <div className="mb-3">
                              <p className="text-xs font-medium text-gray-500 mb-1">Date</p>
                              <p className="font-medium text-sm text-gray-700">
                                {formatDate(stockReturn.date)}
                              </p>
                            </div>
                            
                            {/* Expiry Date */}
                            <div className="mb-3">
                              <p className="text-xs font-medium text-gray-500 mb-1">Expiry Date</p>
                              <p className="font-medium text-sm text-gray-700">
                                {formatExpiryDate(products)}
                              </p>
                            </div>
                            
                            {/* Products List */}
                            <div className="mb-3">
                              <p className="text-xs font-medium text-gray-500 mb-2">Products</p>
                              {productsData.length > 0 ? (
                                <div className="space-y-2">
                                  {productsData.map((product, idx) => (
                                    <div key={idx} className="bg-gray-50 rounded-lg p-2.5">
                                      <p className="font-semibold text-sm text-gray-900 mb-1">
                                        {product.name}
                                      </p>
                                      <p className="text-xs text-gray-600">
                                        Qty: {product.quantity} unit
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="font-medium text-sm text-gray-500">N/A</p>
                              )}
                            </div>
                            
                            {/* Total Quantity */}
                            <div className="pt-2 border-t border-monday-border">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-gray-500">Total Quantity</span>
                                <span className="font-bold text-sm text-gray-900">
                                  {totalQty} unit
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {paginationMeta.last_page > 1 && (
                      <PaginationControls
                        currentPage={currentPage}
                        lastPage={paginationMeta.last_page}
                        onPageChange={setCurrentPage}
                        isFetching={isFetching}
                        from={paginationMeta.from}
                        to={paginationMeta.to}
                        total={paginationMeta.total}
                      />
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <img
                      src="/assets/images/icons/box-grey.svg"
                      className="size-16 mb-4 opacity-50"
                      alt="empty icon"
                    />
                    <p className="font-semibold text-xl text-gray-500 mb-2">
                      No Stock Return Found
                    </p>
                    <p className="font-medium text-base text-monday-gray">
                      {searchQuery.trim()
                        ? "Try adjusting your search query."
                        : "Get started by adding your first Stock Return."}
                    </p>
                  </div>
                )}
              </div>
            </section>
          </main>

      <ConfirmDeleteModal
        isOpen={deleteModal.isOpen}
        onClose={handleCloseModal}
        onConfirm={handleConfirmDelete}
        title="Delete Stock Return"
        message="Are you sure you want to delete this Stock Return? This action cannot be undone."
        itemName={deleteModal.stockReturnName}
      />

      <SuccessNotification
        isOpen={showSuccessNotification}
        onClose={() => {
          setShowSuccessNotification(false);
        }}
        title="Success"
        message="Stock Return has been successfully deleted."
        itemName={deletedStockReturnName}
      />
    </>
  );
};

export default StockReturnList;



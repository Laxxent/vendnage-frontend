import { Link } from "react-router-dom";
import { useFetchStockTransfers, useDeleteStockTransfer } from "../../hooks/useStockManagement";
import UserProfileCard from "../../components/UserProfileCard";
import { useState, useCallback, useEffect } from "react";
import LoadingSpinner from "../../components/LoadingSpinner";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal";
import SuccessNotification from "../../components/SuccessNotification";
import { PaginationControls } from "../../components/PaginationControls";
import { StockTransfer } from "../../types/types";
import { useDebounce } from "../../hooks/useDebounce";

const StockTransferList = () => {
  // ✅ Server-side pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [perPage, setPerPage] = useState<number>(10);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  
  // ✅ Debounce search query (500ms delay)
  const debouncedSearch = useDebounce(searchQuery, 500);
  
  // ✅ Fetch data dengan server-side pagination
  const { data, isPending, isFetching } = useFetchStockTransfers(currentPage, perPage, debouncedSearch);
  
  const stockTransfers = data?.data || [];
  const paginationMeta = data?.meta || {
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: perPage,
    from: 0,
    to: 0,
  };
  
  const { mutate: deleteStockTransfer, isPending: isDeleting } = useDeleteStockTransfer();
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    transferId: number | null;
    transferName: string;
  }>({
    isOpen: false,
    transferId: null,
    transferName: "",
  });
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [deletedTransferName, setDeletedTransferName] = useState("");

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
      transferId: id,
      transferName: name,
    });
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (deleteModal.transferId) {
      const transferNameToDelete = deleteModal.transferName;
      deleteStockTransfer(deleteModal.transferId, {
        onSuccess: () => {
          // ✅ Tampilkan notifikasi langsung tanpa delay
          setDeletedTransferName(transferNameToDelete);
          setShowSuccessNotification(true);
        },
      });
      setDeleteModal({
        isOpen: false,
        transferId: null,
        transferName: "",
      });
    }
  }, [deleteModal.transferId, deleteModal.transferName, deleteStockTransfer]);

  const handleCloseModal = useCallback(() => {
    setDeleteModal({
      isOpen: false,
      transferId: null,
      transferName: "",
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

  // ✅ Format status dengan badge styling dan icon checkmark dalam circle (icon di kanan teks)
  const formatStatus = (status?: string) => {
    if (!status) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700" style={{ display: 'inline-flex', flexDirection: 'row', alignItems: 'center' }}>
          N/A
          <span 
            className="inline-flex items-center justify-center flex-shrink-0" 
            style={{ 
              width: '16px', 
              height: '16px', 
              backgroundColor: '#9ca3af',
              borderRadius: '50%',
              display: 'inline-flex',
              marginLeft: '4px'
            }}
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
              <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </span>
      );
    }
    
    const statusLower = status.toLowerCase();
    
    // ✅ Pending: Yellow circle dengan checkmark putih (icon di kanan teks)
    if (statusLower === "pending") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-yellow-50 text-yellow-700" style={{ display: 'inline-flex', flexDirection: 'row', alignItems: 'center' }}>
          Pending
          <span 
            className="inline-flex items-center justify-center flex-shrink-0" 
            style={{ 
              width: '16px', 
              height: '16px', 
              backgroundColor: '#facc15',
              borderRadius: '50%',
              display: 'inline-flex',
              marginLeft: '4px'
            }}
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
              <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </span>
      );
    }
    
    // ✅ Completed: Green circle dengan checkmark putih (icon di kanan teks)
    if (statusLower === "completed") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-green-50 text-green-700" style={{ display: 'inline-flex', flexDirection: 'row', alignItems: 'center' }}>
          Completed
          <span 
            className="inline-flex items-center justify-center flex-shrink-0" 
            style={{ 
              width: '16px', 
              height: '16px', 
              backgroundColor: '#22c55e',
              borderRadius: '50%',
              display: 'inline-flex',
              marginLeft: '4px'
            }}
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
              <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </span>
      );
    }
    
    // ✅ Cancelled: Red circle dengan close icon putih (icon di kanan teks)
    if (statusLower === "cancelled") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-red-100 text-red-700" style={{ display: 'inline-flex', flexDirection: 'row', alignItems: 'center' }}>
          Cancelled
          <span 
            className="inline-flex items-center justify-center flex-shrink-0" 
            style={{ 
              width: '16px', 
              height: '16px', 
              backgroundColor: '#ef4444',
              borderRadius: '50%',
              display: 'inline-flex',
              marginLeft: '4px'
            }}
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
              <line x1="18" y1="6" x2="6" y2="18" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="6" y1="6" x2="18" y2="18" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </span>
      );
    }
    
    // ✅ Default: Gray circle dengan checkmark putih (icon di kanan teks)
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700" style={{ display: 'inline-flex', flexDirection: 'row', alignItems: 'center' }}>
        {status}
        <span 
          className="inline-flex items-center justify-center flex-shrink-0" 
          style={{ 
            width: '16px', 
            height: '16px', 
            backgroundColor: '#9ca3af',
            borderRadius: '50%',
            display: 'inline-flex',
            marginLeft: '4px'
          }}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
            <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </span>
    );
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
                <h1 className="font-bold text-2xl">Stock Transfer</h1>
                <p className="font-medium text-base text-monday-gray">
                  Transfer products from warehouse to vending machine (automatic FEFO/FIFO)
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
                        placeholder="Search transfers..."
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
                      title="Search transfers"
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
              id="Stock-Transfers"
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
                      {(isPending && !data) || isFetching
                        ? "..."
                        : debouncedSearch.trim()
                        ? `${paginationMeta.total || 0} Transfers Found`
                        : `${paginationMeta.total || 0} Total Transfers`}
                    </span>
                  </p>
                  <p className="font-semibold text-lg text-monday-gray">
                    List of all transfers from warehouse to vending machine
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
                    to="/stock-management/stock-transfer/add"
                    className="btn btn-primary font-semibold flex items-center justify-center"
                    title="Add Transfer"
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
              <div id="Transfer-List" className="flex flex-col px-4 gap-5 flex-1 min-h-0">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-xl">All Transfers</p>
                </div>

                {(isPending && !data) || isFetching ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-monday-border">
                          <th className="text-left py-4 px-4 font-semibold text-lg">Code</th>
                          <th className="text-left py-4 px-4 font-semibold text-lg">From Warehouse</th>
                          <th className="text-left py-4 px-4 font-semibold text-lg">To Vending Machine</th>
                          <th className="text-left py-4 px-4 font-semibold text-lg">Date</th>
                          <th className="text-left py-4 px-4 font-semibold text-lg">Total Quantity</th>
                          <th className="text-left py-4 px-4 font-semibold text-lg">Status</th>
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
                              <div className="h-6 bg-gray-200 rounded-full w-20"></div>
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
                  ) : stockTransfers && stockTransfers.length > 0 ? (
                  <>
                    <div className="overflow-x-auto flex-1">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b-2 border-monday-border bg-monday-gray-background">
                            <th className="text-left py-4 px-4 font-semibold text-lg">Code</th>
                            <th className="text-left py-4 px-4 font-semibold text-lg">From Warehouse</th>
                            <th className="text-left py-4 px-4 font-semibold text-lg">To Vending Machine</th>
                            <th className="text-left py-4 px-4 font-semibold text-lg">Date</th>
                            <th className="text-left py-4 px-4 font-semibold text-lg">Total Quantity</th>
                            <th className="text-left py-4 px-4 font-semibold text-lg">Status</th>
                            <th className="text-center py-4 px-4 font-semibold text-lg">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stockTransfers.map((transfer: StockTransfer) => {
                          const transferId = transfer.id;
                          const totalQty = transfer.total_quantity || 
                            transfer.stock_transfer_products?.reduce((sum, stp) => sum + stp.quantity, 0) || 0;
                          return (
                            <tr
                              key={transferId}
                              className="border-b border-monday-border hover:bg-gray-50 transition-colors"
                            >
                              <td className="py-4 px-4">
                                <p className="font-semibold text-lg text-gray-900">
                                  {transfer.code || `#${transfer.id}`}
                                </p>
                              </td>
                              <td className="py-4 px-4">
                                <p className="font-medium text-base text-gray-700">
                                  {transfer.from_warehouse?.name || "N/A"}
                                </p>
                              </td>
                              <td className="py-4 px-4">
                                <p className="font-medium text-base text-gray-700">
                                  {transfer.to_vending_machine?.name || "N/A"}
                                </p>
                              </td>
                              <td className="py-4 px-4">
                                <p className="font-medium text-base text-gray-700">
                                  {formatDate(transfer.date)}
                                </p>
                              </td>
                              <td className="py-4 px-4">
                                <p className="font-semibold text-base text-gray-900">
                                  {totalQty} unit
                                </p>
                              </td>
                              <td className="py-4 px-4">
                                {formatStatus(transfer.status)}
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex items-center justify-center gap-2">
                                  <Link
                                    to={`/stock-management/stock-transfer/edit/${transferId}`}
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
                                        transferId,
                                        transfer.code || `Transfer #${transfer.id}`
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
                      {stockTransfers.map((transfer: StockTransfer) => {
                        const transferId = transfer.id;
                        const products = transfer.stock_transfer_products || [];
                        const totalQty = transfer.total_quantity || 
                          transfer.stock_transfer_products?.reduce((sum, stp) => sum + (stp.quantity || 0), 0) || 0;
                        
                        const productsData = products
                          .filter((stp) => stp && (stp.product_id || stp.product))
                          .map((stp) => {
                            const productName = stp.product?.name || 
                                              (stp.product_id ? `Product ID: ${stp.product_id}` : 'Unknown Product');
                            const quantity = stp.quantity || 0;
                            return {
                              name: productName,
                              quantity: quantity,
                              product_id: stp.product_id || 0,
                            };
                          });
                        
                        return (
                          <div
                            key={transferId}
                            className="bg-white border border-monday-border rounded-2xl p-4 shadow-sm"
                          >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-3 pb-3 border-b border-monday-border">
                              <div className="flex-1">
                                <p className="font-bold text-base text-gray-900 mb-1">
                                  {transfer.code || `#${transfer.id}`}
                                </p>
                                <p className="font-medium text-sm text-gray-600">
                                  From: {transfer.from_warehouse?.name || "N/A"}
                                </p>
                                <p className="font-medium text-sm text-gray-600">
                                  To: {transfer.to_vending_machine?.name || "N/A"}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Link
                                  to={`/stock-management/stock-transfer/edit/${transferId}`}
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
                                      transferId,
                                      transfer.code || `Transfer #${transfer.id}`
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
                                {formatDate(transfer.date)}
                              </p>
                            </div>
                            
                            {/* Status */}
                            <div className="mb-3">
                              <p className="text-xs font-medium text-gray-500 mb-1">Status</p>
                              <div>
                                {formatStatus(transfer.status)}
                              </div>
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
                                      <span className="text-gray-600 text-xs">
                                        Qty: {product.quantity} unit
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="font-medium text-sm text-gray-500">No products found</p>
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
                      No Transfers Found
                    </p>
                    <p className="font-medium text-base text-monday-gray">
                      {debouncedSearch.trim()
                        ? "Try adjusting your search query."
                        : "Get started by adding your first transfer."}
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
        title="Delete Stock Transfer"
        message="Are you sure you want to delete this transfer? This action cannot be undone."
        itemName={deleteModal.transferName}
      />

      <SuccessNotification
        isOpen={showSuccessNotification}
        onClose={() => {
          setShowSuccessNotification(false);
        }}
        title="Success"
        message="Stock transfer has been successfully deleted."
        itemName={deletedTransferName}
      />
    </>
  );
};

export default StockTransferList;

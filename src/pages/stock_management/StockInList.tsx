import { Link } from "react-router-dom";
import { useFetchStockIns, useDeleteStockIn } from "../../hooks/useStockManagement";
import UserProfileCard from "../../components/UserProfileCard";
import { useState, useCallback, useEffect } from "react";
import LoadingSpinner from "../../components/LoadingSpinner";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal";
import SuccessNotification from "../../components/SuccessNotification";
import { PaginationControls } from "../../components/PaginationControls";
import { StockIn } from "../../types/types";
import { useDebounce } from "../../hooks/useDebounce";

const StockInList = () => {
  // ✅ Server-side pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [perPage, setPerPage] = useState<number>(10);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  
  // ✅ Debounce search query (500ms delay)
  const debouncedSearch = useDebounce(searchQuery, 500);
  
  // ✅ Fetch data dengan server-side pagination
  const { data, isPending, isFetching } = useFetchStockIns(currentPage, perPage, debouncedSearch);
  
  const stockIns = data?.data || [];
  const paginationMeta = data?.meta || {
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: perPage,
    from: 0,
    to: 0,
  };
  
  const { mutate: deleteStockIn, isPending: isDeleting } = useDeleteStockIn();
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    stockInId: number | null;
    stockInName: string;
  }>({
    isOpen: false,
    stockInId: null,
    stockInName: "",
  });
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [deletedStockInName, setDeletedStockInName] = useState("");

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

  // ✅ FIX: Reset to page 1 if current page is out of bounds - hanya jika data sudah loaded dan tidak sedang fetching
  // Ini mencegah race condition saat user klik Next button
  useEffect(() => {
    // ✅ Hanya reset jika:
    // 1. Data sudah loaded (bukan initial state)
    // 2. Tidak sedang fetching
    // 3. last_page valid (> 0)
    // 4. currentPage benar-benar out of bounds
    if (
      !isFetching && 
      !isPending && 
      data && 
      paginationMeta.last_page > 0 && 
      currentPage > paginationMeta.last_page
    ) {
      setCurrentPage(1);
    }
  }, [paginationMeta.last_page, currentPage, isFetching, isPending, data]);

  const handleDeleteClick = useCallback((id: number, name: string) => {
    setDeleteModal({
      isOpen: true,
      stockInId: id,
      stockInName: name,
    });
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (deleteModal.stockInId) {
      const stockInNameToDelete = deleteModal.stockInName;
      deleteStockIn(deleteModal.stockInId, {
        onSuccess: () => {
          // ✅ Tampilkan notifikasi langsung tanpa delay
          setDeletedStockInName(stockInNameToDelete);
          setShowSuccessNotification(true);
        },
      });
      setDeleteModal({
        isOpen: false,
        stockInId: null,
        stockInName: "",
      });
    }
  }, [deleteModal.stockInId, deleteModal.stockInName, deleteStockIn]);

  const handleCloseModal = useCallback(() => {
    setDeleteModal({
      isOpen: false,
      stockInId: null,
      stockInName: "",
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
                <h1 className="font-bold text-2xl">Stock In</h1>
                <p className="font-medium text-base text-monday-gray">
                  Manage products entering the warehouse
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
                        placeholder="Search stock in..."
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
                      title="Search stock ins"
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
              id="Stock-Ins"
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
                        ? `${paginationMeta.total || 0} Stock In Found`
                        : `${paginationMeta.total || 0} Total Stock In`}
                    </span>
                  </p>
                  <p className="font-semibold text-lg text-monday-gray">
                    List of all products entering the warehouse
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
                    to="/stock-management/stock-in/add"
                    className="btn btn-primary font-semibold flex items-center justify-center"
                    title="Add Stock In"
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
              <div id="Stock-In-List" className="flex flex-col px-4 gap-5 flex-1 min-h-0">

                {(isPending && !data) || isFetching ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-monday-border">
                          <th className="text-left py-4 px-4 font-semibold text-lg">Code</th>
                          <th className="text-left py-4 px-4 font-semibold text-lg">Warehouse</th>
                          <th className="text-left py-4 px-4 font-semibold text-lg">Date In</th>
                          <th className="text-left py-4 px-4 font-semibold text-lg">Products</th>
                          <th className="text-left py-4 px-4 font-semibold text-lg">Price Global</th>
                          <th className="text-left py-4 px-4 font-semibold text-lg">Price (unit)</th>
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
                ) : stockIns && stockIns.length > 0 ? (
                  <>
                    {/* Desktop Table View */}
                    <div className="overflow-x-auto flex-1 block">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-monday-border bg-monday-gray-background">
                          <th className="text-left py-4 px-4 font-semibold text-lg">Code</th>
                          <th className="text-left py-4 px-4 font-semibold text-lg">Warehouse</th>
                          <th className="text-left py-4 px-4 font-semibold text-lg">Date In</th>
                          <th className="text-left py-4 px-4 font-semibold text-lg">Products</th>
                            <th className="text-left py-4 px-4 font-semibold text-lg">Price Global</th>
                            <th className="text-left py-4 px-4 font-semibold text-lg">Price (unit)</th>
                          <th className="text-left py-4 px-4 font-semibold text-lg">Total Quantity</th>
                          <th className="text-center py-4 px-4 font-semibold text-lg">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                          {stockIns.map((stockIn: StockIn) => {
                          const stockInId = stockIn.id;
                          const products = stockIn.stock_in_products || [];
                          
                          // Prepare data for list display
                          const productsData = products.map((sip) => ({
                            name: sip.product?.name || `Product ID: ${sip.product_id}`,
                            priceGlobal: sip.price || 0,
                            pricePerUnit: sip.price && sip.quantity 
                              ? Math.round((sip.price / sip.quantity))
                              : 0,
                            quantity: sip.quantity || 0,
                          }));
                          
                          return (
                            <tr
                              key={stockInId}
                              className="border-b border-monday-border hover:bg-gray-50 transition-colors"
                            >
                              <td className="py-4 px-4">
                                <p className="font-semibold text-lg text-gray-900">
                                  {stockIn.code || `#${stockIn.id}`}
                                </p>
                              </td>
                              <td className="py-4 px-4">
                                <p className="font-medium text-base text-gray-700">
                                  {stockIn.warehouse?.name || "N/A"}
                                </p>
                              </td>
                              <td className="py-4 px-4">
                                <p className="font-medium text-base text-gray-700">
                                  {formatDate(stockIn.date)}
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
                                  <p className="font-medium text-base text-gray-700">N/A</p>
                                )}
                              </td>
                              <td className="py-4 px-4">
                                {productsData.length > 0 ? (
                                  <ul className="list-disc list-inside space-y-1">
                                    {productsData.map((product, idx) => (
                                      <li key={idx} className="font-semibold text-base text-monday-blue">
                                        {product.priceGlobal > 0 
                                          ? `Rp ${Math.round(product.priceGlobal).toLocaleString("id-ID", {
                                              minimumFractionDigits: 0,
                                              maximumFractionDigits: 0,
                                            })}`
                                          : "N/A"}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="font-semibold text-base text-monday-blue">N/A</p>
                                )}
                              </td>
                              <td className="py-4 px-4">
                                {productsData.length > 0 ? (
                                  <ul className="list-disc list-inside space-y-1">
                                    {productsData.map((product, idx) => (
                                      <li key={idx} className="font-semibold text-base text-monday-blue">
                                        {product.pricePerUnit > 0 
                                          ? `Rp ${product.pricePerUnit.toLocaleString("id-ID", {
                                              minimumFractionDigits: 0,
                                              maximumFractionDigits: 0,
                                            })}`
                                          : "N/A"}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="font-semibold text-base text-monday-blue">N/A</p>
                                )}
                              </td>
                              <td className="py-4 px-4">
                                {productsData.length > 0 ? (
                                  <ul className="list-disc list-inside space-y-1">
                                    {productsData.map((product, idx) => (
                                      <li key={idx} className="font-semibold text-base text-gray-900">
                                        {product.quantity} unit
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="font-semibold text-base text-gray-900">N/A</p>
                                )}
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex items-center justify-center gap-2">
                                  <Link
                                    to={`/stock-management/stock-in/edit/${stockInId}`}
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
                                        stockInId,
                                        stockIn.code || `Stock In #${stockIn.id}`
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
                    {stockIns.map((stockIn: StockIn) => {
                      const stockInId = stockIn.id;
                      const products = stockIn.stock_in_products || [];
                      
                      // Prepare data for list display
                      const productsData = products.map((sip) => ({
                        name: sip.product?.name || `Product ID: ${sip.product_id}`,
                        priceGlobal: sip.price || 0,
                        pricePerUnit: sip.price && sip.quantity 
                          ? Math.round((sip.price / sip.quantity))
                          : 0,
                        quantity: sip.quantity || 0,
                      }));
                      
                      return (
                        <div
                          key={stockInId}
                          className="bg-white border border-monday-border rounded-2xl p-4 shadow-sm"
                        >
                          {/* Header */}
                          <div className="flex items-start justify-between mb-3 pb-3 border-b border-monday-border">
                            <div className="flex-1">
                              <p className="font-bold text-base text-gray-900 mb-1">
                                {stockIn.code || `#${stockIn.id}`}
                              </p>
                              <p className="font-medium text-sm text-gray-600">
                                {stockIn.warehouse?.name || "N/A"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Link
                                to={`/stock-management/stock-in/edit/${stockInId}`}
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
                                    stockInId,
                                    stockIn.code || `Stock In #${stockIn.id}`
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
                            <p className="text-xs font-medium text-gray-500 mb-1">Date In</p>
                            <p className="font-medium text-sm text-gray-700">
                              {formatDate(stockIn.date)}
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
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-gray-600">
                                        Qty: {product.quantity} unit
                                      </span>
                                      <div className="flex flex-col items-end gap-0.5">
                                        <span className="font-semibold text-monday-blue">
                                          {product.priceGlobal > 0 
                                            ? `Rp ${Math.round(product.priceGlobal).toLocaleString("id-ID", {
                                                minimumFractionDigits: 0,
                                                maximumFractionDigits: 0,
                                              })}`
                                            : "N/A"}
                                        </span>
                                        <span className="text-gray-500 text-[10px]">
                                          {product.pricePerUnit > 0 
                                            ? `Rp ${product.pricePerUnit.toLocaleString("id-ID")}/unit`
                                            : ""}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="font-medium text-sm text-gray-500">N/A</p>
                            )}
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
                      No Stock In Found
                    </p>
                    <p className="font-medium text-base text-monday-gray">
                      {debouncedSearch.trim()
                        ? "Try adjusting your search query."
                        : "Get started by adding your first stock in."}
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
        title="Delete Stock In"
        message="Are you sure you want to delete this stock in? This action cannot be undone."
        itemName={deleteModal.stockInName}
      />

      <SuccessNotification
        isOpen={showSuccessNotification}
        onClose={() => {
          setShowSuccessNotification(false);
        }}
        title="Success"
        message="Stock in has been successfully deleted."
        itemName={deletedStockInName}
      />
    </>
  );
};

export default StockInList;

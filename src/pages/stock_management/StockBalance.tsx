import { useFetchStockBalancesWithPrices } from "../../hooks/useStockManagement";
import { useFetchWarehouses } from "../../hooks/useWarehouses";
import UserProfileCard from "../../components/UserProfileCard";
import { useState, useMemo, useEffect } from "react";
import LoadingSpinner from "../../components/LoadingSpinner";
import { StockBalance } from "../../types/types";
import { useSearchParams } from "react-router-dom";
import { PaginationControls } from "../../components/PaginationControls";
import { useDebounce } from "../../hooks/useDebounce";


const StockBalancePage = () => {
  const [searchParams] = useSearchParams();
  const { data: warehouses } = useFetchWarehouses();
  const warehouseIdFromUrl = searchParams.get("warehouse_id");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | undefined>(
    warehouseIdFromUrl ? Number(warehouseIdFromUrl) : undefined
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [sortOrder, setSortOrder] = useState<'highest' | 'lowest'>('highest');
  
  // ✅ Product-level pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [productsPerPage, setProductsPerPage] = useState<number>(10);
  
  // ✅ Debounce search query (500ms delay)
  const debouncedSearch = useDebounce(searchQuery, 500);
  
  // ✅ OPTIMIZED: Single API call that returns stock balances AND product prices
  // This replaces 3 separate API calls (stock balances + all stock ins + all stock returns)
  const { data: stockBalanceData, isPending, isFetching } = useFetchStockBalancesWithPrices(undefined, { enableAutoSync: false });
  
  // Extract data from the hook response
  const allStockBalances = stockBalanceData?.data || [];
  const productPricesFromBackend = stockBalanceData?.productPrices || {};

  // Update selected warehouse when URL parameter changes
  useEffect(() => {
    if (warehouseIdFromUrl) {
      setSelectedWarehouseId(Number(warehouseIdFromUrl));
    }
  }, [warehouseIdFromUrl]);

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

  // ✅ STEP 1: Filter by Warehouse FIRST (before grouping) - Frontend filtering (no loading needed)
  const filteredByWarehouse = useMemo(() => {
    if (!selectedWarehouseId) {
      return allStockBalances; // Show all if no warehouse selected
    }
    
    // Filter to only include balances from selected warehouse
    return allStockBalances.filter((balance: StockBalance) => {
      const balanceWarehouseId = balance.warehouse_id || balance.warehouse?.id;
      return balanceWarehouseId === selectedWarehouseId;
    });
  }, [allStockBalances, selectedWarehouseId]);

  // ✅ STEP 2: Group by Product (using warehouse-filtered data)
  const groupedByProduct = useMemo(() => {
    const grouped: { [key: number]: StockBalance[] } = {};
    filteredByWarehouse.forEach((balance: StockBalance) => {
      const productId = balance.product_id;
      if (!grouped[productId]) {
        grouped[productId] = [];
      }
      grouped[productId].push(balance);
    });
    return grouped;
  }, [filteredByWarehouse]);

  // Calculate total per product
  const productTotals = useMemo(() => {
    const totals: { [key: number]: number } = {};
    Object.keys(groupedByProduct).forEach((productIdStr) => {
      const productId = parseInt(productIdStr);
      totals[productId] = groupedByProduct[productId].reduce(
        (sum, b) => sum + b.quantity_remaining,
        0
      );
    });
    return totals;
  }, [groupedByProduct]);

  // ✅ OPTIMIZED: Use average prices from backend response
  // No more need to fetch all stock ins and calculate manually
  const productAveragePrices = useMemo(() => {
    const avgPrices: { [key: number]: number } = {};
    Object.keys(groupedByProduct).forEach((productIdStr) => {
      const productId = parseInt(productIdStr);
      // Use backend-computed average price
      avgPrices[productId] = productPricesFromBackend[productId] || 0;
    });
    return avgPrices;
  }, [groupedByProduct, productPricesFromBackend]);

  // Filter grouped products based on search query (uses debounced search)
  const filteredProductsBySearch = useMemo(() => {
    if (!debouncedSearch.trim()) {
      return Object.keys(groupedByProduct);
    }
    const query = debouncedSearch.toLowerCase();
    return Object.keys(groupedByProduct).filter((productIdStr) => {
      const productId = parseInt(productIdStr);
      const balances = groupedByProduct[productId];
      const product = balances[0]?.product;
      const productNameMatch = product?.name?.toLowerCase().includes(query);
      const batchCodeMatch = balances.some((balance) =>
        balance.stock_in?.code?.toLowerCase().includes(query)
      );
      const warehouseMatch = balances.some((balance) =>
        balance.warehouse?.name?.toLowerCase().includes(query)
      );
      return productNameMatch || batchCodeMatch || warehouseMatch;
    });
  }, [groupedByProduct, debouncedSearch]);

  // Sort filtered products by total stock
  const filteredProducts = useMemo(() => {
    const products = [...filteredProductsBySearch];
    
    // Sort by total stock
    products.sort((a, b) => {
      const productIdA = parseInt(a);
      const productIdB = parseInt(b);
      const totalA = productTotals[productIdA] || 0;
      const totalB = productTotals[productIdB] || 0;
      
      if (sortOrder === 'highest') {
        return totalB - totalA; // Highest to lowest
      } else {
        return totalA - totalB; // Lowest to highest
      }
    });
    
    return products;
  }, [filteredProductsBySearch, productTotals, sortOrder]);

  // ✅ Product-level pagination
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    return filteredProducts.slice(startIndex, endIndex);
  }, [filteredProducts, currentPage, productsPerPage]);

  const totalProductPages = Math.ceil(filteredProducts.length / productsPerPage);
  const paginationFrom = filteredProducts.length > 0 ? (currentPage - 1) * productsPerPage + 1 : 0;
  const paginationTo = Math.min(currentPage * productsPerPage, filteredProducts.length);

  // ✅ Reset to page 1 when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedWarehouseId, sortOrder]);

  // ✅ Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (totalProductPages > 0 && currentPage > totalProductPages) {
      setCurrentPage(1);
    }
  }, [totalProductPages, currentPage]);

  if (isPending) {
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
              <h1 className="font-bold text-2xl">Stock Balance</h1>
              <p className="font-medium text-base text-monday-gray">
                View available stock in warehouse (sorted by FEFO/FIFO)
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
                      placeholder="Search stock balance..."
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
                    title="Search stock balance"
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
            id="Stock-Balance"
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
                    {isPending
                      ? "..."
                      : searchQuery.trim()
                      ? `${filteredProducts.length} of ${Object.keys(groupedByProduct).length} Products`
                      : `${filteredByWarehouse.length} Available Stock Batches`}
                  </span>
                </p>
                <p className="font-semibold text-lg text-monday-gray">
                  {searchQuery.trim()
                    ? "Search results for stock balance"
                    : "Stock sorted by FEFO (First Expired First Out) / FIFO (First In First Out)"}
                </p>
              </div>
              {/* Sort and Warehouse Filters */}
              <div className="flex items-center gap-3 flex-shrink-0">
                {/* Items per page */}
                <span className="text-sm font-semibold text-gray-700 whitespace-nowrap" style={{ display: 'inline-block', lineHeight: '1.5' }}>
                  Products per page:
                </span>
                <select
                  value={productsPerPage}
                  onChange={(e) => {
                    setProductsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  disabled={isFetching}
                  className="px-3 py-2 border border-monday-border rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-monday-blue focus:border-monday-blue cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                
                {/* Sort Filter */}
                <span className="text-sm font-semibold text-gray-700 whitespace-nowrap" style={{ display: 'inline-block', lineHeight: '1.5' }}>
                  Sort by Stock:
                </span>
                <label className="relative rounded-xl border-[1.5px] border-monday-border focus-within:border-monday-black transition-300 bg-white shadow-sm hover:shadow-md min-w-[200px]">
                  <select
                    value={sortOrder}
                    onChange={(e) => {
                      setSortOrder(e.target.value as 'highest' | 'lowest');
                    }}
                    className="appearance-none w-full px-4 py-2.5 pr-10 font-semibold text-sm outline-none bg-transparent cursor-pointer"
                  >
                    <option value="highest">Highest to Lowest</option>
                    <option value="lowest">Lowest to Highest</option>
                  </select>
                  <img
                    src="/assets/images/icons/arrow-down-grey.svg"
                    className="absolute top-1/2 right-3 -translate-y-1/2 size-4 pointer-events-none"
                    alt="dropdown arrow"
                  />
                </label>

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
              </div>
            </div>
            <hr className="border-monday-border" />
            <div id="Stock-Balance-List" className="flex flex-col px-4 gap-6 flex-1">
              {paginatedProducts.length > 0 ? (
                paginatedProducts.map((productIdStr) => {
                  const productId = parseInt(productIdStr);
                  const balances = groupedByProduct[productId];
                  const product = balances[0]?.product;
                  const total = productTotals[productId];
                  const averagePrice = productAveragePrices[productId];

                  return (
                    <div
                      key={productId}
                      className="flex flex-col gap-4 p-6 border-2 border-monday-border rounded-3xl bg-gray-50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {product?.thumbnail && (
                            <img
                              src={product.thumbnail}
                              alt={product.name}
                              className="size-16 object-cover rounded-xl"
                            />
                          )}
                          <div>
                            <h3 className="font-bold text-xl text-gray-900">
                              {product?.name || `Product ID: ${productId}`}
                            </h3>
                            <p className="font-semibold text-lg text-gray-600">
                              Total Stock: <span className="text-green-600">{total} unit</span>
                            </p>
                            <p className="font-semibold text-base text-gray-600 mt-1">
                              Average Price: <span className="text-blue-600">
                                {averagePrice != null && !isNaN(averagePrice) && averagePrice > 0
                                  ? `Rp ${Math.round(averagePrice).toLocaleString("id-ID", {
                                      minimumFractionDigits: 0,
                                      maximumFractionDigits: 0,
                                    })}`
                                  : "Rp 0"}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-2">
                        <h4 className="font-semibold text-base text-gray-700 mb-3">
                          Available Batches (FEFO/FIFO):
                        </h4>
                        <div className="overflow-x-auto overflow-y-auto pr-2 table-scroll" style={{ maxHeight: '165px', scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 #f1f5f9' }}>
                          <table className="w-full">
                            <thead className="sticky top-0 z-10">
                              <tr className="border-b-2 border-monday-border bg-monday-gray-background">
                                <th className="text-center py-3 px-4 font-semibold text-sm">Batch Code</th>
                                <th className="text-center py-3 px-4 font-semibold text-sm">Warehouse</th>
                                <th className="text-center py-3 px-4 font-semibold text-sm">Date In</th>
                                <th className="text-center py-3 px-4 font-semibold text-sm">Expiry Date</th>
                                <th className="text-center py-3 px-4 font-semibold text-sm">Remaining Stock</th>
                              </tr>
                            </thead>
                            <tbody>
                              {balances.map((balance) => (
                                <tr
                                  key={balance.id}
                                  className="border-b border-monday-border hover:bg-white transition-colors"
                                >
                                  <td className="py-3 px-4 text-center">
                                    <p className="font-semibold text-base text-gray-900">
                                      {(() => {
                                        // Priority 1: Use stock_in.code if available and not empty
                                        if (balance.stock_in?.code && balance.stock_in.code.trim() !== "") {
                                          return balance.stock_in.code;
                                        }
                                        
                                        // Priority 2: Use stock_return.code if available (from backend eager load)
                                        if (balance.stock_return?.code && balance.stock_return.code.trim() !== "") {
                                          return balance.stock_return.code;
                                        }
                                        
                                        // Priority 3: Fallback - show stock_in_id if available
                                        const stockInId = balance.stock_in_id || 0;
                                        if (stockInId === 0) {
                                          return "#0";
                                        }
                                        return `#${stockInId}`;
                                      })()}
                                    </p>
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <p className="font-medium text-sm text-gray-700">
                                      {balance.warehouse?.name || "N/A"}
                                    </p>
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <p className="font-medium text-sm text-gray-700">
                                      {formatDate(balance.date_in)}
                                    </p>
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <p className={`font-medium text-sm ${
                                      balance.expiry_date
                                        ? new Date(balance.expiry_date) < new Date()
                                          ? "text-red-600 font-bold"
                                          : new Date(balance.expiry_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                                          ? "text-orange-600 font-semibold"
                                          : "text-gray-700"
                                        : "text-gray-500"
                                    }`}>
                                      {balance.expiry_date ? formatDate(balance.expiry_date) : "N/A"}
                                    </p>
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <p className="font-semibold text-base text-gray-900">
                                      {balance.quantity_remaining} unit
                                    </p>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <img
                    src="/assets/images/icons/box-grey.svg"
                    className="size-16 mb-4 opacity-50"
                    alt="empty icon"
                  />
                    <p className="font-semibold text-xl text-gray-500 mb-2">
                      No Stock Available
                    </p>
                    <p className="font-medium text-base text-monday-gray">
                      {searchQuery.trim()
                        ? "Try adjusting your search query."
                        : selectedWarehouseId
                        ? "No stock available in the selected warehouse."
                        : "No stock available in all warehouses."}
                    </p>
                </div>
              )}
            </div>
            {/* ✅ Pagination Controls */}
            {totalProductPages > 1 && (
              <div className="mt-4">
                <PaginationControls
                  currentPage={currentPage}
                  lastPage={totalProductPages}
                  onPageChange={setCurrentPage}
                  isFetching={isFetching}
                  from={paginationFrom}
                  to={paginationTo}
                  total={filteredProducts.length}
                />
              </div>
            )}
          </section>
        </main>
    </>
  );
};

export default StockBalancePage;


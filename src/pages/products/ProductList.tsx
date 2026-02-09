import { Link } from "react-router-dom";
import { useFetchProduct, useFetchProductsPaginated, useDeleteProduct } from "../../hooks/useProducts";
import { useFetchBrands } from "../../hooks/useBrands";
import { useState, useMemo, useCallback, useEffect } from "react"; 
import UserProfileCard from "../../components/UserProfileCard";

import ConfirmDeleteModal from "../../components/ConfirmDeleteModal";
import SuccessNotification from "../../components/SuccessNotification";
import { PaginationControls } from "../../components/PaginationControls";
import { Product } from "../../types/types";
import { useAuth } from "../../hooks/useAuth";
import { isManager } from "../../utils/roleHelpers";
import { useDebounce } from "../../hooks/useDebounce";

const ProductList = () => { 
  const { user } = useAuth();
  
  // ✅ Server-side pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [perPage, setPerPage] = useState<number>(10);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  
  // ✅ Debounce search query (500ms delay)
  const debouncedSearch = useDebounce(searchQuery, 500);
  
  // ✅ Fetch data dengan server-side pagination
  const { data, isPending, isFetching, isError, error } = useFetchProductsPaginated(currentPage, perPage, debouncedSearch);
  
  const products = data?.data || [];
  const paginationMeta = data?.meta || {
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: perPage,
    from: 0,
    to: 0,
  };
  
  const { data: brands } = useFetchBrands(); // ✅ Fetch brands to map with products
  const { mutate: deleteProduct } = useDeleteProduct();
  
  // Check if user is manager
  const canManageProducts = isManager(user?.roles || []);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null
  );
  // ✅ Only fetch product details when modal is opened
  const { data: selectedProduct, isPending: isProductDetailLoading } = useFetchProduct(selectedProductId ?? 0);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    productId: number | null;
    productName: string;
  }>({
    isOpen: false,
    productId: null,
    productName: "",
  });
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [deletedProductName, setDeletedProductName] = useState("");

  // Auto-hide success notification after 3 seconds
  useEffect(() => {
    if (showSuccessNotification) {
      const timer = setTimeout(() => {
        setShowSuccessNotification(false);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [showSuccessNotification]);

  // ✅ Map products with brands based on brand_id (server already returns paginated data)
  const productsWithBrands = useMemo(() => {
    if (!products || products.length === 0) return [];
    if (!brands) return products; // Return products as-is if brands not loaded yet

    return products.map((product: Product) => {
      // Find matching brand by brand_id (or category_id for backward compatibility)
      const brandId = product.brand_id || (product as any).category_id;
      const brand = brands.find((b) => b.id === brandId);
      return {
        ...product,
        category: brand || product.category, // Use brand if found, otherwise use existing category
      };
    });
  }, [products, brands]);

  // ✅ Map selectedProduct with brand (same logic as productsWithBrands)
  const selectedProductWithBrand = useMemo(() => {
    if (!selectedProduct) return null;
    if (!brands) return selectedProduct; // Return as-is if brands not loaded yet

    // Find matching brand by brand_id (or category_id for backward compatibility)
    const brandId = selectedProduct.brand_id || (selectedProduct as any).category_id;
    const brand = brands.find((b) => b.id === brandId);
    return {
      ...selectedProduct,
      category: brand || selectedProduct.category, // Use brand if found, otherwise use existing category
    };
  }, [selectedProduct, brands]);

  // ✅ Reset to page 1 when search query changes (debounced)
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  // ✅ Reset to page 1 if current page is out of bounds
  useEffect(() => {
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
      productId: id,
      productName: name,
    });
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (deleteModal.productId) {
      const productNameToDelete = deleteModal.productName;
      deleteProduct(deleteModal.productId, {
        onSuccess: () => {
          // Show success notification after 700ms
          setTimeout(() => {
            setDeletedProductName(productNameToDelete);
            setShowSuccessNotification(true);
          }, 700);
        },
      });
      setDeleteModal({
        isOpen: false,
        productId: null,
        productName: "",
      });
    }
  }, [deleteModal.productId, deleteModal.productName, deleteProduct]);

  const handleCloseModal = useCallback(() => {
    setDeleteModal({
      isOpen: false,
      productId: null,
      productName: "",
    });
  }, []);

  // Handle 403 Forbidden error
  if (isError && (error as any)?.response?.status === 403) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-red-800 font-bold text-xl mb-2">Access Denied</h2>
          <p className="text-red-600 mb-4">
            You don't have permission to access this page. Please contact your administrator.
          </p>
          <p className="text-sm text-red-500">
            Error: {(error as any)?.response?.data?.message || "403 Forbidden"}
          </p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4 p-8 bg-white rounded-3xl shadow-lg">
          <div className="flex size-16 rounded-full bg-red-100 items-center justify-center">
            <svg
              className="size-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="font-semibold text-xl text-red-500">
            Error fetching products
          </p>
          <p className="text-monday-gray">{error.message}</p>
        </div>
      </div>
    );
  }

  // ✅ Show UI immediately, don't wait for data
  return (
    <>
          <div
            id="Top-Bar"
            className="flex items-center w-full gap-6 mt-[30px] mb-6"
          >
            <div className="flex items-center gap-6 h-[92px] bg-white w-full rounded-3xl p-[18px]">
              <div className="flex flex-col gap-[6px] w-full">
                <h1 className="font-bold text-2xl">Manage Products</h1>
              </div>
              <div className="flex items-center flex-nowrap gap-4">
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
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent border-none outline-none flex-1 text-base font-normal placeholder:text-gray-500 placeholder:font-normal min-w-0"
                        autoFocus={isSearchOpen && !searchQuery}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setSearchQuery("");
                            setIsSearchOpen(false);
                          }
                        }}
                        onBlur={() => {
                          // Close search jika tidak ada query dan user klik di luar
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
                      title="Search products"
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
              id="Products"
              className="flex flex-col gap-6 flex-1 rounded-3xl p-[18px] px-0 bg-white"
            >
              <div
                id="Header"
                className="flex items-center justify-between px-[18px]"
              >
                <div className="flex flex-col gap-[6px]">
                  <p className="flex items-center gap-[6px]">
                    <img
                      src="/assets/images/icons/bag-black.svg"
                      className="size-6 flex shrink-0"
                      alt="icon"
                    />
                    <span className="font-semibold text-2xl">
                      {(isPending && !data) || isFetching
                        ? "..."
                        : debouncedSearch.trim()
                        ? `${paginationMeta.total || 0} Products Found`
                        : `${paginationMeta.total || 0} Total Products`}
                    </span>
                  </p>
                  <p className="font-semibold text-lg text-monday-gray">
                    {canManageProducts 
                      ? "View and update your product list here."
                      : "View your product list here."}
                  </p>
                </div>
                {canManageProducts && (
                <Link
                  to="/products/add"
                  className="btn btn-primary font-semibold flex items-center justify-center"
                  title="Add New"
                >
                  <img
                    src="/assets/images/icons/add-square-white.svg"
                    className="flex size-6 shrink-0"
                    alt="add icon"
                  />
                </Link>
                )}
              </div>
              <hr className="border-monday-border" />
              <div id="Product-List" className="flex flex-col px-4 gap-5 flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-xl">All Products</p>
                  {/* ✅ Dropdown "Items per page" */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600 whitespace-nowrap">
                      Items per page:
                    </span>
                    <select
                      value={perPage}
                      onChange={(e) => {
                        setPerPage(Number(e.target.value));
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
                  </div>
                </div>

                {(isPending && !data) || isFetching ? (
                  <>
                  {/* Desktop Loading */}
                  <div className="block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-monday-border">
                          <th className="text-left py-4 px-4 font-semibold text-lg">Product Image</th>
                          <th className="text-left py-4 px-4 font-semibold text-lg">Product Name</th>
                          <th className="text-left py-4 px-4 font-semibold text-lg">Brand</th>
                          {canManageProducts && (
                            <th className="text-center py-4 px-4 font-semibold text-lg">Actions</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {[1, 2, 3].map((i) => (
                          <tr key={i} className="border-b border-monday-border animate-pulse">
                            <td className="py-4 px-4 w-[160px]">
                              <div className="bg-gray-200 rounded-xl shrink-0" style={{ width: '112px', height: '112px', minWidth: '112px', minHeight: '112px' }}></div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="h-5 bg-gray-200 rounded w-1/2"></div>
                            </td>
                            {canManageProducts && (
                            <td className="py-4 px-4">
                              <div className="flex items-center justify-center gap-2">
                                <div className="h-10 bg-gray-200 rounded w-[100px]"></div>
                                <div className="h-10 bg-gray-200 rounded w-[100px]"></div>
                                <div className="h-10 bg-gray-200 rounded w-[100px]"></div>
                              </div>
                            </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Mobile Loading */}
                  <div className="md:hidden flex flex-col gap-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex flex-col gap-3 p-4 rounded-2xl border border-monday-border bg-white animate-pulse">
                        <div className="flex items-start gap-3">
                          <div className="bg-gray-200 rounded-2xl shrink-0" style={{ width: '80px', height: '80px' }}></div>
                          <div className="flex flex-col gap-2 flex-1">
                            <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                          </div>
                        </div>
                        {canManageProducts && (
                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-monday-border">
                            <div className="h-8 bg-gray-200 rounded w-16"></div>
                            <div className="h-8 bg-gray-200 rounded w-16"></div>
                            <div className="h-8 bg-gray-200 rounded w-16"></div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  </>
                ) : productsWithBrands && productsWithBrands.length > 0 ? (
                  <>
                  {/* Desktop Table View */}
                  <div className="block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-monday-border bg-monday-gray-background">
                          <th className="text-left py-4 px-4 font-semibold text-lg w-[160px]">Product Image</th>
                          <th className="text-left py-4 px-4 font-semibold text-lg">Product Name</th>
                          <th className="text-left py-4 px-4 font-semibold text-lg">Brand</th>
                          {canManageProducts && (
                            <th className="text-center py-4 px-4 font-semibold text-lg">Actions</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {productsWithBrands.map((product: Product) => {
                          const productId = product.id;
                          return (
                            <tr key={productId} className="border-b border-monday-border hover:bg-gray-50 transition-colors">
                              <td className="py-4 px-4 w-[160px]">
                                <div className="flex rounded-2xl bg-monday-background items-center justify-center overflow-hidden shrink-0" style={{ width: '112px', height: '112px', minWidth: '112px', minHeight: '112px' }}>
                                  <img
                                    src={product.thumbnail}
                                    className="w-full h-full object-cover"
                                    alt="product"
                                    style={{ width: '112px', height: '112px', objectFit: 'cover' }}
                                  />
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <p className="font-semibold text-lg text-gray-900">
                                  {product.name}
                                </p>
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-2 font-medium text-base text-monday-gray">
                                  {product.category?.photo && (
                                    <div className="flex items-center justify-center bg-monday-background shrink-0 overflow-hidden" style={{ width: '40px', height: '40px', minWidth: '40px', minHeight: '40px', borderRadius: '12px' }}>
                                      <img
                                        src={product.category.photo}
                                        className="flex shrink-0"
                                        alt="brand icon"
                                        style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px', objectFit: 'contain', borderRadius: '10px' }}
                                      />
                                    </div>
                                  )}
                                  <span>{product.category?.name || "No Brand"}</span>
                                </div>
                              </td>
                              {canManageProducts && (
                              <td className="py-4 px-4">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => {
                                      setSelectedProductId(product.id);
                                    }}
                                    className="btn btn-primary-opacity font-semibold text-sm py-2 px-3 flex items-center justify-center"
                                    title="Details"
                                  >
                                    <img
                                      src="/assets/images/icons/eye-grey.svg"
                                      className="flex size-4 shrink-0"
                                      alt="details icon"
                                    />
                                  </button>
                                  <Link
                                    to={`/products/edit/${productId}`}
                                    className="btn btn-black font-semibold text-sm py-2 px-3 transition-all flex items-center justify-center"
                                    style={{
                                      border: '2px solid transparent',
                                    }}
                                    title="Edit"
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.borderColor = '#9ca3af';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.borderColor = 'transparent';
                                    }}
                                  >
                                    <img
                                      src="/assets/images/icons/edit-white.svg"
                                      className="flex size-4 shrink-0"
                                      alt="edit icon"
                                    />
                                  </Link>
                                  <button
                                    onClick={() => handleDeleteClick(productId, product.name)}
                                    className="btn btn-red font-semibold text-sm py-2 px-3 transition-all flex items-center justify-center"
                                    style={{
                                      border: '2px solid transparent',
                                    }}
                                    title="Delete"
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.borderColor = '#800000';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.borderColor = 'transparent';
                                    }}
                                  >
                                    <i className="fa fa-trash text-white text-sm" aria-hidden="true"></i>
                                  </button>
                                </div>
                              </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
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
                  </div>
                  
                  {/* Mobile Card View */}
                  <div className="md:hidden flex flex-col gap-4">
                    {productsWithBrands.map((product: Product) => {
                      const productId = product.id;
                      return (
                        <div key={productId} className="flex flex-col gap-3 p-4 rounded-2xl border border-monday-border bg-white hover:bg-gray-50 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="flex rounded-2xl bg-monday-background items-center justify-center overflow-hidden shrink-0" style={{ width: '80px', height: '80px', minWidth: '80px', minHeight: '80px' }}>
                              <img
                                src={product.thumbnail}
                                className="w-full h-full object-cover"
                                alt="product"
                                style={{ width: '80px', height: '80px', objectFit: 'cover' }}
                              />
                            </div>
                            <div className="flex flex-col gap-2 flex-1 min-w-0">
                              <p className="font-semibold text-base text-gray-900 line-clamp-2">
                                {product.name}
                              </p>
                              <div className="flex items-center gap-2">
                                {product.category?.photo && (
                                  <div className="flex items-center justify-center bg-monday-background shrink-0 overflow-hidden" style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px', borderRadius: '8px' }}>
                                    <img
                                      src={product.category.photo}
                                      className="flex shrink-0"
                                      alt="brand icon"
                                      style={{ width: '24px', height: '24px', minWidth: '24px', minHeight: '24px', objectFit: 'contain', borderRadius: '6px' }}
                                    />
                                  </div>
                                )}
                                <span className="font-medium text-sm text-monday-gray">{product.category?.name || "No Brand"}</span>
                              </div>
                            </div>
                          </div>
                          {canManageProducts && (
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-monday-border">
                            <button
                              onClick={() => {
                                setSelectedProductId(product.id);
                              }}
                                className="btn btn-primary-opacity font-semibold text-xs py-2 px-3 flex items-center justify-center"
                                title="Details"
                              >
                                <img
                                  src="/assets/images/icons/eye-grey.svg"
                                  className="flex size-4 shrink-0"
                                  alt="details icon"
                                />
                            </button>
                            <Link
                                to={`/products/edit/${productId}`}
                                className="btn btn-black font-semibold text-xs py-2 px-3 transition-all flex items-center justify-center"
                                title="Edit"
                            >
                              <img
                                  src="/assets/images/icons/edit-white.svg"
                                  className="flex size-4 shrink-0"
                                  alt="edit icon"
                                />
                            </Link>
                            <button
                                onClick={() => handleDeleteClick(productId, product.name)}
                                className="btn btn-red font-semibold text-xs py-2 px-3 transition-all flex items-center justify-center"
                                title="Delete"
                            >
                                <i className="fa fa-trash text-white text-xs" aria-hidden="true"></i>
                            </button>
                          </div>
                          )}
                        </div>
                      );
                    })}
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
                  </div>
                  </>
                ) : searchQuery.trim() ? (
                  <div
                    id="Empty-State"
                    className="flex flex-col flex-1 items-center justify-center rounded-[20px] border-dashed border-2 border-monday-gray gap-6 py-12"
                  >
                    <img
                      src="/assets/images/icons/search-normal-black.svg"
                      className="size-[52px]"
                      alt="icon"
                    />
                    <p className="font-semibold text-monday-gray">
                      No products found matching "{searchQuery}"
                    </p>
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setIsSearchOpen(false);
                      }}
                      className="btn btn-primary font-semibold mt-2"
                    >
                      Clear Search
                    </button>
                  </div>
                ) : (
                  <div
                    id="Empty-State"
                    className="flex flex-col flex-1 items-center justify-center rounded-[20px] border-dashed border-2 border-monday-gray gap-6 py-12"
                  >
                    <img
                      src="/assets/images/icons/document-text-grey.svg"
                      className="size-[52px]"
                      alt="icon"
                    />
                    <p className="font-semibold text-monday-gray">
                      Oops, it looks like there's no data yet.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </main>

      {/* Product Details Modal */}
      {selectedProductId && (
        <div className="modal flex flex-1 items-center justify-center h-full fixed top-0 w-full z-50">
          <div
            onClick={() => setSelectedProductId(null)}
            className="absolute w-full h-full bg-[#292D32B2] cursor-pointer"
          />
          <div className="relative flex flex-col w-[406px] shrink-0 rounded-3xl p-[18px] gap-5 bg-white z-10">
            <div className="modal-header flex items-center justify-between">
              <p className="font-semibold text-xl">Product Details</p>
              <button
                onClick={() => setSelectedProductId(null)}
                className="flex size-14 rounded-full items-center justify-center bg-monday-gray-background hover:bg-monday-gray transition-colors"
              >
                <img
                  src="/assets/images/icons/close-circle-black.svg"
                  className="size-6"
                  alt="icon"
                />
              </button>
            </div>
            {isProductDetailLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-monday-blue"></div>
              </div>
            ) : selectedProductWithBrand ? (
            <div className="modal-content flex flex-col rounded-3xl border border-monday-border p-4 gap-5">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-2">
                  <p className="font-semibold text-lg text-gray-900">
                    {selectedProductWithBrand.name}
                  </p>
                  <div className="flex items-center gap-2">
                    {selectedProductWithBrand.category?.photo && (
                      <div className="flex items-center justify-center bg-monday-background shrink-0 overflow-hidden" style={{ width: '40px', height: '40px', minWidth: '40px', minHeight: '40px', borderRadius: '12px' }}>
                        <img
                          src={selectedProductWithBrand.category.photo}
                          className="flex shrink-0"
                          alt="brand icon"
                          style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px', objectFit: 'contain', borderRadius: '10px' }}
                        />
                      </div>
                    )}
                    <span className="font-bold text-lg text-gray-700">
                      {selectedProductWithBrand.category?.name || "No Brand"}
                    </span>
                  </div>
                </div>
                <div className="flex size-[100px] rounded-2xl bg-monday-gray-background items-center justify-center overflow-hidden">
                  <img
                      src={selectedProductWithBrand.thumbnail}
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
                    {selectedProductWithBrand.about}
                </p>
              </div>
            </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={deleteModal.isOpen}
        onClose={handleCloseModal}
        onConfirm={handleConfirmDelete}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        itemName={deleteModal.productName}
      />

      {/* Success Notification */}
      <SuccessNotification
        isOpen={showSuccessNotification}
        onClose={() => {
          setShowSuccessNotification(false);
        }}
        title="Success"
        message="Product has been successfully deleted."
        itemName={deletedProductName}
      />
    </>
  );
};

export default ProductList;

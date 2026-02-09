import { Link } from "react-router-dom";
import { useFetchBrands, useDeleteBrand } from "../../hooks/useBrands";
import { useState, useMemo, useCallback, useEffect } from "react"; 
import UserProfileCard from "../../components/UserProfileCard";

import ConfirmDeleteModal from "../../components/ConfirmDeleteModal";
import SuccessNotification from "../../components/SuccessNotification";
import { PaginationControls } from "../../components/PaginationControls";
import { Brand } from "../../types/types";
import { useAuth } from "../../hooks/useAuth";
import { isManager } from "../../utils/roleHelpers";

const BrandList = () => { 
  const { user } = useAuth();
  const { data: brands, isPending, isError, error } = useFetchBrands();
  const { mutate: deleteBrand } = useDeleteBrand();
  
  // Check if user is manager
  const canManageBrands = isManager(user?.roles || []);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    brandId: number | null;
    brandName: string;
  }>({
    isOpen: false,
    brandId: null,
    brandName: "",
  });
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [deletedBrandName, setDeletedBrandName] = useState("");

  // Auto-hide success notification after 700ms
  useEffect(() => {
    if (showSuccessNotification) {
      const timer = setTimeout(() => {
        setShowSuccessNotification(false);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [showSuccessNotification]);

  // Filter brands based on search query
  const filteredBrands = useMemo(() => {
    if (!brands || !searchQuery.trim()) {
      return brands || [];
    }

    const query = searchQuery.toLowerCase().trim();
    return brands.filter((brand: Brand) => {
      return (
        brand.name?.toLowerCase().includes(query) ||
        brand.tagline?.toLowerCase().includes(query)
      );
    });
  }, [brands, searchQuery]);

  // Pagination logic
  const totalPages = Math.ceil(filteredBrands.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBrands = filteredBrands.slice(startIndex, endIndex);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const handleDeleteClick = useCallback((id: number, name: string) => {
    setDeleteModal({
      isOpen: true,
      brandId: id,
      brandName: name,
    });
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (deleteModal.brandId) {
      const brandNameToDelete = deleteModal.brandName;
      deleteBrand(deleteModal.brandId, {
        onSuccess: () => {
          // Show success notification after 700ms
          setTimeout(() => {
            setDeletedBrandName(brandNameToDelete);
            setShowSuccessNotification(true);
          }, 700);
        },
      });
      setDeleteModal({
        isOpen: false,
        brandId: null,
        brandName: "",
      });
    }
  }, [deleteModal.brandId, deleteModal.brandName, deleteBrand]);

  const handleCloseModal = useCallback(() => {
    setDeleteModal({
      isOpen: false,
      brandId: null,
      brandName: "",
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
            Error fetching brands
          </p>
          <p className="text-monday-gray">{error.message}</p>
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
                <h1 className="font-bold text-2xl">Manage Brands</h1>
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
                        placeholder="Search brands..."
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
                      title="Search brands"
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
              id="Brands"
              className="flex flex-col gap-6 flex-1 rounded-3xl p-[18px] px-0 bg-white"
            >
              <div
                id="Header"
                className="flex items-center justify-between px-[18px]"
              >
                <div className="flex flex-col gap-[6px]">
                  <p className="flex items-center gap-[6px]">
                    <img
                      src="/assets/images/icons/note-2-blue-fill.svg"
                      className="size-6 flex shrink-0"
                      alt="icon"
                    />
                    <span className="font-semibold text-2xl">
                      {isPending
                        ? "..."
                        : searchQuery.trim()
                        ? `${filteredBrands.length} of ${brands?.length || 0} Brands`
                        : `${brands?.length || 0} Total Brand`}
                    </span>
                  </p>
                  <p className="font-semibold text-lg text-monday-gray">
                    {canManageBrands 
                      ? "View and update your Brand list here."
                      : "View your Brand list here."}
                  </p>
                </div>
                {canManageBrands && (
                <Link
                  to="/brands/add"
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
              <div id="Brand-List" className="flex flex-col px-4 gap-5 flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-xl">All Brands</p>
                </div>

                {isPending ? (
                  <>
                  {/* Desktop Loading */}
                  <div className="block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-monday-border">
                          <th className="text-left py-4 px-4 font-semibold text-lg w-[160px]">Brand Image</th>
                          <th className="text-left py-4 px-4 font-semibold text-lg">Brand Name</th>
                          <th className="text-left py-4 px-4 font-semibold text-lg">Tagline</th>
                          {canManageBrands && (
                          <th className="text-center py-4 px-4 font-semibold text-lg">Actions</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {[1, 2, 3].map((i) => (
                          <tr key={i} className="border-b border-monday-border animate-pulse">
                            <td className="py-4 px-4 w-[160px]">
                              <div className="flex items-center justify-center">
                                <div className="bg-gray-200 rounded-2xl shrink-0" style={{ width: '112px', height: '112px', minWidth: '112px', minHeight: '112px' }}></div>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="h-5 bg-gray-200 rounded w-full"></div>
                            </td>
                            {canManageBrands && (
                            <td className="py-4 px-4">
                              <div className="flex items-center justify-center gap-2">
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
                            <div className="h-4 bg-gray-200 rounded w-full"></div>
                          </div>
                        </div>
                        {canManageBrands && (
                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-monday-border">
                            <div className="h-8 bg-gray-200 rounded w-16"></div>
                            <div className="h-8 bg-gray-200 rounded w-16"></div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  </>
                ) : filteredBrands && filteredBrands.length > 0 ? (
                  <>
                  {/* Desktop Table View */}
                  <div className="block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-monday-border bg-monday-gray-background">
                          <th className="text-left py-4 px-4 font-semibold text-lg w-[160px]">Brand Image</th>
                          <th className="text-left py-4 px-4 font-semibold text-lg">Brand Name</th>
                          <th className="text-left py-4 px-4 font-semibold text-lg">Tagline</th>
                          {canManageBrands && (
                          <th className="text-center py-4 px-4 font-semibold text-lg">Actions</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedBrands.map((brand: Brand) => {
                          const brandId = brand.id;
                          return (
                            <tr key={brandId} className="border-b border-monday-border hover:bg-gray-50 transition-colors">
                              <td className="py-4 px-4 w-[160px]">
                                <div className="flex items-center justify-center">
                                  <div className="flex rounded-2xl bg-monday-background items-center justify-center overflow-hidden shrink-0" style={{ width: '112px', height: '112px', minWidth: '112px', minHeight: '112px' }}>
                                    <img
                                      src={brand.photo}
                                      className="w-full h-full object-cover"
                                      alt="brand"
                                      style={{ width: '112px', height: '112px', objectFit: 'cover' }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <p className="font-semibold text-lg text-gray-900">
                                  {brand.name}
                                </p>
                              </td>
                              <td className="py-4 px-4">
                                <p className="font-medium text-base text-monday-gray">
                                  {brand.tagline}
                                </p>
                              </td>
                              {canManageBrands && (
                              <td className="py-4 px-4">
                                <div className="flex items-center justify-center gap-2">
                                  <Link
                                    to={`/brands/edit/${brandId}`}
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
                                    onClick={() => handleDeleteClick(brandId, brand.name)}
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
                    {totalPages > 1 && (
                      <PaginationControls
                        currentPage={currentPage}
                        lastPage={totalPages}
                        onPageChange={setCurrentPage}
                        from={startIndex + 1}
                        to={Math.min(endIndex, filteredBrands.length)}
                        total={filteredBrands.length}
                      />
                    )}
                  </div>
                  
                  {/* Mobile/Tablet Card View */}
                  <div className="md:hidden flex flex-col gap-4">
                    {paginatedBrands.map((brand: Brand) => {
                      const brandId = brand.id;
                      return (
                        <div key={brandId} className="flex flex-col gap-3 p-4 rounded-2xl border border-monday-border bg-white hover:bg-gray-50 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="flex rounded-2xl bg-monday-background items-center justify-center overflow-hidden shrink-0" style={{ width: '80px', height: '80px', minWidth: '80px', minHeight: '80px' }}>
                              <img
                                src={brand.photo}
                                className="w-full h-full object-cover"
                                alt="brand"
                                style={{ width: '80px', height: '80px', objectFit: 'cover' }}
                              />
                            </div>
                            <div className="flex flex-col gap-2 flex-1 min-w-0">
                              <div className="flex flex-col gap-1">
                                <p className="font-semibold text-xs text-monday-gray">Brand Name</p>
                                <p className="font-semibold text-base text-gray-900 line-clamp-2">
                                  {brand.name}
                                </p>
                              </div>
                              <div className="flex flex-col gap-1">
                                <p className="font-semibold text-xs text-monday-gray">Tagline</p>
                                <p className="font-medium text-sm text-monday-gray line-clamp-2">
                                  {brand.tagline}
                                </p>
                              </div>
                            </div>
                          </div>
                          {canManageBrands && (
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-monday-border">
                              <Link
                                to={`/brands/edit/${brandId}`}
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
                                onClick={() => handleDeleteClick(brandId, brand.name)}
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
                  </div>
                  {totalPages > 1 && (
                    <PaginationControls
                      currentPage={currentPage}
                      lastPage={totalPages}
                      onPageChange={setCurrentPage}
                      from={startIndex + 1}
                      to={Math.min(endIndex, filteredBrands.length)}
                      total={filteredBrands.length}
                    />
                  )}
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
                      No brands found matching "{searchQuery}"
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

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={deleteModal.isOpen}
        onClose={handleCloseModal}
        onConfirm={handleConfirmDelete}
        title="Delete Brand"
        message="Are you sure you want to delete this brand? This action cannot be undone."
        itemName={deleteModal.brandName}
      />

      {/* Success Notification */}
      <SuccessNotification
        isOpen={showSuccessNotification}
        onClose={() => {
          setShowSuccessNotification(false);
        }}
        title="Success"
        message="Brand has been successfully deleted."
        itemName={deletedBrandName}
      />
    </>
  );
};

export default BrandList;


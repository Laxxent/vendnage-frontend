import { Link } from "react-router-dom";
import { useFetchVendingMachines, useDeleteVendingMachine } from "../../hooks/useVendingMachines";
import { useAuth } from "../../hooks/useAuth";
import { isManager, getRoleDisplayName } from "../../utils/roleHelpers";
import Sidebar from "../../components/Sidebar";
import UserProfileCard from "../../components/UserProfileCard";
import { useState, useMemo, useCallback, useEffect } from "react";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal";
import SuccessNotification from "../../components/SuccessNotification";
import { PaginationControls } from "../../components/PaginationControls";
import { VendingMachine } from "../../types/types";
import { useFetchUsers } from "../../hooks/useUsers";

const VendingMachineList = () => {
  const { user } = useAuth();
  const isManagerUser = isManager(user?.roles || []);
  const { data: vendingMachines, isPending, isError, error } = useFetchVendingMachines();
  const { data: users = [] } = useFetchUsers();

  // Create a map of user IDs to users for quick lookup
  const usersMap = useMemo(() => {
    const map = new Map<number, typeof users[0]>();
    users.forEach(u => {
      if (u.id) map.set(u.id, u);
    });
    return map;
  }, [users]);
  const { mutate: deleteVendingMachine } = useDeleteVendingMachine();

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    vendingMachineId: number | null;
    vendingMachineName: string;
  }>({
    isOpen: false,
    vendingMachineId: null,
    vendingMachineName: "",
  });
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [deletedVendingMachineName, setDeletedVendingMachineName] = useState("");

  // Filter vending machines based on search query, status filter, and user role
  const filteredVendingMachines = useMemo(() => {
    if (!vendingMachines) return [];
    
    // PIC hanya bisa lihat yang assigned ke mereka (sudah di-filter di backend)
    // Manager bisa lihat semua (tidak perlu filter tambahan)
    let filtered = vendingMachines;
    
    // Apply status filter (only for manager)
    if (isManagerUser && statusFilter !== "all") {
      filtered = filtered.filter((vm: VendingMachine) => {
        const vmStatus = (vm.status || "active").toLowerCase();
        return vmStatus === statusFilter.toLowerCase();
      });
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((vm: VendingMachine) => {
      return (
        vm.name?.toLowerCase().includes(query) ||
        vm.location?.toLowerCase().includes(query) ||
          vm.status?.toLowerCase().includes(query) ||
          vm.assigned_user?.name?.toLowerCase().includes(query) ||
          vm.assigned_user?.email?.toLowerCase().includes(query)
      );
    });
    }
    
    return filtered;
  }, [vendingMachines, searchQuery, statusFilter, isManagerUser]);

  // Pagination logic
  const totalPages = Math.ceil(filteredVendingMachines.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedVendingMachines = filteredVendingMachines.slice(startIndex, endIndex);

  // Reset to page 1 when search query or status filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const handleDeleteClick = useCallback((id: number, name: string) => {
    setDeleteModal({
      isOpen: true,
      vendingMachineId: id,
      vendingMachineName: name,
    });
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (deleteModal.vendingMachineId) {
      const vendingMachineNameToDelete = deleteModal.vendingMachineName;
      deleteVendingMachine(deleteModal.vendingMachineId, {
        onSuccess: () => {
          setTimeout(() => {
            setDeletedVendingMachineName(vendingMachineNameToDelete);
            setShowSuccessNotification(true);
          }, 300);
        },
      });
      setDeleteModal({
        isOpen: false,
        vendingMachineId: null,
        vendingMachineName: "",
      });
    }
  }, [deleteModal.vendingMachineId, deleteModal.vendingMachineName, deleteVendingMachine]);

  const handleCloseModal = useCallback(() => {
    setDeleteModal({
      isOpen: false,
      vendingMachineId: null,
      vendingMachineName: "",
    });
  }, []);

  // Handle 403 Forbidden error
  if (isError && (error as any)?.response?.status === 403) {
    return (
      <div id="main-container" className="flex flex-1">
        <Sidebar />
        <div id="Content" className="flex flex-col flex-1 p-6 pt-0">
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
            Error fetching vending machines
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
                <h1 className="font-bold text-2xl">Manage Vending Machines</h1>
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
                        placeholder="Search vending machines..."
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
                      title="Search vending machines"
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
              id="Vending-Machines"
              className="flex flex-col gap-6 flex-1 rounded-3xl p-[18px] px-0 bg-white"
            >
              <div
                id="Header"
                className="flex items-center justify-between px-[18px]"
              >
                <div className="flex flex-col gap-[6px]">
                  <p className="flex items-center gap-[6px]">
                    <img
                      src="/assets/images/icons/shop-blue-fill.svg"
                      className="size-6 flex shrink-0"
                      alt="icon"
                    />
                    <span className="font-semibold text-2xl">
                      {isPending
                        ? "..."
                        : searchQuery.trim()
                        ? `${filteredVendingMachines.length} of ${vendingMachines?.length || 0} Vending Machines`
                        : `${vendingMachines?.length || 0} Total Vending Machines`}
                    </span>
                  </p>
                  <p className="font-semibold text-lg text-monday-gray">
                    View and manage your Vending Machines list here.
                  </p>
                </div>
                {isManagerUser && (
                <Link
                  to="/vending-machines/add"
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
              <div id="Vending-Machine-List" className="flex flex-col px-4 gap-5 flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-xl">All Vending Machines</p>
                  {isManagerUser && (
                    <div className="flex items-center gap-3">
                      <label htmlFor="status-filter" className="font-medium text-base text-gray-700">
                        Filter by Status:
                      </label>
                      <label className="relative">
                        <select
                          id="status-filter"
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="appearance-none rounded-xl border-[1.5px] border-monday-border bg-white px-4 py-2.5 pr-10 text-sm font-semibold text-monday-gray shadow-sm hover:shadow-md transition-shadow min-w-[200px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-monday-blue focus:border-monday-blue"
                        >
                          <option value="all">All Status</option>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="maintenance">Maintenance</option>
                        </select>
                        <img
                          src="/assets/images/icons/arrow-down-grey.svg"
                          alt="arrow"
                          className="absolute top-1/2 right-3 -translate-y-1/2 size-4 pointer-events-none flex-shrink-0 z-10"
                        />
                      </label>
                    </div>
                  )}
                </div>

                {isPending ? (
                  <>
                  {/* Desktop Loading */}
                  <div className="block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-monday-border">
                          <th className="text-left py-4 px-4 font-semibold text-lg">Name</th>
                          <th className="text-left py-4 px-4 font-semibold text-lg">Location</th>
                          <th className="text-left py-4 px-4 font-semibold text-lg">Status</th>
                          {isManagerUser && (
                            <th className="text-left py-4 px-4 font-semibold text-lg">Assigned To</th>
                          )}
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
                              <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                            </td>
                            {isManagerUser && (
                              <td className="py-4 px-4">
                                <div className="h-5 bg-gray-200 rounded w-2/3"></div>
                              </td>
                            )}
                            <td className="py-4 px-4">
                              <div className="flex items-center justify-center gap-2">
                                <div className="h-10 bg-gray-200 rounded w-[130px]"></div>
                                {isManagerUser && (
                                  <>
                                    <div className="h-10 bg-gray-200 rounded w-[100px]"></div>
                                <div className="h-10 bg-gray-200 rounded w-[100px]"></div>
                                <div className="h-10 bg-gray-200 rounded w-[100px]"></div>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Mobile Loading */}
                  <div className="md:hidden flex flex-col gap-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex flex-col gap-3 p-4 rounded-2xl border border-monday-border bg-white animate-pulse">
                        <div className="flex flex-col gap-2 flex-1">
                          <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                          {isManagerUser && (
                            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                          )}
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-monday-border">
                          <div className="h-8 bg-gray-200 rounded w-16"></div>
                          {isManagerUser && (
                            <>
                              <div className="h-8 bg-gray-200 rounded w-16"></div>
                              <div className="h-8 bg-gray-200 rounded w-16"></div>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  </>
                ) : filteredVendingMachines && filteredVendingMachines.length > 0 ? (
                  <>
                  {/* Desktop Table View */}
                  <div className="block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-monday-border bg-monday-gray-background">
                          <th className="text-left py-4 px-4 font-semibold text-lg">Name</th>
                          <th className="text-left py-4 px-4 font-semibold text-lg">Location</th>
                          <th className="text-left py-4 px-4 font-semibold text-lg">Status</th>
                          {isManagerUser && (
                            <th className="text-left py-4 px-4 font-semibold text-lg">Assigned To</th>
                          )}
                          <th className="text-center py-4 px-4 font-semibold text-lg">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedVendingMachines.map((vm: VendingMachine) => {
                          const vmId = vm.id;
                          return (
                            <tr key={vmId} className="border-b border-monday-border hover:bg-gray-50 transition-colors">
                              <td className="py-4 px-4">
                                <p className="font-semibold text-lg text-gray-900">
                                  {vm.name}
                                </p>
                              </td>
                              <td className="py-4 px-4">
                                <p className="font-medium text-base text-monday-gray">
                                  {vm.location || 'N/A'}
                                </p>
                              </td>
                              <td className="py-4 px-4">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                                  vm.status === 'active' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {vm.status || 'active'}
                                </span>
                              </td>
                              {isManagerUser && (
                                <td className="py-4 px-4">
                                  {vm.assigned_user ? (() => {
                                    // Get user data from usersMap to get roles
                                    const fullUserData = usersMap.get(vm.assigned_user.id);
                                    const userRoles = fullUserData?.roles || vm.assigned_user.roles || [];
                                    const rolesDisplay = userRoles.length > 0
                                      ? userRoles.map(role => getRoleDisplayName(role)).join(", ")
                                      : "No roles";
                                    
                                    return (
                                      <div className="flex flex-col">
                                        <p className="font-medium text-base text-gray-900">
                                          {vm.assigned_user.name}
                                        </p>
                                        <p className="font-medium text-sm text-gray-500">
                                          {vm.assigned_user.email}
                                        </p>
                                        <p className="font-medium text-xs text-gray-400 mt-0.5">
                                          {rolesDisplay}
                                        </p>
                                      </div>
                                    );
                                  })() : (
                                    <span className="font-medium text-sm text-gray-500">
                                      Not Assigned
                                    </span>
                                  )}
                                </td>
                              )}
                              <td className="py-4 px-4">
                                <div className="flex items-center justify-center gap-2">
                                  <Link
                                    to={`/vending-machines/${vmId}/stock`}
                                    className="btn btn-primary-opacity font-semibold text-sm py-2 px-3 flex items-center justify-center"
                                    title="View Stock"
                                  >
                                    <img
                                      src="/assets/images/icons/box-black.svg"
                                      className="flex size-4 shrink-0"
                                      alt="stock icon"
                                    />
                                  </Link>
                                  {isManagerUser && (
                                    <>
                                  <Link
                                    to={`/vending-machines/edit/${vmId}`}
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
                                    onClick={() => handleDeleteClick(vmId, vm.name)}
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
                                    </>
                                  )}
                                </div>
                              </td>
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
                        to={Math.min(endIndex, filteredVendingMachines.length)}
                        total={filteredVendingMachines.length}
                      />
                    )}
                  </div>
                  
                  {/* Mobile/Tablet Card View */}
                  <div className="md:hidden flex flex-col gap-4">
                    {paginatedVendingMachines.map((vm: VendingMachine) => {
                      const vmId = vm.id;
                      return (
                        <div key={vmId} className="flex flex-col gap-3 p-4 rounded-2xl border border-monday-border bg-white hover:bg-gray-50 transition-colors">
                          <div className="flex flex-col gap-2 flex-1 min-w-0">
                            <div className="flex flex-col gap-1">
                              <p className="font-semibold text-xs text-monday-gray">Name</p>
                              <p className="font-semibold text-base text-gray-900 line-clamp-2">
                                {vm.name}
                              </p>
                            </div>
                            <div className="flex flex-col gap-1">
                              <p className="font-semibold text-xs text-monday-gray">Location</p>
                              <p className="font-medium text-sm text-monday-gray">
                                {vm.location || 'N/A'}
                              </p>
                            </div>
                            <div className="flex flex-col gap-1">
                              <p className="font-semibold text-xs text-monday-gray">Status</p>
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold w-fit ${
                                vm.status === 'active' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {vm.status || 'active'}
                              </span>
                            </div>
                            {isManagerUser && (
                              <div className="flex flex-col gap-1">
                                <p className="font-semibold text-xs text-monday-gray">Assigned To</p>
                                {vm.assigned_user ? (() => {
                                  // Get user data from usersMap to get roles
                                  const fullUserData = usersMap.get(vm.assigned_user.id);
                                  const userRoles = fullUserData?.roles || vm.assigned_user.roles || [];
                                  const rolesDisplay = userRoles.length > 0
                                    ? userRoles.map(role => getRoleDisplayName(role)).join(", ")
                                    : "No roles";
                                  
                                  return (
                                    <div className="flex flex-col">
                                      <p className="font-medium text-sm text-gray-900">
                                        {vm.assigned_user.name}
                                      </p>
                                      <p className="font-medium text-xs text-gray-500">
                                        {vm.assigned_user.email}
                                      </p>
                                      <p className="font-medium text-xs text-gray-400 mt-0.5">
                                        {rolesDisplay}
                                      </p>
                                    </div>
                                  );
                                })() : (
                                  <span className="font-medium text-sm text-gray-500">
                                    Not Assigned
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-monday-border">
                            <Link
                              to={`/vending-machines/${vmId}/stock`}
                              className="btn btn-primary-opacity font-semibold text-xs py-2 px-3 flex items-center justify-center"
                              title="View Stock"
                            >
                              <img
                                src="/assets/images/icons/box-black.svg"
                                className="flex size-4 shrink-0"
                                alt="stock icon"
                              />
                            </Link>
                            {isManagerUser && (
                              <>
                            <Link
                              to={`/vending-machines/edit/${vmId}`}
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
                              onClick={() => handleDeleteClick(vmId, vm.name)}
                              className="btn btn-red font-semibold text-xs py-2 px-3 transition-all flex items-center justify-center"
                              title="Delete"
                            >
                              <i className="fa fa-trash text-white text-xs" aria-hidden="true"></i>
                            </button>
                              </>
                            )}
                          </div>
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
                      to={Math.min(endIndex, filteredVendingMachines.length)}
                      total={filteredVendingMachines.length}
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
                      No vending machines found matching "{searchQuery}"
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
                      src="/assets/images/icons/shop-black.svg"
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
        title="Delete Vending Machine"
        message="Are you sure you want to delete this vending machine? This action cannot be undone."
        itemName={deleteModal.vendingMachineName}
      />

      {/* Success Notification */}
      <SuccessNotification
        isOpen={showSuccessNotification}
        onClose={() => {
          setShowSuccessNotification(false);
        }}
        title="Success"
        message="Vending machine has been successfully deleted."
        itemName={deletedVendingMachineName}
      />
    </>
  );
};

export default VendingMachineList;


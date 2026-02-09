import { Link } from "react-router-dom";

import { useFetchRoles, useDeleteRole } from "../../hooks/useRoles";
import { useFetchUsers } from "../../hooks/useUsers";
import UserProfileCard from "../../components/UserProfileCard";
import { useState, useMemo, useCallback, useEffect } from "react";
import LoadingSpinner from "../../components/LoadingSpinner";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal";
import SuccessNotification from "../../components/SuccessNotification";
import { PaginationControls } from "../../components/PaginationControls";
import { Role } from "../../types/auth";

const RoleList = () => {
  const { data: roles = [], isPending } = useFetchRoles();
  const { data: users = [], isPending: isUsersPending } = useFetchUsers();
  
  // Debug: Log users data to verify it's being fetched correctly
  useEffect(() => {
    if (users && users.length > 0) {
      console.log("RoleList: Users data loaded:", users.length, "users");
      console.log("RoleList: Sample user roles:", users[0]?.roles);
    }
  }, [users]);
  const { mutate: deleteRole, isPending: isDeletePending } = useDeleteRole();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    roleId: number | null;
    roleName: string;
  }>({
    isOpen: false,
    roleId: null,
    roleName: "",
  });
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [deletedRoleName, setDeletedRoleName] = useState("");

  // Auto-hide success notification after 700ms
  useEffect(() => {
    if (showSuccessNotification) {
      const timer = setTimeout(() => {
        setShowSuccessNotification(false);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [showSuccessNotification]);

  // Filter roles based on search query
  const filteredRoles = useMemo(() => {
    if (!roles || roles.length === 0) {
      return [];
    }
    if (!searchQuery.trim()) {
      return roles;
    }
    const query = searchQuery.toLowerCase();
    return roles.filter((role: Role) => {
      const nameMatch = role.name?.toLowerCase().includes(query);
      return nameMatch;
    });
  }, [roles, searchQuery]);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredRoles.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRoles = filteredRoles.slice(startIndex, endIndex);

  // Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // Helper function to get users by role name
  // Normalize role names for comparison (handle underscores, spaces, case)
  const normalizeRoleName = useCallback((roleName: string): string => {
    if (!roleName) return "";
    return roleName.toLowerCase().trim().replace(/\s+/g, "_");
  }, []);

  const getUsersByRole = useCallback((roleName: string) => {
    if (!users || users.length === 0) return [];
    const normalizedRoleName = normalizeRoleName(roleName);
    
    return users.filter((user) => {
      if (!user.roles || user.roles.length === 0) return false;
      
      return user.roles.some((userRole) => {
        const normalizedUserRole = normalizeRoleName(userRole);
        return normalizedUserRole === normalizedRoleName;
      });
    });
  }, [users, normalizeRoleName]);

  // Get total users count for a role
  // Priority: use users_web_count from backend if available and > 0, otherwise count from users list
  const getTotalUsersCount = useCallback((role: Role): number => {
    // If backend provides users_web_count and it's valid, use it
    if (role.users_web_count !== undefined && role.users_web_count !== null && role.users_web_count > 0) {
      console.log(`RoleList: Using backend count for role "${role.name}": ${role.users_web_count}`);
      return role.users_web_count;
    }
    
    // Otherwise, count from users list
    const roleUsers = getUsersByRole(role.name);
    console.log(`RoleList: Calculated count for role "${role.name}": ${roleUsers.length} users`);
    if (roleUsers.length > 0) {
      console.log(`RoleList: Users with role "${role.name}":`, roleUsers.map(u => u.email));
    }
    return roleUsers.length;
  }, [getUsersByRole]);

  const handleDeleteClick = useCallback((id: number, name: string) => {
    setDeleteModal({
      isOpen: true,
      roleId: id,
      roleName: name,
    });
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (deleteModal.roleId) {
      const roleNameToDelete = deleteModal.roleName;
      deleteRole(deleteModal.roleId, {
        onSuccess: () => {
          // Show success notification after 700ms
          setTimeout(() => {
            setDeletedRoleName(roleNameToDelete);
            setShowSuccessNotification(true);
          }, 700);
        },
      });
      setDeleteModal({
        isOpen: false,
        roleId: null,
        roleName: "",
      });
    }
  }, [deleteModal.roleId, deleteModal.roleName, deleteRole]);

  const handleCloseModal = useCallback(() => {
    setDeleteModal({
      isOpen: false,
      roleId: null,
      roleName: "",
    });
  }, []);

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
            <div className="flex flex-col gap-[6px] w-full">
              <h1 className="font-bold text-2xl">Manage Roles</h1>
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
                        placeholder="Search roles..."
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
                      title="Search roles"
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
              id="Roles"
            className="flex flex-col gap-6 flex-1 rounded-3xl p-[18px] px-0 bg-white"
          >
            <div
              id="Header"
              className="flex items-center justify-between px-[18px]"
            >
              <div className="flex flex-col gap-[6px]">
                <p className="flex items-center gap-[6px]">
                  <img
                      src="/assets/images/icons/profile-circle-black.svg"
                    className="size-6 flex shrink-0"
                    alt="icon"
                  />
                  <span className="font-semibold text-2xl">
                      {isPending
                        ? "..."
                        : searchQuery.trim()
                        ? `${filteredRoles.length} of ${roles?.length || 0} Roles`
                        : `${roles?.length || 0} Total Roles`}
                  </span>
                </p>
                <p className="font-semibold text-lg text-monday-gray">
                  View and update your Roles here.
                </p>
              </div>
                <Link
                  to="/roles/add"
                  className="btn btn-primary font-semibold flex items-center justify-center"
                  title="Add New"
                >
                  <img
                    src="/assets/images/icons/add-square-white.svg"
                    className="flex size-6 shrink-0"
                    alt="add icon"
                />
              </Link>
            </div>
            <hr className="border-monday-border" />
              <div id="Role-List" className="flex flex-col px-4 gap-5 flex-1">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-xl">All Roles</p>
              </div>

                {isPending ? (
                  <>
                  {/* Desktop Loading */}
                  <div className="block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-monday-border">
                          <th className="text-left py-4 px-4 font-semibold text-lg">Role Name</th>
                          <th className="text-left py-4 px-4 font-semibold text-lg">Total Users</th>
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
                  
                  {/* Mobile Loading */}
                  <div className="md:hidden flex flex-col gap-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex flex-col gap-3 p-4 rounded-2xl border border-monday-border bg-white animate-pulse">
                        <div className="flex flex-col gap-2 flex-1">
                          <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-monday-border">
                          <div className="h-8 bg-gray-200 rounded w-16"></div>
                          <div className="h-8 bg-gray-200 rounded w-16"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  </>
                ) : filteredRoles && filteredRoles.length > 0 ? (
                  <>
                  {/* Desktop Table View */}
                  <div className="block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-monday-border bg-monday-gray-background">
                          <th className="text-left py-4 px-4 font-semibold text-lg">Role Name</th>
                          <th className="text-left py-4 px-4 font-semibold text-lg">Total Users</th>
                          <th className="text-center py-4 px-4 font-semibold text-lg">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedRoles.map((role: Role) => {
                          const roleId = role.id;
                          return (
                            <tr key={roleId} className="border-b border-monday-border hover:bg-gray-50 transition-colors">
                              <td className="py-4 px-4">
                                <p className="font-semibold text-lg text-gray-900">
                                  {role.name}
                                </p>
                              </td>
                              <td className="py-4 px-4">
                                {(() => {
                                  const totalUsers = getTotalUsersCount(role);
                                  
                                  if (isUsersPending && !role.users_web_count) {
                                    return (
                                      <p className="font-medium text-base text-monday-gray">
                                        Loading...
                                      </p>
                                    );
                                  }
                                  
                                  return (
                                <p className="flex items-center gap-2 font-medium text-base text-monday-gray">
                                  <img
                                    src="/assets/images/icons/profile-2user-black.svg"
                                    className="flex shrink-0"
                                    alt="users icon"
                                    style={{ width: '20px', height: '20px', minWidth: '20px', minHeight: '20px', objectFit: 'contain' }}
                                  />
                                      <span>{totalUsers} Total User{totalUsers !== 1 ? 's' : ''}</span>
                                </p>
                                  );
                                })()}
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex items-center justify-center gap-2">
                                  <Link
                                    to={`/roles/edit/${roleId}`}
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
                                    onClick={() => handleDeleteClick(roleId, role.name)}
                                    className="btn btn-red font-semibold text-sm py-2 px-3 transition-all flex items-center justify-center"
                                    disabled={isDeletePending}
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
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    
                    {/* Pagination */}
                    {totalPages > 1 && (
                      <PaginationControls
                        currentPage={currentPage}
                        lastPage={totalPages}
                        onPageChange={setCurrentPage}
                        from={startIndex + 1}
                        to={Math.min(endIndex, filteredRoles.length)}
                        total={filteredRoles.length}
                      />
                    )}
                  </div>
                  
                  {/* Mobile/Tablet Card View */}
                  <div className="md:hidden flex flex-col gap-4">
                    {paginatedRoles.map((role: Role) => {
                      const roleId = role.id;
                      const totalUsers = getTotalUsersCount(role);
                      return (
                        <div key={roleId} className="flex flex-col gap-3 p-4 rounded-2xl border border-monday-border bg-white hover:bg-gray-50 transition-colors">
                          <div className="flex flex-col gap-2 flex-1 min-w-0">
                            <div className="flex flex-col gap-1">
                              <p className="font-semibold text-xs text-monday-gray">Role Name</p>
                              <p className="font-semibold text-base text-gray-900 line-clamp-2">
                                {role.name}
                              </p>
                            </div>
                            <div className="flex flex-col gap-1">
                              <p className="font-semibold text-xs text-monday-gray">Total Users</p>
                              {isUsersPending && !role.users_web_count ? (
                                <p className="font-medium text-sm text-monday-gray">
                                  Loading...
                                </p>
                              ) : (
                                <p className="flex items-center gap-2 font-medium text-sm text-monday-gray">
                                  <img
                                    src="/assets/images/icons/profile-2user-black.svg"
                                    className="flex shrink-0"
                                    alt="users icon"
                                    style={{ width: '18px', height: '18px', minWidth: '18px', minHeight: '18px', objectFit: 'contain' }}
                                  />
                                  <span>{totalUsers} Total User{totalUsers !== 1 ? 's' : ''}</span>
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-monday-border">
                            <Link
                              to={`/roles/edit/${roleId}`}
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
                              onClick={() => handleDeleteClick(roleId, role.name)}
                              className="btn btn-red font-semibold text-xs py-2 px-3 transition-all flex items-center justify-center"
                              disabled={isDeletePending}
                              title="Delete"
                            >
                              <i className="fa fa-trash text-white text-xs" aria-hidden="true"></i>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Pagination for Mobile/Tablet */}
                    {totalPages > 1 && (
                      <PaginationControls
                        currentPage={currentPage}
                        lastPage={totalPages}
                        onPageChange={setCurrentPage}
                        from={startIndex + 1}
                        to={Math.min(endIndex, filteredRoles.length)}
                        total={filteredRoles.length}
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
                      No roles found matching "{searchQuery}"
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
        title="Delete Role"
        message="Are you sure you want to delete this role? This action cannot be undone."
        itemName={deleteModal.roleName}
      />

      {/* Success Notification */}
      <SuccessNotification
        isOpen={showSuccessNotification}
        onClose={() => {
          setShowSuccessNotification(false);
        }}
        title="Success"
        message="Role has been successfully deleted."
        itemName={deletedRoleName}
      />
    </>
  );
};

export default RoleList;

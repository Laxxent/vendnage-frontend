import { Link } from "react-router-dom";
import { useFetchUsers, useDeleteUser } from "../../hooks/useUsers";
import { useState, useMemo, useCallback, useEffect } from "react"; 
import UserProfileCard from "../../components/UserProfileCard";
import LoadingSpinner from "../../components/LoadingSpinner";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal";
import SuccessNotification from "../../components/SuccessNotification";
import { PaginationControls } from "../../components/PaginationControls";

const UserList = () => { 
  const { data: users, isPending, isError, error } = useFetchUsers();
  const { mutate: deleteUser } = useDeleteUser();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    userId: number | null;
    userName: string;
  }>({
    isOpen: false,
    userId: null,
    userName: "",
  });
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [deletedUserName, setDeletedUserName] = useState("");

  const handleDeleteClick = useCallback((id: number, name: string) => {
    setDeleteModal({
      isOpen: true,
      userId: id,
      userName: name,
    });
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (deleteModal.userId) {
      const userNameToDelete = deleteModal.userName;
      deleteUser(deleteModal.userId, {
        onSuccess: () => {
          // Show success notification after 700ms
          setTimeout(() => {
            setDeletedUserName(userNameToDelete);
            setShowSuccessNotification(true);
          }, 700);
        },
      });
      setDeleteModal({
        isOpen: false,
        userId: null,
        userName: "",
      });
    }
  }, [deleteModal.userId, deleteModal.userName, deleteUser]);

  const handleCloseModal = useCallback(() => {
    setDeleteModal({
      isOpen: false,
      userId: null,
      userName: "",
    });
  }, []);

  // Auto-hide success notification after 700ms
  useEffect(() => {
    if (showSuccessNotification) {
      const timer = setTimeout(() => {
        setShowSuccessNotification(false);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [showSuccessNotification]);

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!users || users.length === 0) {
      return [];
    }
    if (!searchQuery.trim()) {
      return users;
    }
    const query = searchQuery.toLowerCase();
    return users.filter((user) => {
      const nameMatch = user.name?.toLowerCase().includes(query);
      const emailMatch = user.email?.toLowerCase().includes(query);
      const phoneMatch = user.phone?.toLowerCase().includes(query);
      return nameMatch || emailMatch || phoneMatch;
    });
  }, [users, searchQuery]);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);


  
  if (isPending) {
    return <LoadingSpinner />;
  }
  
  if (isError)
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
            Error fetching users
          </p>
          <p className="text-monday-gray">{error.message}</p>
        </div>
      </div>
    );

  return (
    <>
      <div
        id="Top-Bar"
        className="flex items-center w-full gap-6 mt-[30px] mb-6"
      >
            <div className="flex items-center gap-6 h-[92px] bg-white w-full rounded-3xl p-[18px]">
              <div className="flex flex-col gap-[6px] w-full">
                <h1 className="font-bold text-2xl">Manage Users</h1>
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
                        placeholder="Search users..."
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
                      title="Search users"
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
              id="Users"
              className="flex flex-col gap-6 flex-1 rounded-3xl p-[18px] px-0 bg-white"
            >
              <div
                id="Header"
                className="flex items-center justify-between px-[18px]"
              >
                <div className="flex flex-col gap-[6px]">
                  <p className="flex items-center gap-[6px]">
                    <img
                      src="assets/images/icons/user-thin-grey.svg"
                      className="size-6 flex shrink-0"
                      alt="icon"
                    />
                    <span className="font-semibold text-2xl">
                      {searchQuery ? `${filteredUsers.length} Search Results` : `${users?.length || 0} Total Users`}
                    </span>
                  </p>
                  <p className="font-semibold text-lg text-monday-gray">
                    View and update your user list here.
                  </p>
                </div>
                <Link
                  to="/users/add"
                  className="btn btn-primary font-semibold flex items-center justify-center"
                  title="Add New"
                >
                  <img
                    src="assets/images/icons/add-square-white.svg"
                    className="flex size-6 shrink-0"
                    alt="icon"
                  />
                </Link>
              </div>
              <hr className="border-monday-border" />
              <div
                id="User-List"
                className="flex flex-col px-4 gap-5 flex-1"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-xl">All Users</p>
                </div>

                {filteredUsers && filteredUsers.length > 0 ? (
                  <>
                  {/* Desktop Table View */}
                    <div className="block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b-2 border-monday-border bg-monday-gray-background">
                            <th className="text-left py-4 px-4 font-semibold text-lg w-[160px]">User Icon</th>
                            <th className="text-left py-4 px-4 font-semibold text-lg">User Name</th>
                            <th className="text-left py-4 px-4 font-semibold text-lg">Phone Number</th>
                            <th className="text-center py-4 px-4 font-semibold text-lg">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedUsers.map((user) => (
                            <tr key={user.id} className="border-b border-monday-border hover:bg-gray-50 transition-colors">
                              <td className="py-4 px-4 w-[160px]">
                                <div className="flex rounded-2xl bg-monday-gray-background items-center justify-center overflow-hidden shrink-0" style={{ width: '80px', height: '80px', minWidth: '80px', minHeight: '80px' }}>
                              <img
                                src={user.photo || "assets/images/icons/user-thin-grey.svg"}
                                className="size-full object-cover"
                                alt="user"
                              />
                            </div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex flex-col gap-1">
                                  <p className="font-semibold text-lg text-gray-900">
                                {user.name}
                              </p>
                                  <p className="font-medium text-base text-monday-gray">
                                {user.email}
                              </p>
                                  <p className="font-medium text-sm text-monday-gray">
                                    {user.roles && user.roles.length > 0
                                      ? `Roles: ${user.roles.join(", ")}`
                                      : "No roles assigned"}
                                  </p>
                            </div>
                              </td>
                              <td className="py-4 px-4">
                                <p className="flex items-center gap-2 font-medium text-base text-monday-gray">
                            <img
                              src="assets/images/icons/call-grey.svg"
                                    className="flex shrink-0"
                                    alt="phone icon"
                                    style={{ width: '20px', height: '20px', minWidth: '20px', minHeight: '20px', objectFit: 'contain' }}
                                  />
                                  <span>{user.phone}</span>
                            </p>
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex items-center justify-center gap-2">
                            <Link
                              to={`/users/edit/${user.id}`}
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
                              onClick={() => handleDeleteClick(user.id, user.name)}
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
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Pagination for Desktop */}
                    {totalPages > 1 && (
                      <PaginationControls
                        currentPage={currentPage}
                        lastPage={totalPages}
                        onPageChange={setCurrentPage}
                        from={startIndex + 1}
                        to={Math.min(endIndex, filteredUsers.length)}
                        total={filteredUsers.length}
                      />
                    )}
                    
                    {/* Mobile/Tablet Card View */}
                    <div className="md:hidden flex flex-col gap-4">
                      {paginatedUsers.map((user) => (
                        <div key={user.id} className="flex flex-col gap-3 p-4 rounded-2xl border border-monday-border bg-white hover:bg-gray-50 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="flex rounded-2xl bg-monday-gray-background items-center justify-center overflow-hidden shrink-0" style={{ width: '80px', height: '80px', minWidth: '80px', minHeight: '80px' }}>
                              <img
                                src={user.photo || "assets/images/icons/user-thin-grey.svg"}
                                className="size-full object-cover"
                                alt="user"
                                style={{ width: '80px', height: '80px', objectFit: 'cover' }}
                              />
                            </div>
                            <div className="flex flex-col gap-2 flex-1 min-w-0">
                              <div className="flex flex-col gap-1">
                                <p className="font-semibold text-xs text-monday-gray">Username</p>
                                <p className="font-semibold text-base text-gray-900 line-clamp-2">
                                  {user.name}
                                </p>
                              </div>
                              <div className="flex flex-col gap-1">
                                <p className="font-medium text-sm text-monday-gray">
                                  {user.email}
                                </p>
                              </div>
                              <div className="flex flex-col gap-1">
                                <p className="font-medium text-xs text-monday-gray">
                                  {user.roles && user.roles.length > 0
                                    ? `Roles: ${user.roles.join(", ")}`
                                    : "No roles assigned"}
                                </p>
                              </div>
                              <div className="flex flex-col gap-1">
                                <p className="font-semibold text-xs text-monday-gray">Phone Number</p>
                                <p className="flex items-center gap-2 font-medium text-sm text-monday-gray">
                                  <img
                                    src="assets/images/icons/call-grey.svg"
                                    className="flex shrink-0"
                                    alt="phone icon"
                                    style={{ width: '18px', height: '18px', minWidth: '18px', minHeight: '18px', objectFit: 'contain' }}
                                  />
                                  <span>{user.phone}</span>
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-monday-border">
                            <Link
                              to={`/users/edit/${user.id}`}
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
                              onClick={() => handleDeleteClick(user.id, user.name)}
                              className="btn btn-red font-semibold text-xs py-2 px-3 transition-all flex items-center justify-center"
                              title="Delete"
                            >
                              <i className="fa fa-trash text-white text-xs" aria-hidden="true"></i>
                            </button>
                          </div>
                        </div>
                      ))}
                      
                      {/* Pagination for Mobile/Tablet */}
                      {totalPages > 1 && (
                        <PaginationControls
                          currentPage={currentPage}
                          lastPage={totalPages}
                          onPageChange={setCurrentPage}
                          from={startIndex + 1}
                          to={Math.min(endIndex, filteredUsers.length)}
                          total={filteredUsers.length}
                        />
                      )}
                    </div>
                  </>
                ) : (
                  <div
                    id="Empty-State"
                    className="flex flex-col flex-1 items-center justify-center rounded-[20px] border-dashed border-2 border-monday-gray gap-6"
                  >
                    <img
                      src="assets/images/icons/document-text-grey.svg"
                      className="size-[52px]"
                      alt="icon"
                    />
                    <p className="font-semibold text-monday-gray">
                      {searchQuery ? "No users found matching your search." : "Oops, it looks like there's no data yet."}
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
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone."
        itemName={deleteModal.userName}
      />

      {/* Success Notification */}
      <SuccessNotification
        isOpen={showSuccessNotification}
        onClose={() => {
          setShowSuccessNotification(false);
        }}
        title="Success"
        message="User has been successfully deleted."
        itemName={deletedUserName}
      />
    </>
  );
};

export default UserList;


import { useState, useEffect } from "react";
import { useFetchUsers } from "../../hooks/useUsers";
import { useFetchRoles } from "../../hooks/useRoles";
import { useAssignUserRole } from "../../hooks/useAssignRoles";
import UserProfileCard from "../../components/UserProfileCard";
import { Link, useNavigate } from "react-router-dom";
import SuccessNotification from "../../components/SuccessNotification";

const AssignUserRole = () => {
  const { data: users, isPending: loadingUsers } = useFetchUsers();
  const { data: roles, isPending: loadingRoles } = useFetchRoles();
  const navigate = useNavigate();
  const {
    mutate: assignRole,
    isPending: isAssigning,
    error,
  } = useAssignUserRole();

  const [userId, setUserId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [assignedUserName, setAssignedUserName] = useState("");
  const [assignedRoleName, setAssignedRoleName] = useState("");
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [canAssignRole, setCanAssignRole] = useState(true);

  // Auto-hide success notification and redirect after 2 seconds
  useEffect(() => {
    if (showSuccessNotification) {
      const timer = setTimeout(() => {
        setShowSuccessNotification(false);
        navigate("/users");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessNotification, navigate]);

  // Check if selected user already has a role
  useEffect(() => {
    if (userId) {
      const selectedUser = users?.find((u) => u.id === Number(userId));
      const hasRole = selectedUser?.roles && selectedUser.roles.length > 0;
      setCanAssignRole(!hasRole); // Disable if user has role
    } else {
      setCanAssignRole(true);
    }
  }, [userId, users]);

  const handleAssignRole = () => {
    if (!userId || !roleId) return;
    
    const selectedUser = users?.find((u) => u.id === Number(userId));
    const selectedRole = roles?.find((r) => r.id === Number(roleId));
    
    assignRole(
      { user_id: Number(userId), role_id: Number(roleId) },
      {
        onSuccess: () => {
          setAssignedUserName(selectedUser?.name || "");
          setAssignedRoleName(selectedRole?.name || "");
          setShowSuccessNotification(true);
        },
      }
    );
  };

  return (
    <>
      <div
        id="Top-Bar"
        className="flex items-center w-full gap-6 mt-[30px] mb-6"
      >
        <div className="flex items-center gap-6 h-[92px] bg-white w-full rounded-3xl p-[18px]">
          <div className="flex flex-col gap-[6px] w-full">
            <h1 className="font-bold text-2xl">Assign Role to User</h1>
            <Link to={'/users'}
              className="flex items-center gap-[6px] text-monday-gray font-semibold"
            >
              <img
                src="/assets/images/icons/arrow-left-grey.svg"
                className="size-4 flex shrink-0"
                alt="icon"
              />
              User Roles
            </Link>
          </div>
        </div>
        <UserProfileCard />
      </div>
      <main className="flex flex-col gap-6 flex-1">
        <div className="flex gap-6">
          <div id="Assign-User-Role" className="flex flex-col w-full h-fit rounded-3xl p-[18px] gap-5 bg-white">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-xl capitalize">
                Complete the form
              </h2>
              <button
                type="button"
                onClick={() => setShowGuideModal(true)}
                className="flex items-center justify-center size-10 rounded-full bg-monday-gray-background hover:bg-monday-gray transition-colors cursor-pointer flex-shrink-0"
                title="Quick Guide to Assign Role To User"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-gray-600"
                >
                  <path
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    stroke="#4B5563"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            {error && <p className="text-red-500">{error.message}</p>}

            <label className="group relative rounded-3xl border-[1.5px] border-monday-border focus-within:border-monday-black transition-300 overflow-hidden">
              <div className="flex items-center pr-4 absolute transform -translate-y-1/2 top-1/2 left-6 border-r-[1.5px] border-monday-border ">
                <img
                  src="/assets/images/icons/profile-circle-grey.svg"
                  className="flex size-6 shrink-0"
                  alt="icon"
                />
              </div>
              <p className="placeholder font-medium text-monday-gray text-sm absolute -translate-y-1/2 left-[81px] top-[25px] group-has-[:invalid]:top-[36px] group-focus-within:top-[25px] transition-300">
                Select User Id
              </p>

              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                disabled={loadingUsers}
                className="appearance-none w-full h-[72px] font-semibold text-lg outline-none pl-20 pr-6 pb-[14.5px] pt-[32px]"
              >
                <option value="">Select role</option>

                {users?.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
              <img
                src="/assets/images/icons/arrow-down-grey.svg"
                className="absolute transform -translate-y-1/2 top-1/2 right-6 size-6"
                alt="icon"
              />
            </label>

            {/* Error message if user already has a role */}
            {(() => {
              const selectedUser = users?.find((u) => u.id === Number(userId));
              const hasRole = selectedUser?.roles && selectedUser.roles.length > 0;
              
              if (!userId || !hasRole || !selectedUser.roles) return null;
              
              return (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border-2 border-red-300">
                  <div className="flex shrink-0 size-6 rounded-full bg-red-500 items-center justify-center mt-0.5">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 18L18 6M6 6l12 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="font-bold text-base text-red-900">
                      ⛔ Cannot Assign Role - User Already Has Role
                    </p>
                    <p className="text-sm text-red-800 leading-relaxed">
                      Current role: <span className="font-semibold">{selectedUser.roles.join(", ")}</span>
                      <br />
                      To change this user's role, please use the <Link to={`/users/edit/${userId}`} className="font-bold underline hover:text-red-900">Edit User page</Link>.
                    </p>
                  </div>
                </div>
              );
            })()}

            <label className="group relative rounded-3xl border-[1.5px] border-monday-border focus-within:border-monday-black transition-300 overflow-hidden">
              <div className="flex items-center pr-4 absolute transform -translate-y-1/2 top-1/2 left-6 border-r-[1.5px] border-monday-border ">
                <img
                  src="/assets/images/icons/profile-tick-grey.svg"
                  className="flex size-6 shrink-0"
                  alt="icon"
                />
              </div>
              <p className="placeholder font-medium text-monday-gray text-sm absolute -translate-y-1/2 left-[81px] top-[25px] group-has-[:invalid]:top-[36px] group-focus-within:top-[25px] transition-300">
                Select Role ID
              </p>
              <select
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                disabled={loadingRoles}
                className="appearance-none w-full h-[72px] font-semibold text-lg outline-none pl-20 pr-6 pb-[14.5px] pt-[32px]"
              >
                <option value="">Select role</option>

                {roles?.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              <img
                src="/assets/images/icons/arrow-down-grey.svg"
                className="absolute transform -translate-y-1/2 top-1/2 right-6 size-6"
                alt="icon"
              />
            </label>
            <div className="flex items-center justify-end gap-4">
              <Link to={'/users'}
                className="btn btn-red font-semibold"
              >
                Cancel
              </Link>

              <button
                className={`btn btn-primary font-semibold transition-all ${
                  (!canAssignRole || !userId || !roleId) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                onClick={handleAssignRole}
                disabled={isAssigning || !canAssignRole || !userId || !roleId}
                title={!canAssignRole ? "User already has a role. Use Edit User page to change it." : ""}
              >
                {isAssigning ? "Assigning..." : "Save data"}
              </button>
            </div>
          </div>
        </div>
      </main>

      <SuccessNotification
        isOpen={showSuccessNotification}
        onClose={() => {
          setShowSuccessNotification(false);
          navigate("/users");
        }}
        title="Success"
        message="Role has been successfully assigned to user."
        itemName={assignedUserName && assignedRoleName ? `${assignedUserName} (${assignedRoleName})` : undefined}
      />

      {showGuideModal && (
        <div className="modal flex flex-1 items-center justify-center h-full fixed top-0 w-full z-50">
          <div
            onClick={() => setShowGuideModal(false)}
            className="absolute w-full h-full bg-[#292D32B2] cursor-pointer"
          />
          <div className="relative flex flex-col w-[500px] shrink-0 rounded-3xl p-[18px] gap-5 bg-white max-h-[90vh] overflow-y-auto">
            <div className="modal-header flex items-center justify-between">
              <p className="font-semibold text-xl">Quick Guide to Assign Role To User</p>
              <button
                onClick={() => setShowGuideModal(false)}
                className="flex size-14 rounded-full items-center justify-center bg-monday-gray-background hover:bg-monday-gray transition-colors"
                title="Close"
              >
                <img
                  src="/assets/images/icons/close-circle-black.svg"
                  className="size-6"
                  alt="close icon"
                />
              </button>
            </div>
            <div className="modal-content flex flex-col gap-4">
              <ul className="flex flex-col gap-4">
                <li className="flex gap-[6px]">
                  <img
                    src="/assets/images/icons/Checklist-green-circle.svg"
                    className="flex size-6 shrink-0"
                    alt="icon"
                  />
                  <p className="font-medium leading-[140%]">
                    Select an available user from the list to assign a role
                  </p>
                </li>
                <li className="flex gap-[6px]">
                  <img
                    src="/assets/images/icons/Checklist-green-circle.svg"
                    className="flex size-6 shrink-0"
                    alt="icon"
                  />
                  <p className="font-medium leading-[140%]">
                    Select the most appropriate role based on the user's responsibilities
                  </p>
                </li>
                <li className="flex gap-[6px]">
                  <img
                    src="/assets/images/icons/Checklist-green-circle.svg"
                    className="flex size-6 shrink-0"
                    alt="icon"
                  />
                  <p className="font-medium leading-[140%]">
                    Review all details carefully before assigning to ensure accuracy
                  </p>
                </li>
                <li className="flex gap-[6px]">
                  <img
                    src="/assets/images/icons/Checklist-green-circle.svg"
                    className="flex size-6 shrink-0"
                    alt="icon"
                  />
                  <p className="font-medium leading-[140%]">
                    Verify that the role and permissions match the user's requirements
                  </p>
                </li>
                <li className="flex gap-[6px]">
                  <img
                    src="/assets/images/icons/Checklist-green-circle.svg"
                    className="flex size-6 shrink-0"
                    alt="icon"
                  />
                  <p className="font-medium leading-[140%]">
                    Ensure the role is assigned to the correct user to maintain proper access control
                  </p>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AssignUserRole;

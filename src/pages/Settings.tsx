import UserProfileCard from "../components/UserProfileCard";
import { useAuth } from "../hooks/useAuth";
import { useState } from "react";
import { useUpdateMyProfile, useChangePassword } from "../hooks/useUsers";
import LoadingSpinner from "../components/LoadingSpinner";
import SuccessNotification from "../components/SuccessNotification";
import ErrorNotification from "../components/ErrorNotification";

const Settings = () => {
  const { user, setUser } = useAuth();
  const updateMyProfile = useUpdateMyProfile();
  const changePassword = useChangePassword();
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [name, setName] = useState(user?.name || "");
  
  // Change Password Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showPasswordSuccessNotification, setShowPasswordSuccessNotification] = useState(false);
  const [showPasswordErrorNotification, setShowPasswordErrorNotification] = useState(false);
  const [passwordErrorMessage, setPasswordErrorMessage] = useState("");

  if (!user) {
    return <LoadingSpinner />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const updated = await updateMyProfile.mutateAsync({
        name,
        phone: String(phone),
        email,
      });
      setUser({ ...user, ...updated });
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 3000);
    } catch (err: any) {
      console.error("Failed to update profile", err);
      const errorMsg = err.response?.data?.message || "Failed to update settings. Please try again.";
      setErrorMessage(errorMsg);
      setShowErrorToast(true);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (newPassword !== confirmPassword) {
      setPasswordErrorMessage("New password and confirmation password do not match.");
      setShowPasswordErrorNotification(true);
      return;
    }

    if (newPassword.length < 6 || newPassword.length > 255) {
      setPasswordErrorMessage("Password must be between 6 and 255 characters.");
      setShowPasswordErrorNotification(true);
      return;
    }

    try {
      await changePassword.mutateAsync({
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: confirmPassword,
      });
      setIsPasswordModalOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      // Show success notification after modal closes
      setTimeout(() => {
        setShowPasswordSuccessNotification(true);
      }, 300);
    } catch (err: any) {
      console.error("Failed to change password", err);
      const errorMessage = err.response?.data?.message || "Failed to change password. Please try again.";
      setPasswordErrorMessage(errorMessage);
      setShowPasswordErrorNotification(true);
    }
  };

  return (
    <>
      <div
        id="Top-Bar"
        className="flex items-center w-full gap-6 mt-[30px] mb-6"
      >
          <div className="flex items-center gap-6 h-[92px] bg-white w-full rounded-3xl p-[18px]">
            <div className="flex flex-col gap-[6px] w-full">
              <h1 className="font-bold text-2xl">Settings</h1>
            </div>
          </div>
          <UserProfileCard />
        </div>
        <main className="flex flex-col gap-6 flex-1">
          <section id="Settings-Page" className="flex flex-col gap-6 flex-1 rounded-3xl p-[18px] bg-white">
            <div className="flex flex-col gap-[6px]">
              <p className="flex items-center gap-[6px]">
                <img
                  src="assets/images/icons/setting-black.svg"
                  className="size-6 flex shrink-0"
                  alt="icon"
                />
                <span className="font-semibold text-2xl">Account Settings</span>
              </p>
              <p className="font-semibold text-lg text-monday-gray">
                Manage your account settings and preferences here.
              </p>
            </div>
            <hr className="border-monday-border" />

            <div className="flex flex-col gap-6">
              {/* Profile Information Section */}
              <div className="flex flex-col gap-4">
                <h2 className="font-semibold text-xl">Profile Information</h2>
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  <div className="flex flex-col gap-4">
                    <label className="group relative">
                      <div className="flex items-center pr-4 absolute transform -translate-y-1/2 top-1/2 left-6 border-r-[1.5px] border-monday-border">
                        <img
                          src="assets/images/icons/profile-2user-black.svg"
                          className="flex size-6 shrink-0"
                          alt="icon"
                        />
                      </div>
                      <p className="placeholder font-medium text-monday-gray text-sm absolute -translate-y-1/2 left-[81px] top-[25px] group-has-[:placeholder-shown]:top-[36px] group-focus-within:top-[25px] transition-300">
                        Your full name
                      </p>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="appearance-none w-full h-[72px] font-semibold text-lg rounded-3xl border-[1.5px] border-monday-border pl-20 pr-6 pb-[14.5px] pt-[34.5px] placeholder-shown:pt-[14.5px] focus:border-monday-black transition-300"
                        placeholder=""
                      />
                    </label>

                    <label className="group relative">
                      <div className="flex items-center pr-4 absolute transform -translate-y-1/2 top-1/2 left-6 border-r-[1.5px] border-monday-border">
                        <img
                          src="assets/images/icons/sms-grey.svg"
                          className="flex size-6 shrink-0"
                          alt="icon"
                        />
                      </div>
                      <p className="placeholder font-medium text-monday-gray text-sm absolute -translate-y-1/2 left-[81px] top-[25px] group-has-[:placeholder-shown]:top-[36px] group-focus-within:top-[25px] transition-300">
                        Your email address
                      </p>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="appearance-none w-full h-[72px] font-semibold text-lg rounded-3xl border-[1.5px] border-monday-border pl-20 pr-6 pb-[14.5px] pt-[34.5px] placeholder-shown:pt-[14.5px] focus:border-monday-black transition-300"
                        placeholder=""
                      />
                    </label>

                    <label className="group relative">
                      <div className="flex items-center pr-4 absolute transform -translate-y-1/2 top-1/2 left-6 border-r-[1.5px] border-monday-border">
                        <img
                          src="assets/images/icons/call-grey.svg"
                          className="flex size-6 shrink-0"
                          alt="icon"
                        />
                      </div>
                      <p className="placeholder font-medium text-monday-gray text-sm absolute -translate-y-1/2 left-[81px] top-[25px] group-has-[:placeholder-shown]:top-[36px] group-focus-within:top-[25px] transition-300">
                        Your phone number
                      </p>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => {
                          // Only allow numbers (0-9)
                          const value = e.target.value.replace(/[^\d]/g, '');
                          setPhone(value);
                        }}
                        pattern="[0-9]*"
                        inputMode="numeric"
                        maxLength={15}
                        className="appearance-none w-full h-[72px] font-semibold text-lg rounded-3xl border-[1.5px] border-monday-border pl-20 pr-6 pb-[14.5px] pt-[34.5px] placeholder-shown:pt-[14.5px] focus:border-monday-black transition-300"
                        placeholder=""
                      />
                    </label>
                  </div>

                  <div className="flex items-center gap-3 justify-end">
                    <button
                      type="button"
                      className="btn btn-red font-semibold"
                      onClick={() => {
                        setEmail(user.email || "");
                        setPhone(user.phone || "");
                        setName(user.name || "");
                      }}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="btn btn-primary font-semibold"
                      disabled={updateMyProfile.isPending}
                    >
                      {updateMyProfile.isPending ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </div>

              <hr className="border-monday-border" />

              {/* Security Section */}
              <div className="flex flex-col gap-4">
                <h2 className="font-semibold text-xl">Security</h2>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between p-4 rounded-2xl border border-monday-border">
                    <div className="flex items-center gap-3">
                      <div className="flex size-14 rounded-full bg-monday-blue/10 items-center justify-center">
                        <img
                          src="assets/images/icons/lock-grey.svg"
                          className="size-6"
                          alt="icon"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="font-semibold text-lg">Change Password</p>
                        <p className="font-medium text-sm text-monday-gray">
                          Update your password to keep your account secure
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsPasswordModalOpen(true)}
                      className="btn btn-black font-semibold min-w-[130px]"
                    >
                      Change
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>

      {/* Change Password Modal */}
      {isPasswordModalOpen && (
        <div className="modal flex flex-1 items-center justify-center h-full fixed top-0 left-0 w-full z-50">
          <div
            onClick={() => {
              setIsPasswordModalOpen(false);
              setCurrentPassword("");
              setNewPassword("");
              setConfirmPassword("");
              setShowCurrentPassword(false);
              setShowNewPassword(false);
              setShowConfirmPassword(false);
              setShowPasswordErrorNotification(false);
              setPasswordErrorMessage("");
            }}
            className="backdrop absolute w-full h-full bg-[#292D32B2] cursor-pointer"
          />
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative flex flex-col w-[435px] shrink-0 rounded-3xl p-6 gap-3 bg-white"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 51
            }}
          >
            <div className="modal-header flex items-center justify-between">
              <p className="font-semibold text-xl">Change Password</p>
              <button
                onClick={() => {
                  setIsPasswordModalOpen(false);
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setShowCurrentPassword(false);
                  setShowNewPassword(false);
                  setShowConfirmPassword(false);
                  setShowPasswordErrorNotification(false);
                  setPasswordErrorMessage("");
                }}
                className="flex size-14 rounded-full items-center justify-center bg-monday-gray-background hover:bg-gray-200 transition-colors cursor-pointer"
                type="button"
                aria-label="Close modal"
              >
                <img
                  src="/assets/images/icons/close-circle-black.svg"
                  className="size-6"
                  alt="icon"
                />
              </button>
            </div>
            <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
              <div className="flex flex-col gap-4">
                <label className="group relative">
                  <div className="flex items-center pr-4 absolute transform -translate-y-1/2 top-1/2 left-6 border-r-[1.5px] border-monday-border">
                    <img
                      src="/assets/images/icons/key-grey.svg"
                      className="flex size-6 shrink-0"
                      alt="icon"
                    />
                  </div>
                  <p className="placeholder font-medium text-monday-gray text-sm absolute -translate-y-1/2 left-[81px] top-[25px] group-has-[:placeholder-shown]:top-[36px] group-focus-within:top-[25px] transition-300">
                    Current Password
                  </p>
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="appearance-none w-full h-[72px] font-semibold text-lg rounded-3xl border-[1.5px] border-monday-border pl-20 pr-16 pb-[14.5px] pt-[34.5px] placeholder-shown:pt-[14.5px] focus:border-monday-black transition-300 tracking-[0.3em]"
                    placeholder=""
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute transform -translate-y-1/2 top-1/2 right-6 hover:opacity-70 transition-opacity cursor-pointer"
                    aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                    style={{ 
                      zIndex: 20,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '24px',
                      height: '24px'
                    }}
                  >
                    {showCurrentPassword ? (
                      <svg 
                        className="size-6 shrink-0" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path 
                          d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" 
                          stroke="#6B7280" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        />
                        <path 
                          d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" 
                          stroke="#6B7280" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        />
                        <line 
                          x1="1" 
                          y1="1" 
                          x2="23" 
                          y2="23" 
                          stroke="#6B7280" 
                          strokeWidth="2" 
                          strokeLinecap="round"
                        />
                      </svg>
                    ) : (
                      <img
                        src="/assets/images/icons/eye-grey.svg"
                        className="size-6 shrink-0"
                        alt="Show password"
                        style={{ display: 'block', visibility: 'visible' }}
                      />
                    )}
                  </button>
                </label>

                <label className="group relative">
                  <div className="flex items-center pr-4 absolute transform -translate-y-1/2 top-1/2 left-6 border-r-[1.5px] border-monday-border">
                    <img
                      src="/assets/images/icons/key-grey.svg"
                      className="flex size-6 shrink-0"
                      alt="icon"
                    />
                  </div>
                  <p className="placeholder font-medium text-monday-gray text-sm absolute -translate-y-1/2 left-[81px] top-[25px] group-has-[:placeholder-shown]:top-[36px] group-focus-within:top-[25px] transition-300">
                    New Password
                  </p>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="appearance-none w-full h-[72px] font-semibold text-lg rounded-3xl border-[1.5px] border-monday-border pl-20 pr-16 pb-[14.5px] pt-[34.5px] placeholder-shown:pt-[14.5px] focus:border-monday-black transition-300 tracking-[0.3em]"
                    placeholder=""
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute transform -translate-y-1/2 top-1/2 right-6 hover:opacity-70 transition-opacity cursor-pointer"
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                    style={{ 
                      zIndex: 20,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '24px',
                      height: '24px'
                    }}
                  >
                    {showNewPassword ? (
                      <svg 
                        className="size-6 shrink-0" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path 
                          d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" 
                          stroke="#6B7280" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        />
                        <path 
                          d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" 
                          stroke="#6B7280" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        />
                        <line 
                          x1="1" 
                          y1="1" 
                          x2="23" 
                          y2="23" 
                          stroke="#6B7280" 
                          strokeWidth="2" 
                          strokeLinecap="round"
                        />
                      </svg>
                    ) : (
                      <img
                        src="/assets/images/icons/eye-grey.svg"
                        className="size-6 shrink-0"
                        alt="Show password"
                        style={{ display: 'block', visibility: 'visible' }}
                      />
                    )}
                  </button>
                </label>

                <label className="group relative">
                  <div className="flex items-center pr-4 absolute transform -translate-y-1/2 top-1/2 left-6 border-r-[1.5px] border-monday-border">
                    <img
                      src="/assets/images/icons/key-grey.svg"
                      className="flex size-6 shrink-0"
                      alt="icon"
                    />
                  </div>
                  <p className="placeholder font-medium text-monday-gray text-sm absolute -translate-y-1/2 left-[81px] top-[25px] group-has-[:placeholder-shown]:top-[36px] group-focus-within:top-[25px] transition-300">
                    Confirm New Password
                  </p>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="appearance-none w-full h-[72px] font-semibold text-lg rounded-3xl border-[1.5px] border-monday-border pl-20 pr-16 pb-[14.5px] pt-[34.5px] placeholder-shown:pt-[14.5px] focus:border-monday-black transition-300 tracking-[0.3em]"
                    placeholder=""
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute transform -translate-y-1/2 top-1/2 right-6 hover:opacity-70 transition-opacity cursor-pointer"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    style={{ 
                      zIndex: 20,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '24px',
                      height: '24px'
                    }}
                  >
                    {showConfirmPassword ? (
                      <svg 
                        className="size-6 shrink-0" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path 
                          d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" 
                          stroke="#6B7280" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        />
                        <path 
                          d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" 
                          stroke="#6B7280" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        />
                        <line 
                          x1="1" 
                          y1="1" 
                          x2="23" 
                          y2="23" 
                          stroke="#6B7280" 
                          strokeWidth="2" 
                          strokeLinecap="round"
                        />
                      </svg>
                    ) : (
                      <img
                        src="/assets/images/icons/eye-grey.svg"
                        className="size-6 shrink-0"
                        alt="Show password"
                        style={{ display: 'block', visibility: 'visible' }}
                      />
                    )}
                  </button>
                </label>
              </div>

              <div className="flex items-center gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsPasswordModalOpen(false);
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                    setShowCurrentPassword(false);
                    setShowNewPassword(false);
                    setShowConfirmPassword(false);
                    setShowPasswordErrorNotification(false);
                    setPasswordErrorMessage("");
                  }}
                  className="btn btn-red font-semibold"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary font-semibold"
                  disabled={changePassword.isPending}
                >
                  {changePassword.isPending ? "Changing..." : "Change Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {showToast && (
        <div 
          className="fixed inset-0 flex items-start justify-center pointer-events-none bg-transparent animate-[fadeIn_0.2s_ease-out]"
          style={{ zIndex: 99999 }}
        >
          <div className="pointer-events-auto transform transition-all duration-300 ease-out animate-[slideUp_0.3s_ease-out]">
            <div 
              className="flex flex-col items-center bg-white relative border border-gray-200"
              style={{
                zIndex: 100000,
                width: '380px',
                padding: '16px 24px',
                marginTop: '20px',
                borderRadius: '10px',
                boxShadow: `
                  0 20px 60px -12px rgba(0, 0, 0, 0.4),
                  0 0 0 1px rgba(0, 0, 0, 0.05),
                  inset 0 1px 2px rgba(255, 255, 255, 0.9)
                `
              }}
            >
              {/* Success Icon - Green Checkmark */}
              <div 
                className="flex items-center justify-center rounded-full border-[2px] border-white shadow-[0_4px_12px_rgba(34,197,94,0.4)] mb-3"
                style={{ 
                  width: '48px',
                  height: '48px',
                  backgroundColor: '#22c55e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                {/* White Checkmark SVG */}
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{
                    display: 'block',
                    flexShrink: 0
                  }}
                >
                  <path
                    d="M5 13L9 17L19 7"
                    stroke="rgb(255, 255, 255)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
              </div>

              {/* Text Content */}
              <div className="text-center mb-3" style={{ padding: '0 2px' }}>
                <h3 className="font-bold text-base text-gray-900 mb-1">Update Berhasil</h3>
                <p className="text-xs text-gray-600 leading-snug">Settings telah berhasil diperbarui dan disimpan.</p>
              </div>
              
              {/* Close Button */}
              <button
                onClick={() => setShowToast(false)}
                className="w-full px-4 py-1.5 rounded-md bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-semibold text-xs transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-[1.01] active:scale-[0.99]"
                aria-label="Close"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Change Success Notification */}
      <SuccessNotification
        isOpen={showPasswordSuccessNotification}
        onClose={() => setShowPasswordSuccessNotification(false)}
        title="Password Changed"
        message="Your password has been successfully changed."
      />

      {/* Password Change Error Notification */}
      <ErrorNotification
        isOpen={showPasswordErrorNotification}
        onClose={() => setShowPasswordErrorNotification(false)}
        title="Change Password Failed"
        message={passwordErrorMessage}
      />

      {/* Profile Update Error Notification */}
      <ErrorNotification
        isOpen={showErrorToast}
        onClose={() => setShowErrorToast(false)}
        title="Update Failed"
        message={errorMessage}
      />
    </>
  );
};

export default Settings;


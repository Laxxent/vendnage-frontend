import { useAuth } from "../hooks/useAuth";
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner";
import { authService } from "../api/authService";

const Login = () => {
  const { login, loading } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Check for success message from reset password
  useEffect(() => {
    if (location.state?.success) {
      setSuccessMessage(location.state.success);
      // Clear the message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    }
    if (location.state?.error) {
      setError(location.state.error);
    }
  }, [location.state]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoggingIn(true);

    try {
      await login(email, password);
      // Login successful - redirect will be handled by useRoleRedirect or useAuth
    } catch (error) {
      console.error("Login error:", error);
      // Always show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : "Login failed. Please check the information you entered.";
      setError(errorMessage);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSuccess(false);

    if (!resetEmail.trim()) {
      setResetError("Please enter your email address.");
      return;
    }

    if (!resetEmail.includes("@")) {
      setResetError("Please enter a valid email address.");
      return;
    }

    setIsResetting(true);
    try {
      await authService.resetPassword(resetEmail);
      setResetSuccess(true);
      setTimeout(() => {
        setIsResetModalOpen(false);
        setResetEmail("");
        setResetSuccess(false);
      }, 3000);
    } catch (error: any) {
      console.error("Reset password error:", error);
      setResetError(error.message || "Failed to send reset password email. Please try again.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleOpenResetModal = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResetModalOpen(true);
    setResetEmail("");
    setResetError(null);
    setResetSuccess(false);
  };

  const handleCloseResetModal = () => {
    setIsResetModalOpen(false);
    setResetEmail("");
    setResetError(null);
    setResetSuccess(false);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <main className="flex flex-1 h-screen items-center">
      <div className="flex flex-col h-screen overflow-hidden rounded-tr-[32px] pl-[30px] pt-[46px] w-[685px] shrink-0 blue-gradient">
        <p className="font-semibold text-lg text-monday-lime-green-char">
          — Manage Stock and Vending Machine
        </p>
        <p className="font-extrabold text-[42px] uppercase text-white mt-4 mb-[30px]">
          Optimized Inventory,
          <br />
          Effortless Workflow {" "}
        </p>
        <div className="flex flex-1 overflow-hidden rounded-tl-[20px]">
          <img
            src="/assets/images/backgrounds/bg-image-2.png"
            className="size-full object-cover object-left-top"
            alt="image"
          />
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <form
          onSubmit={handleLogin}
          className="flex flex-col w-[435px] shrink-0 rounded-3xl gap-3 p-6 bg-white"
        >
          <img
            src="/assets/images/logos/vendnage2-logo.png"
            className="w-[280px] mx-auto mb-2"
            alt="VENDNAGE logo"
          />
          <div className="flex flex-col gap-[30px]">
            <div className="flex flex-col gap-3 text-center">
              <p className="font-semibold text-2xl">Hey🙌🏻, Welcome Back!</p>
              <p className="font-medium text-monday-gray">
                Login to your account to continue!
              </p>
            </div>
            <div className="flex flex-col gap-4 w-full">
              <label className="group relative">
                <div className="flex items-center pr-4 absolute transform -translate-y-1/2 top-1/2 left-6 border-r-[1.5px] border-monday-border ">
                  <img
                    src="/assets/images/icons/sms-grey.svg"
                    className="flex size-6 shrink-0"
                    alt="icon"
                  />
                </div>
                <p className="placeholder font-medium text-monday-gray text-sm absolute -translate-y-1/2 left-[81px] top-[25px] group-has-[:placeholder-shown]:top-[36px] group-focus-within:top-[25px] transition-300">
                  Your email address
                </p>
                <input
                  required
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  value={email}
                  disabled={isLoggingIn}
                  className="appearance-none w-full h-[72px] font-semibold text-lg rounded-3xl border-[1.5px] border-monday-border pl-20 pr-6 pb-[14.5px] pt-[34.5px] placeholder-shown:pt-[14.5px] focus:border-monday-black transition-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder=""
                />
              </label>
              <label className="group relative">
                <div className="flex items-center pr-4 absolute transform -translate-y-1/2 top-1/2 left-6 border-r-[1.5px] border-monday-border ">
                  <img
                    src="/assets/images/icons/lock-grey.svg"
                    className="flex size-6 shrink-0"
                    alt="icon"
                  />
                </div>
                <p className="placeholder font-medium text-monday-gray text-sm absolute -translate-y-1/2 left-[81px] top-[25px] group-has-[:placeholder-shown]:top-[36px] group-focus-within:top-[25px] transition-300">
                  Your password
                </p>
                <input
                  id="passwordInput"
                  type={showPassword ? "text" : "password"}
                  required
                  onChange={(e) => setPassword(e.target.value)}
                  value={password}
                  disabled={isLoggingIn}
                  className="appearance-none w-full h-[72px] font-semibold text-lg rounded-3xl border-[1.5px] border-monday-border pl-20 pr-16 pb-[14.5px] pt-[34.5px] placeholder-shown:pt-[14.5px] focus:border-monday-black transition-300 tracking-[0.3em] disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder=""
                />
                <button
                  id="togglePassword"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoggingIn}
                  className="absolute transform -translate-y-1/2 top-1/2 right-6 hover:opacity-70 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  style={{ 
                    zIndex: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '24px',
                    height: '24px'
                  }}
                >
                  {showPassword ? (
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
              <p className="font-medium text-sm text-monday-gray">
                Forget Password?{" "}
                <button
                  type="button"
                  onClick={handleOpenResetModal}
                  className="font-semibold text-monday-blue hover:underline bg-transparent border-none p-0 cursor-pointer"
                >
                  Reset Password
                </button>
              </p>
            </div>
            {successMessage && (
              <div className="w-full py-2 px-3 rounded-lg bg-green-50 border border-green-200">
                <p className="text-xs font-medium text-center" style={{ color: '#22c55e' }}>
                  {successMessage}
                </p>
              </div>
            )}
            {error && (
              <div className="w-full py-2 px-3 rounded-lg bg-red-50">
                <p className="text-xs font-medium text-center" style={{ color: '#ef4444' }}>
                  {error}
                </p>
              </div>
            )}
            <button 
              type="submit" 
              className="btn btn-primary w-full font-bold"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? "Logging in..." : "Sign In"}
            </button>
          </div>
        </form>
      </div>

      {/* Reset Password Modal */}
      {isResetModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={handleCloseResetModal}
          style={{ zIndex: 9999 }}
        >
          <div
            className="flex flex-col w-[435px] shrink-0 rounded-3xl gap-3 p-6"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#f3f4f6',
              boxShadow: '0 20px 60px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 0, 0, 0.1)',
              zIndex: 10000
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-2xl">Reset Password</h2>
              <button
                type="button"
                onClick={handleCloseResetModal}
                className="flex items-center justify-center size-8 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Close modal"
              >
                <img
                  src="/assets/images/icons/close-circle-black.svg"
                  className="size-5"
                  alt="close"
                />
              </button>
            </div>

            {resetSuccess ? (
              <div className="flex flex-col gap-4 items-center py-4">
                <div className="flex items-center justify-center size-24 rounded-full bg-green-100">
                  <img
                    src="/assets/images/icons/Checklist-green-circle.svg"
                    className="size-16"
                    alt="success"
                  />
                </div>
                <div className="flex flex-col gap-2 text-center">
                  <p className="font-semibold text-lg">Email Sent!</p>
                  <p className="font-medium text-sm text-monday-gray">
                    We've sent a password reset link to <strong>{resetEmail}</strong>. Please check your email.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
                <p className="font-medium text-sm text-monday-gray">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
                <label className="group relative">
                  <div className="flex items-center pr-4 absolute transform -translate-y-1/2 top-1/2 left-6 border-r-[1.5px] border-monday-border">
                    <img
                      src="/assets/images/icons/sms-grey.svg"
                      className="flex size-6 shrink-0"
                      alt="icon"
                    />
                  </div>
                  <p className="placeholder font-medium text-monday-gray text-sm absolute -translate-y-1/2 left-[81px] top-[25px] group-has-[:placeholder-shown]:top-[36px] group-focus-within:top-[25px] transition-300">
                    Your email address
                  </p>
                  <input
                    required
                    onChange={(e) => setResetEmail(e.target.value)}
                    type="email"
                    value={resetEmail}
                    className="appearance-none w-full h-[72px] font-semibold text-lg rounded-3xl border-[1.5px] border-monday-border pl-20 pr-6 pb-[14.5px] pt-[34.5px] placeholder-shown:pt-[14.5px] focus:border-monday-black transition-300 bg-white"
                    placeholder=""
                    autoFocus
                  />
                </label>
                {resetError && (
                  <div className="w-full py-2 px-3 rounded-lg bg-red-50">
                    <p className="text-xs font-medium text-center" style={{ color: '#ef4444' }}>
                      {resetError}
                    </p>
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleCloseResetModal}
                    className="btn btn-black flex-1 font-semibold"
                    disabled={isResetting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary flex-1 font-semibold"
                    disabled={isResetting}
                  >
                    {isResetting ? "Sending..." : "Send Reset Link"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
};

export default Login;

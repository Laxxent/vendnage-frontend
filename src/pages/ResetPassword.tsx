import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authService } from "../api/authService";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Decode email from URL (it might be URL encoded)
  const token = searchParams.get("token");
  const emailParam = searchParams.get("email");
  const email = emailParam ? decodeURIComponent(emailParam) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password || !passwordConfirmation) {
      setError("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== passwordConfirmation) {
      setError("Passwords do not match.");
      return;
    }

    if (!token || !email) {
      setError("Invalid reset password link.");
      return;
    }

    setIsResetting(true);
    try {
      await authService.resetPasswordSubmit(token, email, password, passwordConfirmation);
      setIsSuccess(true);
      setTimeout(() => {
        navigate("/login", { 
          replace: true,
          state: { success: "Password has been reset successfully. Please login with your new password." }
        });
      }, 3000);
    } catch (error: any) {
      console.error("Reset password error:", error);
      const errorMessage = error.message || "Failed to reset password. Please try again.";
      setError(errorMessage);
    } finally {
      setIsResetting(false);
    }
  };

  // If no token or email, show error message instead of redirecting
  if (!token || !email) {
    return (
      <main className="flex flex-1 h-screen items-center">
        <div className="flex flex-col h-screen overflow-hidden rounded-tr-[32px] pl-[30px] pt-[46px] w-[685px] shrink-0 blue-gradient">
          <p className="font-semibold text-lg text-monday-lime-green-char">
            — Manage Stock and Merchants
          </p>
          <p className="font-extrabold text-[42px] uppercase text-white mt-4 mb-[30px]">
            Optimized Inventory,
            <br />
            Effortless Workflow 🎯{" "}
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
          <div className="flex flex-col w-[435px] shrink-0 rounded-3xl gap-3 p-6 bg-white">
            <img
              src="/assets/images/logos/vendnage2-logo.png"
              className="w-[280px] mx-auto mb-2"
              alt="VENDNAGE logo"
            />
            <div className="flex flex-col gap-6 items-center py-4">
              <div className="flex items-center justify-center size-24 rounded-full bg-red-100">
                <svg
                  className="size-16 text-red-600"
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
              <div className="flex flex-col gap-2 text-center">
                <p className="font-semibold text-lg text-red-600">Invalid Reset Link</p>
                <p className="font-medium text-sm text-monday-gray">
                  The reset password link is invalid or has expired. Please request a new password reset link.
                </p>
              </div>
              <button
                onClick={() => navigate("/login")}
                className="btn btn-primary font-semibold mt-4"
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (isSuccess) {
    return (
      <main className="flex flex-1 h-screen items-center">
        <div className="flex flex-col h-screen overflow-hidden rounded-tr-[32px] pl-[30px] pt-[46px] w-[685px] shrink-0 blue-gradient">
          <p className="font-semibold text-lg text-monday-lime-green-char">
            — Manage Stock and Merchants
          </p>
          <p className="font-extrabold text-[42px] uppercase text-white mt-4 mb-[30px]">
            Optimized Inventory,
            <br />
            Effortless Workflow 🎯{" "}
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
          <div className="flex flex-col w-[435px] shrink-0 rounded-3xl gap-3 p-6 bg-white">
            <img
              src="/assets/images/logos/vendnage2-logo.png"
              className="w-[280px] mx-auto mb-2"
              alt="VENDNAGE logo"
            />
            <div className="flex flex-col gap-6 items-center py-4">
              <div className="flex items-center justify-center size-24 rounded-full bg-green-100">
                <img
                  src="/assets/images/icons/Checklist-green-circle.svg"
                  className="size-16"
                  alt="success"
                />
              </div>
              <div className="flex flex-col gap-2 text-center">
                <p className="font-semibold text-lg">Password Reset Successful!</p>
                <p className="font-medium text-sm text-monday-gray">
                  Your password has been successfully reset. You will be redirected to the login page shortly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 h-screen items-center">
      <div className="flex flex-col h-screen overflow-hidden rounded-tr-[32px] pl-[30px] pt-[46px] w-[685px] shrink-0 blue-gradient">
        <p className="font-semibold text-lg text-monday-lime-green-char">
          — Manage Stock and Merchants
        </p>
        <p className="font-extrabold text-[42px] uppercase text-white mt-4 mb-[30px]">
          Optimized Inventory,
          <br />
          Effortless Workflow 🎯{" "}
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
          onSubmit={handleSubmit}
          className="flex flex-col w-[435px] shrink-0 rounded-3xl gap-3 p-6 bg-white"
        >
          <img
            src="/assets/images/logos/vendnage2-logo.png"
            className="w-[280px] mx-auto mb-2"
            alt="VENDNAGE logo"
          />
          <div className="flex flex-col gap-[30px]">
            <div className="flex flex-col gap-3 text-center">
              <p className="font-semibold text-2xl">Reset Your Password</p>
              <p className="font-medium text-monday-gray">
                Enter your new password below
              </p>
            </div>
            <div className="flex flex-col gap-4 w-full">
              <label className="group relative">
                <div className="flex items-center pr-4 absolute transform -translate-y-1/2 top-1/2 left-6 border-r-[1.5px] border-monday-border ">
                  <img
                    src="/assets/images/icons/lock-grey.svg"
                    className="flex size-6 shrink-0"
                    alt="icon"
                  />
                </div>
                <p className="placeholder font-medium text-monday-gray text-sm absolute -translate-y-1/2 left-[81px] top-[25px] group-has-[:placeholder-shown]:top-[36px] group-focus-within:top-[25px] transition-300">
                  New Password
                </p>
                <input
                  id="passwordInput"
                  type={showPassword ? "text" : "password"}
                  required
                  onChange={(e) => setPassword(e.target.value)}
                  value={password}
                  disabled={isResetting}
                  className="appearance-none w-full h-[72px] font-semibold text-lg rounded-3xl border-[1.5px] border-monday-border pl-20 pr-16 pb-[14.5px] pt-[34.5px] placeholder-shown:pt-[14.5px] focus:border-monday-black transition-300 tracking-[0.3em] disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder=""
                  minLength={6}
                />
                <button
                  id="togglePassword"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isResetting}
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

              <label className="group relative">
                <div className="flex items-center pr-4 absolute transform -translate-y-1/2 top-1/2 left-6 border-r-[1.5px] border-monday-border ">
                  <img
                    src="/assets/images/icons/lock-grey.svg"
                    className="flex size-6 shrink-0"
                    alt="icon"
                  />
                </div>
                <p className="placeholder font-medium text-monday-gray text-sm absolute -translate-y-1/2 left-[81px] top-[25px] group-has-[:placeholder-shown]:top-[36px] group-focus-within:top-[25px] transition-300">
                  Confirm New Password
                </p>
                <input
                  id="passwordConfirmationInput"
                  type={showPasswordConfirmation ? "text" : "password"}
                  required
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  value={passwordConfirmation}
                  disabled={isResetting}
                  className="appearance-none w-full h-[72px] font-semibold text-lg rounded-3xl border-[1.5px] border-monday-border pl-20 pr-16 pb-[14.5px] pt-[34.5px] placeholder-shown:pt-[14.5px] focus:border-monday-black transition-300 tracking-[0.3em] disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder=""
                  minLength={6}
                />
                <button
                  id="togglePasswordConfirmation"
                  type="button"
                  onClick={() => setShowPasswordConfirmation(!showPasswordConfirmation)}
                  disabled={isResetting}
                  className="absolute transform -translate-y-1/2 top-1/2 right-6 hover:opacity-70 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={showPasswordConfirmation ? "Hide password" : "Show password"}
                  style={{ 
                    zIndex: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '24px',
                    height: '24px'
                  }}
                >
                  {showPasswordConfirmation ? (
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

              {error && (
                <div className="w-full py-2 px-3 rounded-lg bg-red-50">
                  <p className="text-xs font-medium text-center" style={{ color: '#ef4444' }}>
                    {error}
                  </p>
                </div>
              )}
            </div>
            <button 
              type="submit" 
              className="btn btn-primary w-full font-bold"
              disabled={isResetting}
            >
              {isResetting ? "Resetting..." : "Reset Password"}
            </button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="font-medium text-sm text-monday-gray hover:text-monday-blue transition-colors"
                disabled={isResetting}
              >
                Back to Login
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
};

export default ResetPassword;


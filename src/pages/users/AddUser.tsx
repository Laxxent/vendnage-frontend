import { useCreateUser } from "../../hooks/useUsers";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserFormData, userSchema } from "../../schemas/userSchema";
import { AxiosError } from "axios";
import { ApiErrorResponse } from "../../types/types";
import UserProfileCard from "../../components/UserProfileCard";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";

const AddUser = () => {
  const { mutate: createUser, isPending } = useCreateUser();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [imagePreview, setImagePreview] = useState(
    "/assets/images/icons/gallery-grey.svg"
  );
  const [showToast, setShowToast] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
  });

  const onSubmit = (data: UserFormData) => {
    setError("root", { type: "server", message: "" });

    createUser(data, {
      onSuccess: () => {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      },
      onError: (error: AxiosError<ApiErrorResponse>) => {
        if (error.response) {
          const { message, errors } = error.response.data;

          if (message) {
            setError("root", { type: "server", message });
          }

          if (errors) {
            Object.entries(errors).forEach(([key, messages]) => {
              setError(key as keyof UserFormData, {
                type: "server",
                message: messages[0],
              });
            });
          }
        }
      },
    });
  };

  return (
    <>
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
              
              <div className="text-center mb-3" style={{ padding: '0 2px' }}>
                <h3 className="font-bold text-base text-gray-900 mb-1">Tambah Berhasil</h3>
                <p className="text-xs text-gray-600 leading-snug">Data user telah berhasil ditambahkan dan disimpan.</p>
              </div>
              
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
      <div
        id="Top-Bar"
        className="flex items-center w-full gap-6 mt-[30px] mb-6"
      >
        <div className="flex items-center gap-6 h-[92px] bg-white w-full rounded-3xl p-[18px]">
          <div className="flex flex-col gap-[6px] w-full">
            <h1 className="font-bold text-2xl">Add New User</h1>
            <Link to={'/users'}
              className="flex items-center gap-[6px] text-monday-gray font-semibold"
            >
              <img
                src="/assets/images/icons/arrow-left-grey.svg"
                className="size-4 flex shrink-0"
                alt="icon"
              />
              Manage Users
            </Link>
          </div>
        </div>
        <UserProfileCard />
      </div>
      <main className="flex flex-col gap-6 flex-1">
        <section
          id="Add-User"
          className="flex flex-col gap-6 flex-1 rounded-3xl p-[18px] px-0 bg-white"
        >
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col w-full gap-5 px-[18px]"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-xl capitalize">
                Complete the form
              </h2>
              <button
                type="button"
                onClick={() => setShowGuideModal(true)}
                className="flex items-center justify-center size-10 rounded-full bg-monday-gray-background hover:bg-monday-gray transition-colors cursor-pointer flex-shrink-0"
                title="Quick Guide to Add User"
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
            <div className="flex items-center justify-between w-full">
              <div className="group relative flex size-[100px] rounded-2xl overflow-hidden items-center justify-center bg-monday-background">
                <img
                  id="Thumbnail"
                  src={imagePreview}
                  className="size-full object-contain"
                  alt="icon"
                />
                <input
                  type="file"
                  id="File-Input"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setValue("photo", file);
                      setImagePreview(URL.createObjectURL(file));
                    } else {
                      setImagePreview(
                        "/assets/images/icons/gallery-grey.svg"
                      );
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-black w-[152px] font-semibold text-nowrap"
              >
                {imagePreview !== "/assets/images/icons/gallery-grey.svg"
                  ? "Change Photo"
                  : "Add Photo"}
              </button>
            </div>
            {errors.photo && (
              <p className="text-red-500">{errors.photo.message as string}</p>
            )}

            <label className="group relative">
              <div className="flex items-center pr-4 absolute transform -translate-y-1/2 top-1/2 left-6 border-r-[1.5px] border-monday-border ">
                <img
                  src="/assets/images/icons/profile-grey.svg"
                  className="flex size-6 shrink-0"
                  alt="icon"
                />
              </div>
              <p className="placeholder font-medium text-monday-gray text-sm absolute -translate-y-1/2 left-[81px] top-[25px] group-has-[:placeholder-shown]:top-[36px] group-focus-within:top-[25px] transition-300">
                Full Name
              </p>
              <input
                {...register("name")}
                type="text"
                className="appearance-none w-full h-[72px] font-semibold text-lg rounded-3xl border-[1.5px] border-monday-border pl-20 pr-6 pb-[14.5px] pt-[34.5px] placeholder-shown:pt-[14.5px] focus:border-monday-black transition-300"
                placeholder=""
              />
            </label>
            {errors.name && (
              <p className="text-red-500">{errors.name.message as string}</p>
            )}

            <label className="group relative">
              <div className="flex items-center pr-4 absolute transform -translate-y-1/2 top-1/2 left-6 border-r-[1.5px] border-monday-border ">
                <img
                  src="/assets/images/icons/call-grey.svg"
                  className="flex size-6 shrink-0"
                  alt="icon"
                />
              </div>
              <p className="placeholder font-medium text-monday-gray text-sm absolute -translate-y-1/2 left-[81px] top-[25px] group-has-[:placeholder-shown]:top-[36px] group-focus-within:top-[25px] transition-300">
                Phone Number
              </p>
              <input
                type="tel"
                {...register("phone", {
                  onChange: (e) => {
                    // Only allow numbers (0-9)
                    e.target.value = e.target.value.replace(/[^\d]/g, '');
                  }
                })}
                pattern="[0-9]*"
                inputMode="numeric"
                maxLength={15}
                className="appearance-none w-full h-[72px] font-semibold text-lg rounded-3xl border-[1.5px] border-monday-border pl-20 pr-6 pb-[14.5px] pt-[34.5px] placeholder-shown:pt-[14.5px] focus:border-monday-black transition-300"
                placeholder=""
              />
            </label>
            {errors.phone && (
              <p className="text-red-500">{errors.phone.message as string}</p>
            )}

            <label className="group relative">
              <div className="flex items-center pr-4 absolute transform -translate-y-1/2 top-1/2 left-6 border-r-[1.5px] border-monday-border ">
                <img
                  src="/assets/images/icons/sms-grey.svg"
                  className="flex size-6 shrink-0"
                  alt="icon"
                />
              </div>
              <p className="placeholder font-medium text-monday-gray text-sm absolute -translate-y-1/2 left-[81px] top-[25px] group-has-[:placeholder-shown]:top-[36px] group-focus-within:top-[25px] transition-300">
                Email Address
              </p>
              <input
                {...register("email")}
                type="email"
                className="appearance-none w-full h-[72px] font-semibold text-lg rounded-3xl border-[1.5px] border-monday-border pl-20 pr-6 pb-[14.5px] pt-[34.5px] placeholder-shown:pt-[14.5px] focus:border-monday-black transition-300"
                placeholder=""
              />
            </label>
            {errors.email && (
              <p className="text-red-500">{errors.email.message as string}</p>
            )}

            <label className="group relative">
              <div className="flex items-center pr-4 absolute transform -translate-y-1/2 top-1/2 left-6 border-r-[1.5px] border-monday-border ">
                <img
                  src="/assets/images/icons/key-grey.svg"
                  className="flex size-6 shrink-0"
                  alt="icon"
                />
              </div>
              <p className="placeholder font-medium text-monday-gray text-sm absolute -translate-y-1/2 left-[81px] top-[25px] group-has-[:placeholder-shown]:top-[36px] group-focus-within:top-[25px] transition-300">
                Password
              </p>
              <input
                {...register("password")}
                type={showPassword ? "text" : "password"}
                className="appearance-none w-full h-[72px] font-semibold text-lg rounded-3xl border-[1.5px] border-monday-border pl-20 pr-16 pb-[14.5px] pt-[34.5px] placeholder-shown:pt-[14.5px] focus:border-monday-black transition-300 tracking-[0.3em]"
                placeholder=""
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute transform -translate-y-1/2 top-1/2 right-6 hover:opacity-70 transition-opacity cursor-pointer"
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
            {errors.password && (
              <p className="text-red-500">{errors.password.message as string}</p>
            )}

            <label className="group relative">
              <div className="flex items-center pr-4 absolute transform -translate-y-1/2 top-1/2 left-6 border-r-[1.5px] border-monday-border ">
                <img
                  src="/assets/images/icons/key-grey.svg"
                  className="flex size-6 shrink-0"
                  alt="icon"
                />
              </div>
              <p className="placeholder font-medium text-monday-gray text-sm absolute -translate-y-1/2 left-[81px] top-[25px] group-has-[:placeholder-shown]:top-[36px] group-focus-within:top-[25px] transition-300">
                Password Confirmation
              </p>
              <input
                {...register("password_confirmation")}
                type={showPasswordConfirmation ? "text" : "password"}
                className="appearance-none w-full h-[72px] font-semibold text-lg rounded-3xl border-[1.5px] border-monday-border pl-20 pr-16 pb-[14.5px] pt-[34.5px] placeholder-shown:pt-[14.5px] focus:border-monday-black transition-300 tracking-[0.3em]"
                placeholder=""
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPasswordConfirmation(!showPasswordConfirmation)}
                className="absolute transform -translate-y-1/2 top-1/2 right-6 hover:opacity-70 transition-opacity cursor-pointer"
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
            {errors.password_confirmation && (
              <p className="text-red-500">
                {errors.password_confirmation.message as string}
              </p>
            )}

            <div className="flex items-center justify-end gap-4">
              <Link to={'/users'}
                className="btn btn-red font-semibold"
              >
                Cancel
              </Link>
              <button type="submit" className="btn btn-primary font-semibold">
                {isPending ? "Saving..." : "Save User"}
              </button>
            </div>
          </form>
        </section>
      </main>

      {showGuideModal && (
        <div className="modal flex flex-1 items-center justify-center h-full fixed top-0 w-full z-50">
          <div
            onClick={() => setShowGuideModal(false)}
            className="absolute w-full h-full bg-[#292D32B2] cursor-pointer"
          />
          <div className="relative flex flex-col w-[500px] shrink-0 rounded-3xl p-[18px] gap-5 bg-white max-h-[90vh] overflow-y-auto">
            <div className="modal-header flex items-center justify-between">
              <p className="font-semibold text-xl">Quick Guide to Add User</p>
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
                    Enter user details accurately and completely to ensure proper account setup
                  </p>
                </li>
                <li className="flex gap-[6px]">
                  <img
                    src="/assets/images/icons/Checklist-green-circle.svg"
                    className="flex size-6 shrink-0"
                    alt="icon"
                  />
                  <p className="font-medium leading-[140%]">
                    Assign an appropriate role to ensure proper access and permissions
                  </p>
                </li>
                <li className="flex gap-[6px]">
                  <img
                    src="/assets/images/icons/Checklist-green-circle.svg"
                    className="flex size-6 shrink-0"
                    alt="icon"
                  />
                  <p className="font-medium leading-[140%]">
                    Create a secure password with minimum 6 characters to ensure account protection
                  </p>
                </li>
                <li className="flex gap-[6px]">
                  <img
                    src="/assets/images/icons/Checklist-green-circle.svg"
                    className="flex size-6 shrink-0"
                    alt="icon"
                  />
                  <p className="font-medium leading-[140%]">
                    Ensure email and phone number are correct and valid for communication
                  </p>
                </li>
                <li className="flex gap-[6px]">
                  <img
                    src="/assets/images/icons/Checklist-green-circle.svg"
                    className="flex size-6 shrink-0"
                    alt="icon"
                  />
                  <p className="font-medium leading-[140%]">
                    Thoroughly review all details before creating to ensure accuracy and prevent errors
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

export default AddUser;

import { useEffect, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useFetchUser, useUpdateUser } from "../../hooks/useUsers";
import { useFetchRoles } from "../../hooks/useRoles";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { EditUserFormData, editUserSchema } from "../../schemas/editUserSchema";
import { AxiosError } from "axios";
import { ApiErrorResponse } from "../../types/types";
import UserProfileCard from "../../components/UserProfileCard";

const EditUser = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: user, isPending: isUserLoading } = useFetchUser(Number(id));
  const { data: roles = [], isPending: isRolesLoading } = useFetchRoles();
  const { mutate: updateUser, isPending: isUpdating } = useUpdateUser();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [imagePreview, setImagePreview] = useState(
    "/assets/images/icons/gallery-grey.svg"
  );
  const [showToast, setShowToast] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
  });

  useEffect(() => {
    if (user) {
      setValue("name", user.name);
      setValue("phone", user.phone);
      setValue("email", user.email);
      // Set role (use first role name if multiple roles exist)
      if (user.roles && user.roles.length > 0) {
        setValue("role", user.roles[0]);
      }
      if (user.photo) {
        setImagePreview(user.photo);  
      }
    }
  }, [user, setValue]);

  const onSubmit = (data: EditUserFormData) => {
    updateUser(
      { id: Number(id), ...data },
      {
        onSuccess: () => {
          setShowToast(true);
          setTimeout(() => {
            setShowToast(false);
            navigate("/users");
          }, 2000);
        },
        onError: (error: AxiosError<ApiErrorResponse>) => {
          if (error.response?.data.errors) {
            Object.entries(error.response.data.errors).forEach(
              ([key, messages]) => {
                setError(key as keyof EditUserFormData, {
                  type: "server",
                  message: messages[0],
                });
              }
            );
          }
        },
      }
    );
  };

  if (isUserLoading) {
    return (
      <>
        <div
          id="Top-Bar"
          className="flex items-center w-full gap-6 mt-[30px] mb-6"
        >
          <div className="flex items-center gap-6 h-[92px] bg-white w-full rounded-3xl p-[18px]">
            <div className="flex flex-col gap-[6px] w-full">
              <div className="h-8 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-lg w-48 animate-pulse"></div>
            </div>
            <div className="flex items-center flex-nowrap gap-3">
              <div className="size-14 rounded-full bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse"></div>
              <div className="size-14 rounded-full bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse"></div>
            </div>
          </div>
          <UserProfileCard />
        </div>
        <main className="flex flex-col gap-6 flex-1">
          <section className="flex flex-col gap-6 flex-1 rounded-3xl p-[18px] px-0 bg-white">
            <div className="flex flex-col gap-[6px]">
              <div className="h-7 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-lg w-40 animate-pulse"></div>
              <div className="h-5 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-lg w-64 animate-pulse"></div>
            </div>
            <hr className="border-monday-border" />
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-4">
                <div className="h-6 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-lg w-48 animate-pulse"></div>
                <div className="flex flex-col gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className="h-[72px] bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-3xl animate-pulse"
                    ></div>
                  ))}
                </div>
                <div className="flex items-center gap-3 justify-end mt-4">
                  <div className="h-12 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-xl w-32 animate-pulse"></div>
                  <div className="h-12 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-xl w-32 animate-pulse"></div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </>
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
              <h1 className="font-bold text-2xl">Edit User</h1>
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
            id="Edit-User"
            className="flex flex-col gap-6 flex-1 rounded-3xl p-[18px] px-0 bg-white"
          >
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex flex-col w-full gap-5 px-[18px]"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-xl capitalize">Complete The Form</h2>
                <button
                  type="button"
                  onClick={() => setShowGuideModal(true)}
                  className="flex items-center justify-center size-10 rounded-full bg-monday-gray-background hover:bg-monday-gray transition-colors cursor-pointer flex-shrink-0"
                  title="Quick Guide to Edit User"
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
                        setValue("photo", file); // ✅ update react-hook-form
                        setImagePreview(URL.createObjectURL(file)); // ✅ update preview
                      } else {
                        setImagePreview(
                          "/assets/images/icons/gallery-grey.svg"
                        ); // fallback
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

              {/* Role Dropdown */}
              <label className="group relative">
                <div className="flex items-center pr-4 absolute transform -translate-y-1/2 top-1/2 left-6 border-r-[1.5px] border-monday-border z-10 bg-white">
                  <img
                    src="/assets/images/icons/profile-grey.svg"
                    className="flex size-6 shrink-0"
                    alt="icon"
                  />
                </div>
                <p className="placeholder font-medium text-monday-gray text-sm absolute -translate-y-1/2 left-[81px] top-[25px] transition-300 z-10 bg-white px-1">
                  Role
                </p>
                <select
                  {...register("role")}
                  disabled={isRolesLoading}
                  className="w-full h-[72px] font-semibold text-lg rounded-3xl border-[1.5px] border-monday-border pl-20 pr-12 pb-[14.5px] pt-[34.5px] focus:border-monday-black transition-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                >
                  {isRolesLoading ? (
                    <option value="">Loading roles...</option>
                  ) : roles.length === 0 ? (
                    <option value="">No roles available</option>
                  ) : (
                    roles.map((role: any) => (
                      <option key={role.id} value={role.name}>
                        {role.name}
                      </option>
                    ))
                  )}
                </select>
              </label>
              {errors.role && (
                <p className="text-red-500">{errors.role.message as string}</p>
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
                  type="password"
                  className="appearance-none w-full h-[72px] font-semibold text-lg rounded-3xl border-[1.5px] border-monday-border pl-20 pr-6 pb-[14.5px] pt-[34.5px] placeholder-shown:pt-[14.5px] focus:border-monday-black transition-300 tracking-[0.3em]"
                  placeholder=""
                />
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
                  type="password"
                  className="appearance-none w-full h-[72px] font-semibold text-lg rounded-3xl border-[1.5px] border-monday-border pl-20 pr-6 pb-[14.5px] pt-[34.5px] placeholder-shown:pt-[14.5px] focus:border-monday-black transition-300 tracking-[0.3em]"
                  placeholder=""
                />
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
                  {isUpdating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </section>
        </main>

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
                <p className="text-xs text-gray-600 leading-snug">Data user telah berhasil diperbarui dan disimpan.</p>
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

      {/* Guide Modal */}
      {showGuideModal && (
        <div className="modal flex flex-1 items-center justify-center h-full fixed top-0 w-full z-50">
          <div
            onClick={() => setShowGuideModal(false)}
            className="absolute w-full h-full bg-[#292D32B2] cursor-pointer"
          />
          <div className="relative flex flex-col w-[500px] shrink-0 rounded-3xl p-[18px] gap-5 bg-white max-h-[90vh] overflow-y-auto">
            <div className="modal-header flex items-center justify-between">
              <p className="font-semibold text-xl">Quick Guide to Edit User</p>
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
                    Update user details accurately and completely to ensure proper account information
                  </p>
                </li>
                <li className="flex gap-[6px]">
                  <img
                    src="/assets/images/icons/Checklist-green-circle.svg"
                    className="flex size-6 shrink-0"
                    alt="icon"
                  />
                  <p className="font-medium leading-[140%]">
                    Update the user role if necessary to ensure proper access and permissions
                  </p>
                </li>
                <li className="flex gap-[6px]">
                  <img
                    src="/assets/images/icons/Checklist-green-circle.svg"
                    className="flex size-6 shrink-0"
                    alt="icon"
                  />
                  <p className="font-medium leading-[140%]">
                    Only update password if needed, ensuring it meets security requirements
                  </p>
                </li>
                <li className="flex gap-[6px]">
                  <img
                    src="/assets/images/icons/Checklist-green-circle.svg"
                    className="flex size-6 shrink-0"
                    alt="icon"
                  />
                  <p className="font-medium leading-[140%]">
                    Verify email and phone number are correct and valid for communication
                  </p>
                </li>
                <li className="flex gap-[6px]">
                  <img
                    src="/assets/images/icons/Checklist-green-circle.svg"
                    className="flex size-6 shrink-0"
                    alt="icon"
                  />
                  <p className="font-medium leading-[140%]">
                    Thoroughly review all changes before saving to ensure accuracy and prevent errors
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

export default EditUser;

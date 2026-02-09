import { useEffect, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useFetchBrand, useUpdateBrand } from "../../hooks/useBrands";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { EditBrandFormData, editBrandSchema } from "../../schemas/editBrandSchema";
import { AxiosError } from "axios";
import { ApiErrorResponse } from "../../types/types"; 
import UserProfileCard from "../../components/UserProfileCard";
import LoadingSpinner from "../../components/LoadingSpinner";

const EditBrand = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: brand, isPending } = useFetchBrand(Number(id));
  const { mutate: updateBrand, isPending: isUpdating } = useUpdateBrand();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [imagePreview, setImagePreview] = useState(
    "/assets/images/icons/gallery-grey.svg"
  );
  const [showToast, setShowToast] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  // ✅ React Hook Form Setup
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    reset,
    formState: { errors },
  } = useForm<EditBrandFormData>({
    resolver: zodResolver(editBrandSchema),
    defaultValues: { name: "", tagline: "" },
  });

  // ✅ Populate form fields when brand data is available
  useEffect(() => {
    if (brand) {
      const formData = {
        name: brand.name || "",
        tagline: brand.tagline || "",
        photo: undefined,
      };
      reset(formData);
      setValue("photo", undefined, { shouldValidate: false });
      if (brand.photo) {
        setImagePreview(brand.photo);  
      } else {
        setImagePreview("/assets/images/icons/gallery-grey.svg");
      }
    }
  }, [brand, reset, setValue]);

  const onSubmit = (data: EditBrandFormData) => {
    const payload: { name: string; tagline: string; photo?: File } = {
      name: data.name,
      tagline: data.tagline,
    };
    
    if (data.photo && data.photo instanceof File) {
      payload.photo = data.photo;
    }
    
    updateBrand(
      { id: Number(id), ...payload } as any,
      {
        onSuccess: () => {
          setShowToast(true);
          // Redirect to brands list after showing success toast
          setTimeout(() => {
            setShowToast(false);
            navigate('/brands');
          }, 1000);
        },
        onError: (error: AxiosError<ApiErrorResponse>) => {
          const { message, errors: fieldErrors } = error.response?.data || {};
          if (message) {
            setError("root", { type: "server", message });
          }
          if (fieldErrors) {
            Object.entries(fieldErrors).forEach(([key, value]) => {
              if (key === "name" && value[0]?.toLowerCase().includes("already been taken")) {
                if (brand && data.name.trim().toLowerCase() === brand.name.trim().toLowerCase()) {
                  return;
                } else {
                  setError(key as keyof EditBrandFormData, {
                    type: "server",
                    message: `Brand name "${data.name}" is already in use. Please choose a different name.`,
                  });
                }
              } else if (key === "photo" && value[0]?.toLowerCase().includes("required")) {
                if (brand?.photo) {
                  return;
                } else {
                  setError(key as keyof EditBrandFormData, {
                    type: "server",
                    message: value[0],
                  });
                }
              } else {
                setError(key as keyof EditBrandFormData, {
                  type: "server",
                  message: value[0],
                });
              }
            });
          }
        },
      }
    );
  };

  if (isPending) {
    return <LoadingSpinner />;
  }

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
                <h3 className="font-bold text-base text-gray-900 mb-1">Update Berhasil</h3>
                <p className="text-xs text-gray-600 leading-snug">Data brand telah berhasil diperbarui dan disimpan.</p>
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
              <h1 className="font-bold text-2xl">Edit Brand</h1>
              <Link
                to={"/brands"}
                className="flex items-center gap-[6px] text-monday-gray font-semibold"
              >
                <img
                  src="/assets/images/icons/arrow-left-grey.svg"
                  className="size-4 flex shrink-0"
                  alt="icon"
                />
                Manage Brands
              </Link>
            </div>
            <div className="flex items-center flex-nowrap gap-3">
              <a href="#">
                <div className="flex size-14 rounded-full bg-monday-gray-background items-center justify-center overflow-hidden">
                  <img
                    src="/assets/images/icons/search-normal-black.svg"
                    className="size-6"
                    alt="icon"
                  />
                </div>
              </a>
              <a href="#">
                <div className="flex size-14 rounded-full bg-monday-gray-background items-center justify-center overflow-hidden">
                  <img
                    src="/assets/images/icons/notification-black.svg"
                    className="size-6"
                    alt="icon"
                  />
                </div>
              </a>
            </div>
          </div>
          <UserProfileCard />
        </div>
        <main className="flex flex-col gap-6 flex-1">
          <section
            id="Edit-Brand"
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
                  title="Quick Guide to Editing Brand"
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
                    className="size-14 object-contain"
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
                        setValue("photo", file, { shouldValidate: false });
                        setImagePreview(URL.createObjectURL(file));
                      } else {
                        setValue("photo", undefined, { shouldValidate: false });
                        if (brand?.photo) {
                          setImagePreview(brand.photo);
                        } else {
                          setImagePreview(
                            "/assets/images/icons/gallery-grey.svg"
                          );
                        }
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
                    src="/assets/images/icons/note-2-grey.svg"
                    className="flex size-6 shrink-0"
                    alt="icon"
                  />
                </div>

                <p className="placeholder font-medium text-monday-gray text-sm absolute -translate-y-1/2 left-[81px] top-[25px] group-has-[:placeholder-shown]:top-[36px] group-focus-within:top-[25px] transition-300">
                  Brand Name
                </p>
                <input
                  type="text"
                  {...register("name")}
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
                    src="/assets/images/icons/document-grey.svg"
                    className="flex size-6 shrink-0"
                    alt="icon"
                  />
                </div>
                <p className="placeholder font-medium text-monday-gray text-sm absolute -translate-y-1/2 left-[81px] top-[25px] group-has-[:placeholder-shown]:top-[36px] group-focus-within:top-[25px] transition-300">
                  Brand Tagline
                </p>
                <input
                  type="text"
                  {...register("tagline")}
                  className="appearance-none w-full h-[72px] font-semibold text-lg rounded-3xl border-[1.5px] border-monday-border pl-20 pr-6 pb-[14.5px] pt-[34.5px] placeholder-shown:pt-[14.5px] focus:border-monday-black transition-300"
                  placeholder=""
                />
              </label>
              {errors.tagline && (
                <p className="text-red-500">{errors.tagline.message as string}</p>
              )}

              <div className="flex items-center justify-end gap-4">
              <Link to={'/brands'}
                  className="btn btn-red font-semibold"
                >
                  Cancel
                </Link>
                <button type="submit" className="btn btn-primary font-semibold">
                  {isUpdating ? "Updating..." : "Update Brand"}
                </button>
              </div>
            </form>
          </section>
        </main>

      {/* Guide Modal */}
      {showGuideModal && (
        <div className="modal flex flex-1 items-center justify-center h-full fixed top-0 w-full z-50">
          <div
            onClick={() => setShowGuideModal(false)}
            className="absolute w-full h-full bg-[#292D32B2] cursor-pointer"
          />
          <div className="relative flex flex-col w-[500px] shrink-0 rounded-3xl p-[18px] gap-5 bg-white max-h-[90vh] overflow-y-auto">
            <div className="modal-header flex items-center justify-between">
              <p className="font-semibold text-xl">Quick Guide to Editing Brand</p>
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
                    Ensure the brand name remains relevant, clear, and easy to understand after changes
                  </p>
                </li>
                <li className="flex gap-[6px]">
                  <img
                    src="/assets/images/icons/Checklist-green-circle.svg"
                    className="flex size-6 shrink-0"
                    alt="icon"
                  />
                  <p className="font-medium leading-[140%]">
                    Update the brand image with appropriate and high-quality photos when needed
                  </p>
                </li>
                <li className="flex gap-[6px]">
                  <img
                    src="/assets/images/icons/Checklist-green-circle.svg"
                    className="flex size-6 shrink-0"
                    alt="icon"
                  />
                  <p className="font-medium leading-[140%]">
                    Update the tagline to ensure it remains user-friendly and clearly represents the brand
                  </p>
                </li>
                <li className="flex gap-[6px]">
                  <img
                    src="/assets/images/icons/Checklist-green-circle.svg"
                    className="flex size-6 shrink-0"
                    alt="icon"
                  />
                  <p className="font-medium leading-[140%]">
                    Verify no duplicate brand names exist when changing the brand name
                  </p>
                </li>
                <li className="flex gap-[6px]">
                  <img
                    src="/assets/images/icons/Checklist-green-circle.svg"
                    className="flex size-6 shrink-0"
                    alt="icon"
                  />
                  <p className="font-medium leading-[140%]">
                    Review all brand details carefully before saving to ensure accuracy
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

export default EditBrand;


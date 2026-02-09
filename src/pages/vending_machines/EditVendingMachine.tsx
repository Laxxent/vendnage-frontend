import { useEffect, useState, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useFetchVendingMachine, useUpdateVendingMachine } from "../../hooks/useVendingMachines";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { EditVendingMachineFormData, editVendingMachineSchema } from "../../schemas/vendingMachineSchema";
import { AxiosError } from "axios";
import { ApiErrorResponse } from "../../types/types";
import UserProfileCard from "../../components/UserProfileCard";
import LoadingSpinner from "../../components/LoadingSpinner";
import { useFetchUsers } from "../../hooks/useUsers";
import { isPIC, getRoleDisplayName } from "../../utils/roleHelpers";

const EditVendingMachine = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: vendingMachine, isPending } = useFetchVendingMachine(Number(id));
  const { mutate: updateVendingMachine, isPending: isUpdating } = useUpdateVendingMachine();
  const [showToast, setShowToast] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const { data: users = [] } = useFetchUsers();

  // Filter users yang memiliki role PIC (bukan manager)
  const picUsers = useMemo(() => {
    return users.filter(user => {
      const userRoles = user.roles || [];
      return isPIC(userRoles); // Semua user yang bukan manager
    });
  }, [users]);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<EditVendingMachineFormData>({
    resolver: zodResolver(editVendingMachineSchema),
    defaultValues: { name: "", location: "", status: "active" },
  });

  useEffect(() => {
    if (vendingMachine) {
      const formData = {
        name: vendingMachine.name || "",
        location: vendingMachine.location || "",
        status: vendingMachine.status || "active",
        assigned_user_id: vendingMachine.assigned_user_id || 0,
      };
      reset(formData);
    }
  }, [vendingMachine, reset]);

  // Auto-hide toast after 1.5 seconds and navigate (reduced for faster UX)
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
        navigate("/vending-machines");
      }, 1500); // ✅ Kurangi dari 3000 menjadi 1500 (1.5 detik) untuk UX yang lebih cepat

      return () => {
        clearTimeout(timer);
      };
    }
  }, [showToast, navigate]);

  const onSubmit = (data: EditVendingMachineFormData) => {
    setError("root", { type: "server", message: "" });

    updateVendingMachine(
      { id: Number(id), ...data },
      {
        onSuccess: () => {
          setShowToast(true);
          // ✅ Navigate langsung setelah 1 detik (lebih cepat)
          // Karena optimistic update sudah bekerja, data sudah ada di cache
          // User masih bisa melihat toast sebentar, tapi tidak perlu menunggu lama
          setTimeout(() => {
            navigate("/vending-machines");
          }, 1000);
        },
        onError: (error: AxiosError<ApiErrorResponse>) => {
          const { message, errors: fieldErrors } = error.response?.data || {};
          if (message) {
            setError("root", { type: "server", message });
          }
          if (fieldErrors) {
            Object.entries(fieldErrors).forEach(([key, value]) => {
              setError(key as keyof EditVendingMachineFormData, {
                type: "server",
                message: value[0],
              });
            });
          }
        },
      }
    );
  };

  if (isPending) {
    return <LoadingSpinner />;
  }

  if (!vendingMachine) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="font-semibold text-xl text-gray-500 mb-2">
            Vending Machine not found
          </p>
          <Link to="/vending-machines" className="btn btn-primary font-semibold">
            Back to Vending Machines
          </Link>
        </div>
      </div>
    );
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
                width: "380px",
                padding: "16px 24px",
                marginTop: "20px",
                borderRadius: "10px",
                boxShadow: `
                  0 20px 60px -12px rgba(0, 0, 0, 0.4),
                  0 0 0 1px rgba(0, 0, 0, 0.05),
                  inset 0 1px 2px rgba(255, 255, 255, 0.9)
                `,
              }}
            >
              <div
                className="flex items-center justify-center rounded-full border-[2px] border-white shadow-[0_4px_12px_rgba(34,197,94,0.4)] mb-3"
                style={{
                  width: "48px",
                  height: "48px",
                  backgroundColor: "#22c55e",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{
                    display: "block",
                    flexShrink: 0,
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

              <div className="text-center mb-3" style={{ padding: "0 2px" }}>
                <h3 className="font-bold text-base text-gray-900 mb-1">
                  Successfully Updated
                </h3>
                <p className="text-xs text-gray-600 leading-snug">
                  Vending machine has been successfully updated.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowToast(false);
                  navigate("/vending-machines");
                }}
                className="w-full px-4 py-1.5 rounded-md bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-semibold text-xs transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-[1.01] active:scale-[0.99]"
                aria-label="Close"
              >
                Close
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
              <h1 className="font-bold text-2xl">Edit Vending Machine</h1>
              <Link
                to={"/vending-machines"}
                className="flex items-center gap-[6px] text-monday-gray font-semibold"
              >
                <img
                  src="/assets/images/icons/arrow-left-grey.svg"
                  className="size-4 flex shrink-0"
                  alt="icon"
                />
                Manage Vending Machines
              </Link>
            </div>
          </div>
          <UserProfileCard />
        </div>
        <main className="flex flex-col gap-6 flex-1">
          <section
            id="Edit-Vending-Machine"
            className="flex flex-col gap-6 flex-1 rounded-3xl p-[18px] px-0 bg-white"
          >
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex flex-col w-full gap-5 px-[18px]"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-xl capitalize">
                  Complete The Form
                </h2>
                <button
                  type="button"
                  onClick={() => setShowGuideModal(true)}
                  className="flex items-center justify-center size-10 rounded-full bg-monday-gray-background hover:bg-monday-gray transition-colors cursor-pointer flex-shrink-0"
                  title="Quick Guide to Edit Vending Machine"
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

              {errors.root && (
                <div className="w-full py-2 px-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-xs font-medium text-center text-red-600">
                    {errors.root.message}
                  </p>
                </div>
              )}

              <label className="group relative">
                <div className="flex items-center pr-4 absolute transform -translate-y-1/2 top-1/2 left-6 border-r-[1.5px] border-monday-border">
                  <img
                    src="/assets/images/icons/shop-grey.svg"
                    className="flex size-6 shrink-0"
                    alt="icon"
                  />
                </div>
                <p className="placeholder font-medium text-monday-gray text-sm absolute -translate-y-1/2 left-[81px] top-[25px] group-has-[:placeholder-shown]:top-[36px] group-focus-within:top-[25px] transition-300">
                  Vending Machine Name
                </p>
                <input
                  type="text"
                  {...register("name")}
                  className="appearance-none w-full h-[72px] font-semibold text-lg rounded-3xl border-[1.5px] border-monday-border pl-20 pr-6 pb-[14.5px] pt-[34.5px] placeholder-shown:pt-[14.5px] focus:border-monday-black transition-300"
                  placeholder=""
                />
              </label>
              {errors.name && (
                <p className="text-red-500">{errors.name.message}</p>
              )}

              <label className="group relative">
                <div className="flex items-center pr-4 absolute transform -translate-y-1/2 top-1/2 left-6 border-r-[1.5px] border-monday-border">
                  <img
                    src="/assets/images/icons/location-grey.svg"
                    className="flex size-6 shrink-0"
                    alt="icon"
                  />
                </div>
                <p className="placeholder font-medium text-monday-gray text-sm absolute -translate-y-1/2 left-[81px] top-[25px] group-has-[:placeholder-shown]:top-[36px] group-focus-within:top-[25px] transition-300">
                  Location <span className="text-red-500">*</span>
                </p>
                <input
                  type="text"
                  {...register("location", {
                    required: "Location is required",
                  })}
                  className="appearance-none w-full h-[72px] font-semibold text-lg rounded-3xl border-[1.5px] border-monday-border pl-20 pr-6 pb-[14.5px] pt-[34.5px] placeholder-shown:pt-[14.5px] focus:border-monday-black transition-300"
                  placeholder=""
                />
              </label>
              {errors.location && (
                <p className="text-red-500">{errors.location.message}</p>
              )}

              <label className="group relative rounded-3xl border-[1.5px] border-monday-border focus-within:border-monday-black transition-300 overflow-hidden">
                <div className="flex items-center pr-4 absolute transform -translate-y-1/2 top-1/2 left-6 border-r-[1.5px] border-monday-border">
                  <img
                    src="/assets/images/icons/profile-tick-grey.svg"
                    className="flex size-6 shrink-0"
                    alt="icon"
                  />
                </div>
                <p className="placeholder font-medium text-monday-gray text-sm absolute -translate-y-1/2 left-[81px] top-[25px] group-has-[:invalid]:top-[36px] group-focus-within:top-[25px] transition-300">
                  Assign to PIC <span className="text-red-500">*</span>
                </p>
                <select
                  {...register("assigned_user_id", {
                    valueAsNumber: true,
                    required: "Please assign a PIC",
                    validate: (value) => {
                      if (!value || value === 0) {
                        return "Please assign a PIC";
                      }
                      return true;
                    },
                  })}
                  className="appearance-none w-full h-[72px] font-semibold text-lg outline-none pl-20 pr-6 pb-[14.5px] pt-[34.5px] focus:border-monday-black transition-300"
                >
                  <option value="0">Select a PIC</option>
                  {picUsers.map((user) => {
                    const userRoles = user.roles || [];
                    const rolesDisplay = userRoles.length > 0
                      ? userRoles.map(role => getRoleDisplayName(role)).join(", ")
                      : "No roles";
                    return (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email}) - {rolesDisplay}
                      </option>
                    );
                  })}
                </select>
                <img
                  src="/assets/images/icons/arrow-down-grey.svg"
                  className="absolute transform -translate-y-1/2 top-1/2 right-6 size-6 pointer-events-none"
                  alt="icon"
                />
              </label>
              {errors.assigned_user_id && (
                <p className="text-red-500">{errors.assigned_user_id.message}</p>
              )}

              <label className="group relative rounded-3xl border-[1.5px] border-monday-border focus-within:border-monday-black transition-300 overflow-hidden">
                <div className="flex items-center pr-4 absolute transform -translate-y-1/2 top-1/2 left-6 border-r-[1.5px] border-monday-border">
                  <img
                    src="/assets/images/icons/note-2-grey.svg"
                    className="flex size-6 shrink-0"
                    alt="icon"
                  />
                </div>
                <p className="placeholder font-medium text-monday-gray text-sm absolute -translate-y-1/2 left-[81px] top-[25px] group-has-[:invalid]:top-[36px] group-focus-within:top-[25px] transition-300">
                  Status (Optional)
                </p>
                <select
                  {...register("status")}
                  className="appearance-none w-full h-[72px] font-semibold text-lg outline-none pl-20 pr-6 pb-[14.5px] pt-[34.5px] focus:border-monday-black transition-300"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="maintenance">Maintenance</option>
                </select>
                <img
                  src="/assets/images/icons/arrow-down-grey.svg"
                  className="absolute transform -translate-y-1/2 top-1/2 right-6 size-6 pointer-events-none"
                  alt="icon"
                />
              </label>
              {errors.status && (
                <p className="text-red-500">{errors.status.message}</p>
              )}

              <div className="flex items-center justify-end gap-4">
                <Link to={'/vending-machines'}
                  className="btn btn-red font-semibold"
                >
                  Cancel
                </Link>
                <button type="submit" className="btn btn-primary font-semibold" disabled={isUpdating}>
                  {isUpdating ? "Saving..." : "Save Changes"}
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
              <p className="font-semibold text-xl">Quick Guide to Edit Vending Machine</p>
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
                    Update the Vending Machine Name if needed
                  </p>
                </li>
                <li className="flex gap-[6px]">
                  <img
                    src="/assets/images/icons/Checklist-green-circle.svg"
                    className="flex size-6 shrink-0"
                    alt="icon"
                  />
                  <p className="font-medium leading-[140%]">
                    Update the Location Where the Vending Machine is Placed (Required)
                  </p>
                </li>
                <li className="flex gap-[6px]">
                  <img
                    src="/assets/images/icons/Checklist-green-circle.svg"
                    className="flex size-6 shrink-0"
                    alt="icon"
                  />
                  <p className="font-medium leading-[140%]">
                    Update the assigned PIC if needed (Required). You can select any PIC regardless of location
                  </p>
                </li>
                <li className="flex gap-[6px]">
                  <img
                    src="/assets/images/icons/Checklist-green-circle.svg"
                    className="flex size-6 shrink-0"
                    alt="icon"
                  />
                  <p className="font-medium leading-[140%]">
                    Update the Status (Active, Inactive, or Maintenance) - Optional
                  </p>
                </li>
                <li className="flex gap-[6px]">
                  <img
                    src="/assets/images/icons/Checklist-green-circle.svg"
                    className="flex size-6 shrink-0"
                    alt="icon"
                  />
                  <p className="font-medium leading-[140%]">
                    Review all changes and click "Save Changes" to update
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

export default EditVendingMachine;


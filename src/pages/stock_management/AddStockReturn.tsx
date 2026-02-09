import { useCreateStockReturn } from "../../hooks/useStockManagement";
import { useFetchProducts } from "../../hooks/useProducts";
import { useFetchWarehouses } from "../../hooks/useWarehouses";
import { useFetchVendingMachines } from "../../hooks/useVendingMachines";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AxiosError } from "axios";
import { ApiErrorResponse } from "../../types/types";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { StockReturnFormData, stockReturnSchema } from "../../schemas/stockReturnSchema";
import UserProfileCard from "../../components/UserProfileCard";
import { useNavigate } from "react-router-dom";
import { CreateStockReturnPayload } from "../../types/stockManagement";

const AddStockReturn = () => {
  const { mutate: createStockReturn, isPending } = useCreateStockReturn();
  const { data: products, isPending: productsLoading } = useFetchProducts();
  const { data: warehouses, isPending: warehousesLoading } = useFetchWarehouses();
  const { data: vendingMachines, isPending: vendingMachinesLoading } = useFetchVendingMachines();
  const navigate = useNavigate();
  const [showToast, setShowToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false); // Prevent multiple submissions

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<StockReturnFormData>({
    resolver: zodResolver(stockReturnSchema),
    defaultValues: {
      source_type: "warehouse",
      from_warehouse_id: 0,
      from_vending_machine_id: 0,
      to_warehouse_id: 0,
      date: new Date().toISOString().split("T")[0],
      products: [{ product_id: 0, quantity: 1 }],
    },
  });

  // Watch source_type to handle conditional fields
  const watchedSourceType = watch("source_type");

  // Reset source fields when source type changes
  useEffect(() => {
    if (watchedSourceType === "warehouse") {
      setValue("from_vending_machine_id", 0);
      clearErrors("from_vending_machine_id");
    } else {
      setValue("from_warehouse_id", 0);
      clearErrors("from_warehouse_id");
    }
  }, [watchedSourceType, setValue, clearErrors]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "products",
  });

  const onSubmit = (data: StockReturnFormData) => {
    // Prevent multiple submissions
    if (isSubmitting || isPending) {
      console.warn("⚠️ Form submission already in progress, ignoring duplicate submit");
      return;
    }

    setError("root", { type: "server", message: "" });
    setIsSubmitting(true);

    // Clean payload: remove unused fields based on source_type
    // Only include the relevant source field, exclude the other one
    // Also ensure expiry_date format is correct (YYYY-MM-DD)
    const cleanedProducts = data.products.map((product) => {
      // Ensure expiry_date is in correct format (YYYY-MM-DD)
      let expiryDate = product.expiry_date;
      if (expiryDate) {
        // If date is in format YYYY-MM-DD, keep it
        // If it's in other format, try to convert
        const dateObj = new Date(expiryDate);
        if (!isNaN(dateObj.getTime())) {
          // Format to YYYY-MM-DD
          expiryDate = dateObj.toISOString().split('T')[0];
        }
      }
      
      return {
        product_id: product.product_id,
        quantity: product.quantity,
        expiry_date: expiryDate,
        batch_number: product.batch_number || undefined,
        notes: product.notes || undefined,
      };
    });

    // Build payload based on source_type - explicitly exclude unused fields
    let cleanedPayload: CreateStockReturnPayload;
    
    if (data.source_type === "warehouse") {
      // For warehouse source, only include from_warehouse_id
      cleanedPayload = {
        source_type: "warehouse",
        to_warehouse_id: data.to_warehouse_id,
        date: data.date,
        products: cleanedProducts,
      };
      
      // Only add from_warehouse_id if it's valid
      if (data.from_warehouse_id && data.from_warehouse_id > 0) {
        cleanedPayload.from_warehouse_id = data.from_warehouse_id;
      }
      
      // Only add notes if it exists
      if (data.notes) {
        cleanedPayload.notes = data.notes;
      }
      
      // DO NOT include from_vending_machine_id at all
    } else if (data.source_type === "vending_machine") {
      // For vending machine source, only include from_vending_machine_id
      cleanedPayload = {
        source_type: "vending_machine",
        to_warehouse_id: data.to_warehouse_id,
        date: data.date,
        products: cleanedProducts,
      };
      
      // Only add from_vending_machine_id if it's valid
      if (data.from_vending_machine_id && data.from_vending_machine_id > 0) {
        cleanedPayload.from_vending_machine_id = data.from_vending_machine_id;
      }
      
      // Only add notes if it exists
      if (data.notes) {
        cleanedPayload.notes = data.notes;
      }
      
      // DO NOT include from_warehouse_id at all
    } else {
      // Fallback (should not happen due to schema validation)
      cleanedPayload = {
        source_type: data.source_type,
        to_warehouse_id: data.to_warehouse_id,
        date: data.date,
        products: cleanedProducts,
      };
      if (data.notes) {
        cleanedPayload.notes = data.notes;
      }
    }

    console.log("📤 Submitting stock return data:", JSON.stringify(cleanedPayload, null, 2));
    console.log("📤 Source type:", cleanedPayload.source_type);
    console.log("📤 From Vending Machine ID:", cleanedPayload.from_vending_machine_id);
    console.log("📤 From Warehouse ID:", cleanedPayload.from_warehouse_id);
    console.log("📤 To Warehouse ID:", cleanedPayload.to_warehouse_id);
    console.log("📤 Products:", cleanedProducts);
    
    // Verify payload structure
    console.log("📤 Final cleaned payload keys:", Object.keys(cleanedPayload));
    console.log("📤 Has from_warehouse_id?", "from_warehouse_id" in cleanedPayload);
    console.log("📤 Has from_vending_machine_id?", "from_vending_machine_id" in cleanedPayload);
    
    if (cleanedPayload.source_type === "vending_machine") {
      if ("from_warehouse_id" in cleanedPayload) {
        console.error("❌ CRITICAL ERROR: from_warehouse_id is still in payload when source_type is vending_machine!");
      }
      if (!cleanedPayload.from_vending_machine_id || cleanedPayload.from_vending_machine_id === 0) {
        console.error("❌ ERROR: from_vending_machine_id is missing or invalid!");
      } else {
        console.log("✅ from_vending_machine_id is valid:", cleanedPayload.from_vending_machine_id);
      }
    } else if (cleanedPayload.source_type === "warehouse") {
      if ("from_vending_machine_id" in cleanedPayload) {
        console.error("❌ CRITICAL ERROR: from_vending_machine_id is still in payload when source_type is warehouse!");
      }
      if (!cleanedPayload.from_warehouse_id || cleanedPayload.from_warehouse_id === 0) {
        console.error("❌ ERROR: from_warehouse_id is missing or invalid!");
      } else {
        console.log("✅ from_warehouse_id is valid:", cleanedPayload.from_warehouse_id);
      }
    }

    createStockReturn(cleanedPayload, {
      onSuccess: () => {
        console.log("✅ Stock return created successfully");
        // Clear all error messages immediately on success
        clearErrors();
        // Also explicitly clear root error
        setError("root", { type: "server", message: "" });
        setIsSubmitting(false);
        // Use setTimeout to ensure error state is cleared before showing toast
        setTimeout(() => {
          setShowToast(true);
          setTimeout(() => {
            setShowToast(false);
            setTimeout(() => {
              navigate("/stock-management/stock-retur");
            }, 100);
          }, 2000);
        }, 50);
      },
      onError: (error: AxiosError<ApiErrorResponse>) => {
        console.error("❌ Error creating stock return:", error);
        console.error("❌ Error response:", error.response?.data);
        console.error("❌ Error status:", error.response?.status);
        
        setIsSubmitting(false); // Re-enable form on error
        
        if (error.response) {
          const { message, errors } = error.response.data;
          const status = error.response.status;

          // Handle different error types
          let errorMessage = message || "An error occurred while creating stock return.";

          // Handle 500 Internal Server Error
          if (status === 500) {
            errorMessage = message || 
              "Server error occurred. This might be due to:\n" +
              "• Insufficient stock in the source warehouse\n" +
              "• No matching stock with the specified expiry date\n" +
              "• Database constraint violation\n\n" +
              "Please check the stock balance and try again.";
          }

          // Handle 422 Validation Error
          if (status === 422) {
            // Show field-specific errors
            if (errors) {
              Object.entries(errors).forEach(([key, messages]) => {
                // Map backend field names to frontend field names if needed
                let frontendKey = key as keyof StockReturnFormData;
                
                // If error is about from_warehouse_id but source_type is vending_machine, 
                // show it on from_vending_machine_id instead
                if (key === "from_warehouse_id" && cleanedPayload.source_type === "vending_machine") {
                  frontendKey = "from_vending_machine_id" as keyof StockReturnFormData;
                }
                
                setError(frontendKey, {
                  type: "server",
                  message: messages[0],
                });
              });
            }
            // Also show general message if available
            if (message) {
              errorMessage = message;
            } else {
              errorMessage = "Validation error. Please check your input and try again.";
            }
            
            // ✅ PERBAIKAN: Tidak perlu menambahkan solusi lagi karena backend sudah mengirim pesan error yang lengkap
            // Backend sudah mengirim pesan error yang sesuai, jadi kita gunakan langsung tanpa modifikasi
          }

          // Handle 404 Not Found
          if (status === 404) {
            errorMessage = "Resource not found. Please refresh the page and try again.";
          }

          // Handle 400 Bad Request
          if (status === 400) {
            errorMessage = message || "Invalid request. Please check your input and try again.";
          }

          // ✅ Set error message untuk toast
          setErrorMessage(errorMessage);
          setShowErrorToast(true);
          
          // ✅ Auto-hide: 2 detik untuk "From Vending Machine", 8 detik untuk yang lain
          const autoHideDuration = cleanedPayload.source_type === "vending_machine" ? 2000 : 8000;
          setTimeout(() => {
            setShowErrorToast(false);
          }, autoHideDuration);

          // ✅ Set error untuk form validation (field-specific errors sudah di-handle di atas)
          // Tidak perlu set root error lagi karena sudah ditampilkan di toast
        } else if (error.request) {
          // ✅ Network error
          const networkErrorMsg = "Network error. Please check your connection and try again.";
          setErrorMessage(networkErrorMsg);
          setShowErrorToast(true);
          setTimeout(() => {
            setShowErrorToast(false);
          }, 5000);
        } else {
          // ✅ Other error
          const otherErrorMsg = error.message || "An unexpected error occurred. Please try again.";
          setErrorMessage(otherErrorMsg);
          setShowErrorToast(true);
          setTimeout(() => {
            setShowErrorToast(false);
          }, 5000);
        }
      },
    });
  };

  const addProduct = () => {
    append({ product_id: 0, quantity: 1, expiry_date: "" });
  };

  const removeProduct = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
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
                  Successfully Saved
                </h3>
                <p className="text-xs text-gray-600 leading-snug">
                  Stock return data has been successfully created and saved.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowToast(false);
                  navigate("/stock-management/stock-retur");
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

      {/* ✅ Error Toast - Konsisten dengan Success Toast */}
      {showErrorToast && (
        <div
          className="fixed inset-0 flex items-start justify-center pointer-events-none bg-transparent animate-[fadeIn_0.2s_ease-out]"
          style={{ zIndex: 99999 }}
        >
          <div className="pointer-events-auto transform transition-all duration-300 ease-out animate-[slideUp_0.3s_ease-out]">
            <div
              className="flex flex-col items-center bg-white relative border border-red-200"
              style={{
                zIndex: 100000,
                width: "420px", // ✅ Lebih lebar untuk pesan error yang panjang
                maxWidth: "90vw", // ✅ Responsive
                maxHeight: "80vh", // ✅ Maksimal tinggi untuk scroll
                padding: "16px 24px",
                marginTop: "20px",
                borderRadius: "10px",
                boxShadow: `
                  0 20px 60px -12px rgba(239, 68, 68, 0.3),
                  0 0 0 1px rgba(239, 68, 68, 0.1),
                  inset 0 1px 2px rgba(255, 255, 255, 0.9)
                `,
              }}
            >
              {/* ✅ Close Icon X - Pojok Kanan Atas Toast Container */}
              <button
                onClick={() => setShowErrorToast(false)}
                className="flex items-center justify-center rounded-full hover:bg-red-50 transition-colors duration-200 group"
                aria-label="Close"
                style={{
                  position: "absolute",
                  top: "8px",
                  right: "8px",
                  width: "32px",
                  height: "32px",
                  zIndex: 100001,
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-gray-400 group-hover:text-red-600 transition-colors duration-200"
                >
                  <path
                    d="M18 6L6 18M6 6L18 18"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {/* Error Icon - Red X */}
              <div
                className="flex items-center justify-center rounded-full border-[2px] border-white shadow-[0_4px_12px_rgba(239,68,68,0.4)] mb-3"
                style={{
                  width: "48px",
                  height: "48px",
                  backgroundColor: "#ef4444",
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
                    d="M18 6L6 18M6 6L18 18"
                    stroke="rgb(255, 255, 255)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              {/* Text Content - dengan scroll jika terlalu panjang */}
              <div 
                className="text-center mb-3 w-full" 
                style={{ padding: "0 2px" }}
              >
                <h3 className="font-bold text-base text-gray-900 mb-2">
                  Creation Failed
                </h3>
                <div 
                  className="text-xs text-gray-600 leading-relaxed text-left overflow-y-auto"
                  style={{
                    maxHeight: "300px", // ✅ Maksimal tinggi untuk scroll
                    padding: "8px",
                    backgroundColor: "#f9fafb",
                    borderRadius: "6px",
                  }}
                >
                  <p className="whitespace-pre-line">
                    {errorMessage}
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setShowErrorToast(false)}
                className="w-full px-4 py-1.5 rounded-md bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-semibold text-xs transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-[1.01] active:scale-[0.99]"
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
              <h1 className="font-bold text-2xl">Add Stock Return</h1>
              <p className="font-medium text-base text-monday-gray">
                Record products returned to warehouse
              </p>
              <Link
                to="/stock-management/stock-retur"
                className="flex items-center gap-[6px] text-monday-gray font-semibold mt-1"
              >
                <img
                  src="/assets/images/icons/arrow-left-grey.svg"
                  className="size-4 flex shrink-0"
                  alt="icon"
                />
                Back to Stock Return
              </Link>
            </div>
          </div>
          <UserProfileCard />
        </div>

        <main className="flex flex-col gap-6 flex-1">
          <section
            id="Add-Stock-Return"
            className="flex flex-col gap-6 flex-1 rounded-3xl p-[18px] px-0 bg-white"
          >
            <form onSubmit={handleSubmit(onSubmit)} className="flex gap-6 px-[18px]">
              <div className="flex flex-col gap-6 flex-1">
                {/* ✅ Error inline untuk field-specific errors (jika diperlukan) */}
                {/* Error root sudah ditampilkan di error toast, jadi bisa disembunyikan atau tetap ditampilkan sebagai fallback */}
                {errors.root && errors.root.message && !showToast && !showErrorToast && (
                  <div className="w-full py-3 px-4 rounded-lg bg-red-50 border-2 border-red-300 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <svg
                          className="w-5 h-5 text-red-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-red-800 mb-1">
                          Error Creating Stock Return
                        </p>
                        <p className="text-xs font-medium text-red-700 whitespace-pre-line">
                          {errors.root.message}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Source Type Selection */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Source Type <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        value="warehouse"
                        {...register("source_type")}
                        className="size-5 cursor-pointer"
                      />
                      <span className="font-semibold text-lg text-gray-900">From Warehouse</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        value="vending_machine"
                        {...register("source_type")}
                        className="size-5 cursor-pointer"
                      />
                      <span className="font-semibold text-lg text-gray-900">From Vending Machine</span>
                    </label>
                  </div>
                  {errors.source_type && (
                    <p className="text-red-500 text-sm">{errors.source_type.message}</p>
                  )}
                </div>

                {/* Conditional: From Warehouse Selection */}
                {watchedSourceType === "warehouse" && (
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-gray-700">
                      From Warehouse <span className="text-red-500">*</span>
                    </label>
                    <label className="group relative rounded-3xl border-[1.5px] border-monday-border focus-within:border-monday-black transition-300 overflow-hidden">
                      <div className="flex items-center pr-4 absolute transform -translate-y-1/2 top-1/2 left-6 border-r-[1.5px] border-monday-border">
                        <img
                          src="/assets/images/icons/buildings-2-grey.svg"
                          className="flex size-6 shrink-0"
                          alt="icon"
                        />
                      </div>
                      <select
                        {...register("from_warehouse_id")}
                        disabled={warehousesLoading}
                        className="appearance-none w-full h-[72px] font-semibold text-lg outline-none pl-20 pr-6 pb-[14.5px] pt-[32px]"
                      >
                        <option value="0">Select from warehouse</option>
                        {warehouses?.map((warehouse) => (
                          <option key={warehouse.id} value={warehouse.id}>
                            {warehouse.name}
                          </option>
                        ))}
                      </select>
                      <img
                        src="/assets/images/icons/arrow-down-grey.svg"
                        className="absolute transform -translate-y-1/2 top-1/2 right-6 size-6"
                        alt="icon"
                      />
                    </label>
                    {errors.from_warehouse_id && (
                      <p className="text-red-500 text-sm">{errors.from_warehouse_id.message}</p>
                    )}
                  </div>
                )}

                {/* Conditional: From Vending Machine Selection */}
                {watchedSourceType === "vending_machine" && (
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-gray-700">
                      From Vending Machine <span className="text-red-500">*</span>
                    </label>
                    <label className="group relative rounded-3xl border-[1.5px] border-monday-border focus-within:border-monday-black transition-300 overflow-hidden">
                      <div className="flex items-center pr-4 absolute transform -translate-y-1/2 top-1/2 left-6 border-r-[1.5px] border-monday-border">
                        <img
                          src="/assets/images/icons/buildings-2-grey.svg"
                          className="flex size-6 shrink-0"
                          alt="icon"
                        />
                      </div>
                      <select
                        {...register("from_vending_machine_id")}
                        disabled={vendingMachinesLoading}
                        className="appearance-none w-full h-[72px] font-semibold text-lg outline-none pl-20 pr-6 pb-[14.5px] pt-[32px]"
                      >
                        <option value="0">Select from vending machine</option>
                        {vendingMachines?.map((vm) => (
                          <option key={vm.id} value={vm.id}>
                            {vm.name} {vm.location ? `- ${vm.location}` : ""}
                          </option>
                        ))}
                      </select>
                      <img
                        src="/assets/images/icons/arrow-down-grey.svg"
                        className="absolute transform -translate-y-1/2 top-1/2 right-6 size-6"
                        alt="icon"
                      />
                    </label>
                    {errors.from_vending_machine_id && (
                      <p className="text-red-500 text-sm">{errors.from_vending_machine_id.message}</p>
                    )}
                  </div>
                )}

                {/* To Warehouse Selection */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700">
                    To Warehouse <span className="text-red-500">*</span>
                  </label>
                  <label className="group relative rounded-3xl border-[1.5px] border-monday-border focus-within:border-monday-black transition-300 overflow-hidden">
                    <div className="flex items-center pr-4 absolute transform -translate-y-1/2 top-1/2 left-6 border-r-[1.5px] border-monday-border">
                      <img
                        src="/assets/images/icons/buildings-2-grey.svg"
                        className="flex size-6 shrink-0"
                        alt="icon"
                      />
                    </div>
                    <select
                      {...register("to_warehouse_id")}
                      disabled={warehousesLoading}
                      className="appearance-none w-full h-[72px] font-semibold text-lg outline-none pl-20 pr-6 pb-[14.5px] pt-[32px]"
                    >
                      <option value="0">Select to warehouse</option>
                      {warehouses?.map((warehouse) => (
                        <option key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                        </option>
                      ))}
                    </select>
                    <img
                      src="/assets/images/icons/arrow-down-grey.svg"
                      className="absolute transform -translate-y-1/2 top-1/2 right-6 size-6"
                      alt="icon"
                    />
                  </label>
                  {errors.to_warehouse_id && (
                    <p className="text-red-500 text-sm">{errors.to_warehouse_id.message}</p>
                  )}
                </div>

                {/* Date */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <label className="group relative">
                    <div className="flex items-center pr-4 absolute transform -translate-y-1/2 top-1/2 left-6 border-r-[1.5px] border-monday-border">
                      <img
                        src="/assets/images/icons/note-text-grey.svg"
                        className="flex size-6 shrink-0"
                        alt="icon"
                      />
                    </div>
                    <input
                      type="date"
                      {...register("date")}
                      className="appearance-none w-full h-[72px] font-semibold text-lg rounded-3xl border-[1.5px] border-monday-border pl-20 pr-6 pb-[14.5px] pt-[34.5px] placeholder-shown:pt-[14.5px] focus:border-monday-black transition-300"
                      placeholder=""
                    />
                  </label>
                  {errors.date && (
                    <p className="text-red-500 text-sm">{errors.date.message}</p>
                  )}
                </div>

                {/* Notes */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Notes (Optional)
                  </label>
                  <label className="group relative">
                    <div className="flex items-center pr-4 absolute transform -translate-y-1/2 top-1/2 left-6 border-r-[1.5px] border-monday-border">
                      <img
                        src="/assets/images/icons/note-2-grey.svg"
                        className="flex size-6 shrink-0"
                        alt="icon"
                      />
                    </div>
                    <input
                      type="text"
                      {...register("notes")}
                      className="appearance-none w-full h-[72px] font-semibold text-lg rounded-3xl border-[1.5px] border-monday-border pl-20 pr-6 pb-[14.5px] pt-[34.5px] placeholder-shown:pt-[14.5px] focus:border-monday-black transition-300"
                      placeholder="Additional notes (optional)"
                    />
                  </label>
                  {errors.notes && (
                    <p className="text-red-500 text-sm">{errors.notes.message}</p>
                  )}
                </div>

                {/* Products Section */}
                <div className="flex flex-col gap-4">
                  <div>
                    <h3 className="font-semibold text-xl">Products</h3>
                    <p className="text-sm text-monday-gray">
                      Add products returned to warehouse
                    </p>
                  </div>

                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="flex flex-col gap-4 p-6 border-2 border-monday-border rounded-3xl bg-gray-50"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-lg">Product {index + 1}</h4>
                        {fields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeProduct(index)}
                            className="btn btn-red font-semibold text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Product Selection */}
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-semibold text-gray-700">
                            Select Product <span className="text-red-500">*</span>
                          </label>
                          <label className="group relative rounded-3xl border-[1.5px] border-monday-border focus-within:border-monday-black transition-300 overflow-hidden">
                            <div className="flex items-center pr-4 absolute transform -translate-y-1/2 top-1/2 left-6 border-r-[1.5px] border-monday-border">
                              <img
                                src="/assets/images/icons/bag-grey.svg"
                                className="flex size-6 shrink-0"
                                alt="icon"
                              />
                            </div>
                            <select
                              {...register(`products.${index}.product_id`)}
                              disabled={productsLoading}
                              className="appearance-none w-full h-[72px] font-semibold text-lg outline-none pl-20 pr-6 pb-[14.5px] pt-[32px]"
                            >
                              <option value="0">Select product</option>
                              {products?.map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.name}
                                </option>
                              ))}
                            </select>
                            <img
                              src="/assets/images/icons/arrow-down-grey.svg"
                              className="absolute transform -translate-y-1/2 top-1/2 right-6 size-6"
                              alt="icon"
                            />
                          </label>
                          {errors.products?.[index]?.product_id && (
                            <p className="text-red-500 text-sm">
                              {errors.products[index]?.product_id?.message}
                            </p>
                          )}
                        </div>

                        {/* Quantity */}
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-semibold text-gray-700">
                            Quantity <span className="text-red-500">*</span>
                          </label>
                          <label className="group relative">
                            <div className="flex items-center pr-4 absolute transform -translate-y-1/2 top-1/2 left-6 border-r-[1.5px] border-monday-border">
                              <img
                                src="/assets/images/icons/note-text-grey.svg"
                                className="flex size-6 shrink-0"
                                alt="icon"
                              />
                            </div>
                            <input
                              type="number"
                              {...register(`products.${index}.quantity`, {
                                valueAsNumber: true,
                              })}
                              min="1"
                              className="appearance-none w-full h-[72px] font-semibold text-lg rounded-3xl border-[1.5px] border-monday-border pl-20 pr-6 pb-[14.5px] pt-[34.5px] placeholder-shown:pt-[14.5px] focus:border-monday-black transition-300"
                              placeholder="Enter quantity"
                            />
                          </label>
                          {errors.products?.[index]?.quantity && (
                            <p className="text-red-500 text-sm">
                              {errors.products[index]?.quantity?.message}
                            </p>
                          )}
                        </div>

                        {/* Expiry Date - IMPORTANT for FEFO */}
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-semibold text-gray-700">
                            Expiry Date <span className="text-red-500"> * (</span>
                            <span className="text-xs text-monday-gray ml-2">
                              Important for FEFO
                            </span>
                            )
                          </label>
                          <label className="group relative">
                            <div className="flex items-center pr-4 absolute transform -translate-y-1/2 top-1/2 left-6 border-r-[1.5px] border-monday-border">
                              <img
                                src="/assets/images/icons/note-text-grey.svg"
                                className="flex size-6 shrink-0"
                                alt="icon"
                              />
                            </div>
                            <input
                              type="date"
                              {...register(`products.${index}.expiry_date`)}
                              className="appearance-none w-full h-[72px] font-semibold text-lg rounded-3xl border-[1.5px] border-monday-border pl-20 pr-6 pb-[14.5px] pt-[34.5px] placeholder-shown:pt-[14.5px] focus:border-monday-black transition-300"
                              placeholder=""
                            />
                          </label>
                          {errors.products?.[index]?.expiry_date && (
                            <p className="text-red-500 text-sm">
                              {errors.products[index]?.expiry_date?.message}
                            </p>
                          )}
                        </div>

                        {/* Batch Number (Optional) */}
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-semibold text-gray-700">
                            Batch Number (Optional)
                          </label>
                          <label className="group relative">
                            <div className="flex items-center pr-4 absolute transform -translate-y-1/2 top-1/2 left-6 border-r-[1.5px] border-monday-border">
                              <img
                                src="/assets/images/icons/note-2-grey.svg"
                                className="flex size-6 shrink-0"
                                alt="icon"
                              />
                            </div>
                            <input
                              type="text"
                              {...register(`products.${index}.batch_number`)}
                              className="appearance-none w-full h-[72px] font-semibold text-lg rounded-3xl border-[1.5px] border-monday-border pl-20 pr-6 pb-[14.5px] pt-[34.5px] placeholder-shown:pt-[14.5px] focus:border-monday-black transition-300"
                              placeholder="Enter batch number (optional)"
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {errors.products && typeof errors.products === "object" && (
                  <p className="text-red-500">Please fill all product fields</p>
                )}

                {/* Add Product Button - dipindahkan ke sini, di atas tombol Save Data */}
                <div className="flex items-center justify-end mb-2">
                  <button
                    type="button"
                    onClick={addProduct}
                    className="btn btn-primary font-semibold text-sm"
                  >
                    + Add Product
                  </button>
                </div>

                {/* Action Buttons (Cancel & Save Data) */}
                <div className="flex items-center justify-end gap-4">
                  <Link
                    to="/stock-management/stock-retur"
                    className="btn btn-red font-semibold"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={isPending || isSubmitting}
                    className="btn btn-primary font-semibold"
                  >
                    {isPending || isSubmitting ? "Saving..." : "Save Data"}
                  </button>
                </div>
              </div>
            </form>
          </section>
        </main>
    </>
  );
};

export default AddStockReturn;



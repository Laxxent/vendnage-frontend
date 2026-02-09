import { useEffect, useState, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useFetchStockReturn, useUpdateStockReturn, useRemoveStockReturnProduct } from "../../hooks/useStockManagement";
import { useFetchProducts } from "../../hooks/useProducts";
import { useFetchWarehouses } from "../../hooks/useWarehouses";
import { useFetchVendingMachines } from "../../hooks/useVendingMachines";
import { useForm, useFieldArray, FieldErrors, UseFormRegister, UseFormWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { StockReturnFormData, stockReturnSchema } from "../../schemas/stockReturnSchema";
import { AxiosError } from "axios";
import { ApiErrorResponse } from "../../types/types";
import UserProfileCard from "../../components/UserProfileCard";
import LoadingSpinner from "../../components/LoadingSpinner";
import { UpdateStockReturnPayload } from "../../types/stockManagement";
import { useQueryClient } from "@tanstack/react-query";

// Extended Product Field Props with isExisting flag
interface ProductFieldProps {
  index: number;
  field: { id: string };
  productId: number;
  selectedWarehouseId: number | null;
  selectedVendingMachineId: number | null;
  sourceType: "warehouse" | "vending_machine";
  products: Array<{ id: number; name: string }> | undefined;
  productsLoading: boolean;
  register: UseFormRegister<StockReturnFormData>;
  errors: FieldErrors<StockReturnFormData>;
  fieldsLength: number;
  onRemove: () => void;
  watch: UseFormWatch<StockReturnFormData>;
  isExisting?: boolean;
  isRemoving?: boolean;
  productName?: string;
  productQuantity?: number;
  productExpiryDate?: string;
}

// Separate interface for Locked Product Field
interface LockedProductFieldProps {
  index: number;
  field: { id: string };
  productId: number;
  selectedWarehouseId: number | null;
  selectedVendingMachineId: number | null;
  sourceType: "warehouse" | "vending_machine";
  fieldsLength: number;
  onRemove: () => void;
  isRemoving?: boolean;
  productName: string;
  productQuantity: number;
  productExpiryDate: string;
  isExistingProduct?: boolean;
}

// Locked Product Field Component (for existing products)
const LockedProductField = ({
  index,
  field,
  productName,
  productQuantity,
  productExpiryDate,
  sourceType,
  fieldsLength,
  onRemove,
  isRemoving,
  isExistingProduct = true,
}: LockedProductFieldProps) => {
  const canRemove = isExistingProduct || fieldsLength > 1;
  const isDisabled = isRemoving || !canRemove;

  return (
    <div
      key={field.id}
      className="flex flex-col gap-4 p-6 border-2 border-blue-300 rounded-3xl bg-blue-50 relative"
      style={{ pointerEvents: 'auto', overflow: 'visible' }}
    >
      {/* Header with Existing Product Badge and Remove Button */}
      <div className="flex items-center justify-between relative" style={{ zIndex: 100, pointerEvents: 'auto' }}>
        <div className="flex items-center gap-3" style={{ pointerEvents: 'auto' }}>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 border border-blue-300">
            <svg className="size-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <span className="text-xs font-semibold text-blue-700">Existing Product</span>
          </div>
          <h4 className="font-semibold text-lg text-gray-800">Product {index + 1}</h4>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.nativeEvent?.stopImmediatePropagation();
            if (!isDisabled) {
              onRemove();
            }
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.nativeEvent?.stopImmediatePropagation();
            if (!isDisabled) {
              onRemove();
            }
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!isDisabled) {
              onRemove();
            }
          }}
          disabled={isDisabled}
          className="btn btn-red font-semibold text-sm"
          style={{ 
            pointerEvents: isDisabled ? 'none' : 'auto',
            zIndex: 99999,
            position: 'relative',
            minWidth: '100px',
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none'
          }}
          tabIndex={isDisabled ? -1 : 0}
        >
          {isRemoving ? "Removing..." : "Remove"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ pointerEvents: 'none' }}>
        {/* Product Selection - Locked */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">
            Product <span className="text-red-500">*</span>
          </label>
          <div className="relative rounded-3xl border-[1.5px] border-gray-300 bg-gray-100 overflow-hidden opacity-75">
            <div className="flex items-center pr-4 absolute transform -translate-y-1/2 top-1/2 left-6 border-r-[1.5px] border-gray-300">
              <img
                src="/assets/images/icons/bag-grey.svg"
                className="flex size-6 shrink-0"
                alt="icon"
              />
            </div>
            <div className="w-full h-[72px] font-semibold text-lg pl-20 pr-6 pb-[14.5px] pt-[32px] flex items-center">
              {productName || "Unknown Product"}
            </div>
          </div>
        </div>

        {/* Quantity - Locked */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">
            Quantity <span className="text-red-500">*</span>
          </label>
          <div className="relative rounded-3xl border-[1.5px] border-gray-300 bg-gray-100 overflow-hidden opacity-75">
            <div className="flex items-center pr-4 absolute transform -translate-y-1/2 top-1/2 left-6 border-r-[1.5px] border-gray-300">
              <img
                src="/assets/images/icons/note-text-grey.svg"
                className="flex size-6 shrink-0"
                alt="icon"
              />
            </div>
            <div className="w-full h-[72px] font-semibold text-lg pl-20 pr-6 pb-[14.5px] pt-[34.5px] flex items-center">
              {productQuantity || 0} unit
            </div>
          </div>
        </div>

        {/* Expiry Date - Locked */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">
            Expiry Date <span className="text-red-500">*</span>
          </label>
          <div className="relative rounded-3xl border-[1.5px] border-gray-300 bg-gray-100 overflow-hidden opacity-75">
            <div className="flex items-center pr-4 absolute transform -translate-y-1/2 top-1/2 left-6 border-r-[1.5px] border-gray-300">
              <img
                src="/assets/images/icons/note-text-grey.svg"
                className="flex size-6 shrink-0"
                alt="icon"
              />
            </div>
            <div className="w-full h-[72px] font-semibold text-lg pl-20 pr-6 pb-[14.5px] pt-[34.5px] flex items-center">
              {productExpiryDate ? new Date(productExpiryDate).toLocaleDateString("en-US") : "N/A"}
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      {sourceType === "vending_machine" && (
        <div className="mt-2 p-4 rounded-xl bg-white border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <img
              src="/assets/images/icons/note-2-grey.svg"
              className="size-5"
              alt="info"
            />
            <h5 className="font-semibold text-sm text-gray-700">
              Stock Information
            </h5>
          </div>
          <p className="text-sm text-gray-600">
            Removing this product will return <span className="font-semibold text-green-600">{productQuantity || 0} unit</span> to the vending machine stock.
          </p>
        </div>
      )}
    </div>
  );
};

// Editable Product Field Component (for new products)
const EditableProductField = ({
  index,
  field,
  products,
  productsLoading,
  register,
  errors,
  fieldsLength,
  onRemove,
}: ProductFieldProps) => {
  return (
    <div
      key={field.id}
      className="flex flex-col gap-4 p-6 border-2 border-monday-border rounded-3xl bg-gray-50"
    >
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-lg">Product {index + 1}</h4>
        {fieldsLength > 1 && (
          <button
            type="button"
            onClick={onRemove}
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
              {...register(`products.${index}.product_id`, {
                valueAsNumber: true,
              })}
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

        {/* Expiry Date */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">
            Expiry Date <span className="text-red-500">*</span>
            <span className="text-xs text-monday-gray ml-2">
              (Important for FEFO)
            </span>
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
  );
};

const EditStockReturn = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const returnId = id ? parseInt(id) : 0;
  const { data: stockReturn, isPending } = useFetchStockReturn(returnId);
  const { mutate: updateStockReturn, isPending: isUpdating } = useUpdateStockReturn();
  const { mutate: removeProductFromReturn } = useRemoveStockReturnProduct();
  const { data: products, isPending: productsLoading } = useFetchProducts();
  const { data: warehouses, isPending: warehousesLoading } = useFetchWarehouses();
  const { data: vendingMachines, isPending: vendingMachinesLoading } = useFetchVendingMachines();
  const [showToast, setShowToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [showRemoveToast, setShowRemoveToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [removedProductName, setRemovedProductName] = useState<string>("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null);
  const [selectedVendingMachineId, setSelectedVendingMachineId] = useState<number | null>(null);
  const [isFormInitialized, setIsFormInitialized] = useState(false);
  const [removingProductIds, setRemovingProductIds] = useState<Set<number>>(new Set());

  const {
    register,
    handleSubmit,
    setError,
    control,
    reset,
    watch,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<StockReturnFormData>({
    resolver: zodResolver(stockReturnSchema),
    defaultValues: {
      source_type: "warehouse",
      from_warehouse_id: 0,
      from_vending_machine_id: 0,
      to_warehouse_id: 0,
      date: "",
      products: [{ product_id: 0, quantity: 1, expiry_date: "" }],
    },
  });

  const watchedProducts = watch("products");
  const watchedSourceType = watch("source_type");
  const watchedFromWarehouse = watch("from_warehouse_id");
  const watchedFromVendingMachine = watch("from_vending_machine_id");

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

  // Update selected IDs when form values change
  useEffect(() => {
    if (watchedFromWarehouse && watchedFromWarehouse > 0) {
      setSelectedWarehouseId(watchedFromWarehouse);
    } else {
      setSelectedWarehouseId(null);
    }
  }, [watchedFromWarehouse]);

  useEffect(() => {
    if (watchedFromVendingMachine && watchedFromVendingMachine > 0) {
      setSelectedVendingMachineId(watchedFromVendingMachine);
    } else {
      setSelectedVendingMachineId(null);
    }
  }, [watchedFromVendingMachine]);

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "products",
  });

  // Store setValue in ref to ensure it's always available
  const setValueRef = useRef(setValue);
  useEffect(() => {
    setValueRef.current = setValue;
  }, [setValue]);

  // Load return data when available
  useEffect(() => {
    if (isFormInitialized) return;
    
    if (stockReturn && !isPending && !productsLoading && products && !vendingMachinesLoading && vendingMachines && !warehousesLoading && warehouses) {
      // Determine source_type based on available data
      const sourceType = stockReturn.source_type || 
        (stockReturn.from_vending_machine_id ? "vending_machine" : "warehouse");
      
      if (!stockReturn.stock_return_products || stockReturn.stock_return_products.length === 0) {
        const formData = {
          source_type: sourceType as "warehouse" | "vending_machine",
          from_warehouse_id: stockReturn.from_warehouse_id || 0,
          from_vending_machine_id: stockReturn.from_vending_machine_id || 0,
          to_warehouse_id: stockReturn.to_warehouse_id || 0,
          date: stockReturn.date ? stockReturn.date.split("T")[0] : "",
          notes: stockReturn.notes || "",
          products: [{ product_id: 0, quantity: 1, expiry_date: "" }],
        };
        reset(formData, { keepDefaultValues: false });
        setTimeout(() => {
          setValueRef.current("from_warehouse_id", formData.from_warehouse_id, { shouldValidate: false });
          setValueRef.current("from_vending_machine_id", formData.from_vending_machine_id, { shouldValidate: false });
          setValueRef.current("to_warehouse_id", formData.to_warehouse_id, { shouldValidate: false });
          replace([{ product_id: 0, quantity: 1, expiry_date: "" }]);
          setIsFormInitialized(true);
        }, 100);
        setSelectedWarehouseId(formData.from_warehouse_id || null);
        setSelectedVendingMachineId(formData.from_vending_machine_id || null);
        return;
      }
      
      const productsData = stockReturn.stock_return_products.map((srp) => {
        const productId = srp.product_id || srp.product?.id || 0;
        const quantity = srp.quantity || 1;
        const expiryDate = srp.expiry_date 
          ? (srp.expiry_date.includes("T") ? srp.expiry_date.split("T")[0] : srp.expiry_date) 
          : "";
        
        return {
          product_id: productId,
          quantity: quantity,
          expiry_date: expiryDate,
          batch_number: srp.batch_number || "",
          notes: srp.notes || "",
        };
      });
      
      const formData = {
        source_type: sourceType as "warehouse" | "vending_machine",
        from_warehouse_id: stockReturn.from_warehouse_id || 0,
        from_vending_machine_id: stockReturn.from_vending_machine_id || 0,
        to_warehouse_id: stockReturn.to_warehouse_id || 0,
        date: stockReturn.date ? stockReturn.date.split("T")[0] : "",
        notes: stockReturn.notes || "",
        products: productsData,
      };
      
      reset(formData, { keepDefaultValues: false });
      setTimeout(() => {
        setValueRef.current("from_warehouse_id", formData.from_warehouse_id, { shouldValidate: false, shouldDirty: false });
        setValueRef.current("from_vending_machine_id", formData.from_vending_machine_id, { shouldValidate: false, shouldDirty: false });
        setValueRef.current("to_warehouse_id", formData.to_warehouse_id, { shouldValidate: false, shouldDirty: false });
        replace(productsData);
        setIsFormInitialized(true);
      }, 150);
      
      setSelectedWarehouseId(formData.from_warehouse_id || null);
      setSelectedVendingMachineId(formData.from_vending_machine_id || null);
    }
  }, [stockReturn, isPending, productsLoading, products, vendingMachinesLoading, vendingMachines, warehousesLoading, warehouses, reset, replace, isFormInitialized]);

  const onSubmit = (data: StockReturnFormData) => {
    setError("root", { type: "server", message: "" });

    // Filter out existing products - only send new products
    const newProducts = data.products.filter((product) => {
      if (!product.product_id || product.product_id === 0) return false;
      
      // Check if this product is an existing one (already in stockReturn)
      const isExisting = stockReturn?.stock_return_products?.some(
        (srp) => {
          const srpProductId = srp.product_id || srp.product?.id;
          return srpProductId === product.product_id;
        }
      );
      
      return !isExisting; // Only include if it's NOT existing
    });

    // Clean payload: remove unused fields based on source_type
    const cleanedProducts = newProducts.map((product) => {
      let expiryDate = product.expiry_date;
      if (expiryDate) {
        const dateObj = new Date(expiryDate);
        if (!isNaN(dateObj.getTime())) {
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
    let cleanedPayload: UpdateStockReturnPayload;
    
    if (data.source_type === "warehouse") {
      cleanedPayload = {
        id: returnId,
        source_type: "warehouse",
        to_warehouse_id: data.to_warehouse_id,
        date: data.date,
        products: cleanedProducts,
      };
      
      if (data.from_warehouse_id && data.from_warehouse_id > 0) {
        cleanedPayload.from_warehouse_id = data.from_warehouse_id;
      }
      
      if (data.notes) {
        cleanedPayload.notes = data.notes;
      }
    } else if (data.source_type === "vending_machine") {
      cleanedPayload = {
        id: returnId,
        source_type: "vending_machine",
        to_warehouse_id: data.to_warehouse_id,
        date: data.date,
        products: cleanedProducts,
      };
      
      if (data.from_vending_machine_id && data.from_vending_machine_id > 0) {
        cleanedPayload.from_vending_machine_id = data.from_vending_machine_id;
      }
      
      if (data.notes) {
        cleanedPayload.notes = data.notes;
      }
    } else {
      cleanedPayload = {
        id: returnId,
        source_type: data.source_type,
        to_warehouse_id: data.to_warehouse_id,
        date: data.date,
        products: cleanedProducts,
      };
      if (data.notes) {
        cleanedPayload.notes = data.notes;
      }
    }

    // Only send update if there are new products or other fields changed
    // If only existing products were removed (no new products), we might not need to update
    // But for now, we'll send the update anyway (backend should handle it)
    console.log("📤 Submitting updated stock return data:", JSON.stringify(cleanedPayload, null, 2));
    console.log("📤 New products count:", cleanedProducts.length);
    console.log("📤 Existing products in form:", data.products.length);

    updateStockReturn(cleanedPayload, {
        onSuccess: () => {
          setShowToast(true);
          setTimeout(() => {
            setShowToast(false);
            navigate("/stock-management/stock-retur");
          }, 2000);
        },
        onError: (error: AxiosError<ApiErrorResponse>) => {
          const { message, errors: fieldErrors } = error.response?.data || {};
          
          // ✅ Set error message untuk toast
          const errorMsg = message || "Failed to update Stock Return. Please try again.";
          setErrorMessage(errorMsg);
          setShowErrorToast(true);
          
          // ✅ Auto-hide setelah 2 detik
          setTimeout(() => {
            setShowErrorToast(false);
          }, 1400);
          
          // ✅ Set error untuk form validation (field-specific errors)
          if (fieldErrors) {
            Object.entries(fieldErrors).forEach(([key, value]) => {
              setError(key as keyof StockReturnFormData, {
                type: "server",
                message: value[0],
              });
            });
          }
        },
      }
    );
  };

  const addProduct = () => {
    append({ product_id: 0, quantity: 1, expiry_date: "" });
  };

  const removeProduct = async (index: number) => {
    const product = watchedProducts[index];
    
    // Try to find existing product by checking if product_id matches any existing product in stockReturn
    let existingReturnProductId: number | null = null;
    let productName = "";
    
    if (product?.product_id && product.product_id > 0 && stockReturn?.stock_return_products) {
      // Find the matching stock_return_product by product_id
      const matchingReturnProduct = stockReturn.stock_return_products.find(
        (srp) => {
          const srpProductId = srp.product_id || srp.product?.id;
          return srpProductId === product.product_id;
        }
      );
      
      if (matchingReturnProduct?.id) {
        existingReturnProductId = matchingReturnProduct.id;
        productName = matchingReturnProduct.product?.name || products?.find(p => p.id === product.product_id)?.name || "Unknown Product";
      }
    }
    
    // If it's an existing product, call API to remove it
    if (existingReturnProductId && returnId > 0 && product?.product_id) {
      // Prevent multiple simultaneous removes
      if (removingProductIds.has(existingReturnProductId)) {
        return;
      }
      
      setRemovingProductIds(prev => new Set(prev).add(existingReturnProductId));
      
      // OPTIMISTIC UPDATE: Remove from UI immediately for instant feedback
      const removedIndex = index;
      remove(removedIndex);
      
      // Show success notification immediately
      setRemovedProductName(productName);
      setShowRemoveToast(true);
      
      // Auto-hide notification after 1 second
      setTimeout(() => {
        setShowRemoveToast(false);
      }, 1000);
      
      // Call API in background
      removeProductFromReturn(
        {
          returnId: returnId,
          productId: product.product_id,
        },
        {
          onSuccess: () => {
            // Refetch stock return to get updated data
            queryClient.invalidateQueries({ queryKey: ["stock-return", returnId] });
          },
          onError: (error: AxiosError<ApiErrorResponse>) => {
            console.error("Error removing product:", error);
            
            // ROLLBACK: Add product back to form if API fails
            const rollbackProduct = {
              product_id: product.product_id,
              quantity: product.quantity || 0,
              expiry_date: product.expiry_date || "",
              batch_number: product.batch_number || "",
              notes: product.notes || "",
            };
            
            // Get current products and insert back at the same index
            const currentProducts = watchedProducts || [];
            const newProducts = [...currentProducts];
            newProducts.splice(removedIndex, 0, rollbackProduct);
            
            // Use replace to restore the product
            replace(newProducts);
            
            // Hide toast and show error
            setShowRemoveToast(false);
            const errorMessage = error.response?.data?.message || "Failed to remove product. Please try again.";
            alert(errorMessage);
          },
          onSettled: () => {
            setRemovingProductIds(prev => {
              const next = new Set(prev);
              next.delete(existingReturnProductId!);
              return next;
            });
          },
        }
      );
    } else {
      // It's a new product, just remove from form immediately
      if (fields.length > 1) {
        remove(index);
      }
    }
  };

  if (isPending) {
    return <LoadingSpinner />;
  }

  if (!stockReturn) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="font-semibold text-xl text-gray-500 mb-2">
            Stock Return not found
          </p>
          <Link to="/stock-management/stock-retur" className="btn btn-primary font-semibold">
            Back to Stock Return
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Success Toast for Remove */}
      {showRemoveToast && (
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
                  Product Removed Successfully
                </h3>
                <p className="text-xs text-gray-600 leading-snug">
                  {removedProductName} has been removed and stock has been returned.
                </p>
              </div>

              <button
                onClick={() => setShowRemoveToast(false)}
                className="w-full px-4 py-1.5 rounded-md bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-semibold text-xs transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-[1.01] active:scale-[0.99]"
                aria-label="Close"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
                  Stock return data has been successfully updated.
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
                width: "380px",
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

              {/* Text Content */}
              <div className="text-center mb-3" style={{ padding: "0 2px" }}>
                <h3 className="font-bold text-base text-gray-900 mb-1">
                  Update Failed
                </h3>
                <p className="text-xs text-gray-600 leading-snug">
                  {errorMessage}
                </p>
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
              <h1 className="font-bold text-2xl">Edit Stock Return</h1>
              <p className="font-medium text-base text-monday-gray">
                Update stock return information
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
            id="Edit-Stock-Return"
            className="flex flex-col gap-6 flex-1 rounded-3xl p-[18px] px-0 bg-white"
          >
            <form onSubmit={handleSubmit(onSubmit)} className="flex gap-6 px-[18px]" style={{ position: 'relative' }} onClick={(e) => {
              const target = e.target as HTMLElement;
              if (target.closest('button[type="button"]')) {
                e.stopPropagation();
              }
            }}>
              <div className="flex flex-col gap-6 flex-1">
                {errors.root && !showErrorToast && (
                  <div className="w-full py-2 px-3 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-xs font-medium text-center text-red-600">
                      {errors.root.message}
                    </p>
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
                      Remove existing products or add new products
                    </p>
                  </div>

                  {fields.map((field, index) => {
                    const product = watchedProducts[index];
                    const productId = product?.product_id || 0;
                    
                    // Check if this is an existing product
                    const isExisting = stockReturn?.stock_return_products?.some(
                      (srp) => {
                        const srpProductId = srp.product_id || srp.product?.id;
                        return srpProductId === productId;
                      }
                    );
                    
                    if (isExisting && productId > 0) {
                      // Find the matching stock return product for details
                      const matchingReturnProduct = stockReturn.stock_return_products?.find(
                        (srp) => {
                          const srpProductId = srp.product_id || srp.product?.id;
                          return srpProductId === productId;
                        }
                      );
                      
                      const productName = matchingReturnProduct?.product?.name || 
                                         products?.find(p => p.id === productId)?.name || 
                                         "Unknown Product";
                      const productQuantity = matchingReturnProduct?.quantity || product?.quantity || 0;
                      const productExpiryDate = matchingReturnProduct?.expiry_date || product?.expiry_date || "";
                      const returnProductId = matchingReturnProduct?.id;
                      
                      return (
                        <LockedProductField
                          key={field.id}
                          index={index}
                          field={field}
                          productId={productId}
                          productName={productName}
                          productQuantity={productQuantity}
                          productExpiryDate={productExpiryDate}
                          selectedWarehouseId={selectedWarehouseId}
                          selectedVendingMachineId={selectedVendingMachineId}
                          sourceType={watchedSourceType}
                          fieldsLength={fields.length}
                          onRemove={() => removeProduct(index)}
                          isRemoving={returnProductId ? removingProductIds.has(returnProductId) : false}
                          isExistingProduct={true}
                        />
                      );
                    } else {
                      // New product - editable
                      return (
                        <EditableProductField
                          key={field.id}
                          index={index}
                          field={field}
                          productId={productId}
                          selectedWarehouseId={selectedWarehouseId}
                          selectedVendingMachineId={selectedVendingMachineId}
                          sourceType={watchedSourceType}
                          products={products}
                          productsLoading={productsLoading}
                          register={register}
                          errors={errors}
                          fieldsLength={fields.length}
                          onRemove={() => removeProduct(index)}
                          watch={watch}
                        />
                      );
                    }
                  })}
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
                    disabled={isUpdating}
                    className="btn btn-primary font-semibold"
                  >
                    {isUpdating ? "Saving..." : "Save Data"}
                  </button>
                </div>
              </div>
            </form>
          </section>
        </main>
    </>
  );
};

export default EditStockReturn;






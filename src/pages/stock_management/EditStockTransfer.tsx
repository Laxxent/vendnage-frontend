import { useUpdateStockTransfer, useFetchStockTransfer, useFetchProductStockBalance, useRemoveStockTransferProduct, useFetchAllStockReturns } from "../../hooks/useStockManagement";
import { useFetchProducts } from "../../hooks/useProducts";
import { useFetchWarehouses } from "../../hooks/useWarehouses";
import { useFetchVendingMachines } from "../../hooks/useVendingMachines";
import { useForm, useFieldArray, FieldErrors, UseFormRegister, UseFormWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AxiosError } from "axios";
import { ApiErrorResponse } from "../../types/types";
import { Link, useParams } from "react-router-dom";
import { useState, useEffect, useMemo, useRef } from "react";
import { StockTransferFormData, stockTransferSchema } from "../../schemas/stockTransferSchema";
import UserProfileCard from "../../components/UserProfileCard";
import { useNavigate } from "react-router-dom";
import LoadingSpinner from "../../components/LoadingSpinner";
import { useQueryClient } from "@tanstack/react-query";

// Extended Product Field Props with isExisting flag
interface ProductFieldProps {
  index: number;
  field: { id: string };
  productId: number;
  selectedWarehouseId: number | null;
  products: Array<{ id: number; name: string }> | undefined;
  productsLoading: boolean;
  register: UseFormRegister<StockTransferFormData>;
  errors: FieldErrors<StockTransferFormData>;
  fieldsLength: number;
  onRemove: () => void;
  watch: UseFormWatch<StockTransferFormData>;
  isExisting?: boolean; // New: flag to identify existing products
  isRemoving?: boolean; // New: flag to show loading state
  productName?: string; // New: product name for locked products
  productQuantity?: number; // New: quantity for locked products
  stockReturnCodeMap: Map<string, string>;
}

// Separate interface for Locked Product Field
interface LockedProductFieldProps {
  index: number;
  field: { id: string };
  productId: number;
  selectedWarehouseId: number | null;
  fieldsLength: number;
  onRemove: () => void;
  isRemoving?: boolean;
  productName: string;
  productQuantity: number;
  isExistingProduct?: boolean; // Flag to indicate this is an existing product
  stockReturnCodeMap: Map<string, string>;
}

// Locked Product Field Component (for existing products)
const LockedProductField = ({
  index,
  field,
  productId,
  productName,
  productQuantity,
  selectedWarehouseId,
  fieldsLength,
  onRemove,
  isRemoving,
  isExistingProduct = true, // Default to true for locked products
  stockReturnCodeMap,
}: LockedProductFieldProps) => {
  // For existing products, we should always be able to remove them
  // (they exist in database, so removing is valid even if it's the only product)
  const canRemove = isExistingProduct || fieldsLength > 1;
  const isDisabled = isRemoving || !canRemove;
  // Only fetch stock balance if productId is valid and warehouse is selected
  const { data: stockBalances } = useFetchProductStockBalance(
    productId > 0 ? productId : 0,
    selectedWarehouseId && selectedWarehouseId > 0 ? selectedWarehouseId : undefined
  );
  
  // Filter stock balances to ensure only the selected product's stock is shown
  const filteredStockBalances = stockBalances?.filter(
    (balance) => balance.product_id === productId
  ) || [];
  
  const totalAvailable = filteredStockBalances.reduce(
    (sum, b) => sum + b.quantity_remaining,
    0
  );

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
      </div>

      {/* Stock Availability Info */}
      {productId && productId > 0 && selectedWarehouseId && (
        <div className="mt-2 p-4 rounded-xl bg-white border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <img
              src="/assets/images/icons/note-2-grey.svg"
              className="size-5"
              alt="info"
            />
            <h5 className="font-semibold text-sm text-gray-700">
              Available Stock in Warehouse (after removal)
            </h5>
          </div>
          {totalAvailable > 0 ? (
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Total available: <span className="font-semibold text-green-600">{totalAvailable + (productQuantity || 0)} unit</span>
                <span className="text-xs text-gray-500 ml-2">(current: {totalAvailable} + returning: {productQuantity || 0})</span>
              </p>
              {filteredStockBalances && filteredStockBalances.length > 0 && (
                <div className="text-xs text-gray-500 space-y-1">
                  <p className="font-semibold mb-1">Available batches (FEFO/FIFO):</p>
                  {filteredStockBalances.slice(0, 3).map((balance, idx) => {
                    // Get batch code with priority: stock_in.code > stock_return.code > stock_in_id
                    const getBatchCode = () => {
                      // Priority 1: Use stock_in.code if available and not empty
                      if (balance.stock_in?.code && balance.stock_in.code.trim() !== "") {
                        return balance.stock_in.code;
                      }
                      
                      // Priority 2: If stock_in_id is 0 or stock_in.code is missing,
                      // try to get batch code from stock return
                      const stockInId = balance.stock_in_id || 0;
                      const productId = balance.product_id || 0;
                      const warehouseId = balance.warehouse_id || 0;
                      const mapKey = `${stockInId}:${productId}:${warehouseId}`;
                      
                      if (stockReturnCodeMap.has(mapKey)) {
                        return stockReturnCodeMap.get(mapKey)!;
                      }
                      
                      // Priority 3: Fallback to stock_in_id (should not happen in normal cases)
                      // Only show #0 if stock_in_id is actually 0, otherwise show the ID
                      if (stockInId === 0) {
                        return "#0";
                      }
                      return `#${stockInId}`;
                    };
                    
                    return (
                      <p key={idx} className="pl-2">
                        • Batch {getBatchCode()}:{" "}
                        {balance.quantity_remaining} unit
                        {balance.expiry_date && (
                          <span className="text-orange-600">
                            {" "}(Exp: {new Date(balance.expiry_date).toLocaleDateString("en-US")})
                          </span>
                        )}
                      </p>
                    );
                  })}
                  {filteredStockBalances.length > 3 && (
                    <p className="pl-2 text-gray-400">
                      ... and {filteredStockBalances.length - 3} more batches
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-600 font-semibold">
              Stock will be returned: <span className="text-green-600">{productQuantity || 0} unit</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// Editable Product Field Component (for new products)
const EditableProductField = ({
  index,
  field,
  productId,
  selectedWarehouseId,
  products,
  productsLoading,
  register,
  errors,
  fieldsLength,
  onRemove,
  watch,
  stockReturnCodeMap,
}: ProductFieldProps) => {
  // Only fetch stock balance if productId is valid and warehouse is selected
  const { data: stockBalances } = useFetchProductStockBalance(
    productId > 0 ? productId : 0,
    selectedWarehouseId && selectedWarehouseId > 0 ? selectedWarehouseId : undefined
  );
  
  // Filter stock balances to ensure only the selected product's stock is shown
  const filteredStockBalances = stockBalances?.filter(
    (balance) => balance.product_id === productId
  ) || [];
  
  const totalAvailable = filteredStockBalances.reduce(
    (sum, b) => sum + b.quantity_remaining,
    0
  );
  
  // Watch quantity value for this product
  const watchedQuantity = watch(`products.${index}.quantity`) as number | undefined;
  const quantityExceedsStock = watchedQuantity && totalAvailable > 0 && watchedQuantity > totalAvailable;

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
              max={totalAvailable}
              className="appearance-none w-full h-[72px] font-semibold text-lg rounded-3xl border-[1.5px] border-monday-border pl-20 pr-6 pb-[14.5px] pt-[34.5px] placeholder-shown:pt-[14.5px] focus:border-monday-black transition-300"
              placeholder="Enter quantity"
            />
          </label>
          {errors.products?.[index]?.quantity && (
            <p className="text-red-500 text-sm">
              {errors.products[index]?.quantity?.message}
            </p>
          )}
          {quantityExceedsStock && (
            <div className="flex items-center gap-2 mt-1 p-2 rounded-lg bg-orange-50 border border-orange-200">
              <svg className="size-4 flex-shrink-0 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-orange-700">
                Quantity yang di-transfer ({watchedQuantity} unit) melebihi stock yang tersedia di warehouse ({totalAvailable} unit)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Stock Availability Info */}
      {productId && productId > 0 && selectedWarehouseId && (
        <div className="mt-2 p-4 rounded-xl bg-white border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <img
              src="/assets/images/icons/note-2-grey.svg"
              className="size-5"
              alt="info"
            />
            <h5 className="font-semibold text-sm text-gray-700">
              Available Stock in Warehouse
            </h5>
          </div>
          {totalAvailable > 0 ? (
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Total available: <span className="font-semibold text-green-600">{totalAvailable} unit</span>
              </p>
              {filteredStockBalances && filteredStockBalances.length > 0 && (
                <div className="text-xs text-gray-500 space-y-1">
                  <p className="font-semibold mb-1">Available batches (FEFO/FIFO):</p>
                  {filteredStockBalances.slice(0, 3).map((balance, idx) => {
                    // Get batch code with priority: stock_in.code > stock_return.code > stock_in_id
                    const getBatchCode = () => {
                      // Priority 1: Use stock_in.code if available and not empty
                      if (balance.stock_in?.code && balance.stock_in.code.trim() !== "") {
                        return balance.stock_in.code;
                      }
                      
                      // Priority 2: If stock_in_id is 0 or stock_in.code is missing,
                      // try to get batch code from stock return
                      const stockInId = balance.stock_in_id || 0;
                      const productId = balance.product_id || 0;
                      const warehouseId = balance.warehouse_id || 0;
                      const mapKey = `${stockInId}:${productId}:${warehouseId}`;
                      
                      if (stockReturnCodeMap.has(mapKey)) {
                        return stockReturnCodeMap.get(mapKey)!;
                      }
                      
                      // Priority 3: Fallback to stock_in_id (should not happen in normal cases)
                      // Only show #0 if stock_in_id is actually 0, otherwise show the ID
                      if (stockInId === 0) {
                        return "#0";
                      }
                      return `#${stockInId}`;
                    };
                    
                    return (
                      <p key={idx} className="pl-2">
                        • Batch {getBatchCode()}:{" "}
                        {balance.quantity_remaining} unit
                        {balance.expiry_date && (
                          <span className="text-orange-600">
                            {" "}(Exp: {new Date(balance.expiry_date).toLocaleDateString("en-US")})
                          </span>
                        )}
                      </p>
                    );
                  })}
                  {filteredStockBalances.length > 3 && (
                    <p className="pl-2 text-gray-400">
                      ... and {filteredStockBalances.length - 3} more batches
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-red-600 font-semibold">
              Stock not available in this warehouse
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const EditStockTransfer = () => {
  const { id } = useParams<{ id: string }>();
  const transferId = id ? parseInt(id) : 0;
  const { data: stockTransfer, isPending: isLoading } = useFetchStockTransfer(transferId);
  const { mutate: updateStockTransfer, isPending } = useUpdateStockTransfer();
  const { mutate: removeProductFromTransfer } = useRemoveStockTransferProduct();
  const { data: products, isPending: productsLoading } = useFetchProducts();
  const { data: warehouses, isPending: warehousesLoading } = useFetchWarehouses();
  const { data: vendingMachines, isPending: vendingMachinesLoading } = useFetchVendingMachines();
  const { data: allStockReturns = [] } = useFetchAllStockReturns();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showToast, setShowToast] = useState(false);
  const [showRemoveToast, setShowRemoveToast] = useState(false);
  const [removedProductName, setRemovedProductName] = useState<string>("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null);

  // Create mapping from (stock_in_id, product_id, warehouse_id) to stock return code
  const stockReturnCodeMap = useMemo(() => {
    const map = new Map<string, string>(); // Key: "stock_in_id:product_id:warehouse_id", Value: stock_return.code
    
    allStockReturns.forEach((stockReturn) => {
      if (!stockReturn.stock_return_products || !stockReturn.code) {
        return;
      }
      
      const toWarehouseId = stockReturn.to_warehouse_id || 0;
      
      stockReturn.stock_return_products.forEach((srp) => {
        const stockInId = srp.stock_in_id || 0;
        const productId = srp.product_id || 0;
        
        if (stockInId >= 0 && productId > 0 && stockReturn.code) {
          const key = `${stockInId}:${productId}:${toWarehouseId}`;
          map.set(key, stockReturn.code);
        }
        
        // Also create mapping for stock_in_id = 0 case (when stock balance comes from stock return)
        if (stockInId === 0 && productId > 0 && stockReturn.code) {
          const keyForZero = `0:${productId}:${toWarehouseId}`;
          map.set(keyForZero, stockReturn.code);
        }
      });
    });
    
    return map;
  }, [allStockReturns]);
  const [isFormInitialized, setIsFormInitialized] = useState(false);
  // Track existing products: Map<productId, { id: stockTransferProductId, quantity, productName }>
  // Note: We track this but don't actively use it in the current implementation
  const [, setExistingProducts] = useState<Map<number, { id: number; quantity: number; productName: string }>>(new Map());
  // Track which products are currently being removed
  const [removingProductIds, setRemovingProductIds] = useState<Set<number>>(new Set());

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<StockTransferFormData>({
    resolver: zodResolver(stockTransferSchema),
    defaultValues: {
      from_warehouse_id: 0,
      to_vending_machine_id: 0,
      date: new Date().toISOString().split("T")[0],
      status: "pending" as "pending" | "completed" | "cancelled",
      products: [{ product_id: 0, quantity: 1 }],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "products",
  });

  // Store setValue in ref to ensure it's always available
  const setValueRef = useRef(setValue);
  useEffect(() => {
    setValueRef.current = setValue;
  }, [setValue]);

  const watchedWarehouse = watch("from_warehouse_id");
  const watchedProducts = watch("products");

  // Filter out inactive/maintenance vending machines, but keep the currently selected one
  const watchedVendingMachineId = watch("to_vending_machine_id");
  const currentVendingMachineId = stockTransfer?.to_vending_machine_id || watchedVendingMachineId;
  const activeVendingMachines = useMemo(() => {
    if (!vendingMachines) return [];
    
    return vendingMachines.filter((vm) => {
      // Keep active vending machines OR the currently selected one (even if inactive)
      const isActive = vm.status !== "inactive" && vm.status !== "maintenance";
      const isSelected = currentVendingMachineId && Number(vm.id) === Number(currentVendingMachineId);
      return isActive || isSelected;
    });
  }, [vendingMachines, currentVendingMachineId]);

  // Load transfer data when available - wait for all required data to be loaded
  useEffect(() => {
    // Prevent multiple initializations
    if (isFormInitialized) return;
    
    // Wait for stockTransfer data, products list, warehouses, and vendingMachines to be loaded
    if (
      stockTransfer && 
      !isLoading && 
      !productsLoading && 
      products &&
      !warehousesLoading &&
      warehouses &&
      !vendingMachinesLoading &&
      vendingMachines
    ) {
      // Check if stock_transfer_products exists and has data
      if (!stockTransfer.stock_transfer_products || stockTransfer.stock_transfer_products.length === 0) {
        
        // Still reset form with empty product
        const formData = {
          from_warehouse_id: Number(stockTransfer.from_warehouse_id) || 0,
          to_vending_machine_id: Number(stockTransfer.to_vending_machine_id) || 0,
          date: stockTransfer.date ? stockTransfer.date.split("T")[0] : new Date().toISOString().split("T")[0],
          reference: stockTransfer.reference || "",
          notes: stockTransfer.notes || "",
          status: (stockTransfer.status as "pending" | "completed" | "cancelled") || "pending",
          products: [{ product_id: 0, quantity: 1 }],
        };
        
        // Reset form first
        reset(formData, { keepDefaultValues: false });
        
        // Then explicitly set values to ensure select fields update
        setTimeout(() => {
          setValueRef.current("from_warehouse_id", formData.from_warehouse_id, { shouldValidate: false });
          setValueRef.current("to_vending_machine_id", formData.to_vending_machine_id, { shouldValidate: false });
          replace([{ product_id: 0, quantity: 1 }]);
          setIsFormInitialized(true);
        }, 100);
        
        setSelectedWarehouseId(formData.from_warehouse_id || null);
        return;
      }
      
      // Prepare products array and track existing products
      const existingProductsMap = new Map<number, { id: number; quantity: number; productName: string }>();
      const productsData = stockTransfer.stock_transfer_products.map((stp) => {
        const productId = stp.product_id || stp.product?.id || 0;
        const quantity = stp.quantity || 1;
        const productName = stp.product?.name || products?.find(p => p.id === productId)?.name || "Unknown Product";
        
        // Track existing product with its database ID
        if (stp.id && productId > 0) {
          existingProductsMap.set(stp.id, {
            id: stp.id,
            quantity: Number(quantity),
            productName: productName,
          });
        }
        
        return {
          product_id: Number(productId),
          quantity: Number(quantity),
        };
      });
      
      setExistingProducts(existingProductsMap);
      
      // Ensure warehouse and vending machine IDs are numbers
      const warehouseId = Number(stockTransfer.from_warehouse_id) || 0;
      const vendingMachineId = Number(stockTransfer.to_vending_machine_id) || 0;
      
      const formData = {
        from_warehouse_id: warehouseId,
        to_vending_machine_id: vendingMachineId,
        date: stockTransfer.date ? stockTransfer.date.split("T")[0] : new Date().toISOString().split("T")[0],
        reference: stockTransfer.reference || "",
        notes: stockTransfer.notes || "",
        status: (stockTransfer.status as "pending" | "completed" | "cancelled") || "pending",
        products: productsData,
      };
      
      // Reset form with all data
      reset(formData, { keepDefaultValues: false });
      
      // IMPORTANT: Explicitly set values after reset to ensure select fields update
      // Use setTimeout to ensure reset() completes and DOM is ready
      setTimeout(() => {
        setValueRef.current("from_warehouse_id", warehouseId, { shouldValidate: false, shouldDirty: false });
        setValueRef.current("to_vending_machine_id", vendingMachineId, { shouldValidate: false, shouldDirty: false });
        replace(productsData);
        setIsFormInitialized(true);
      }, 150);
      
      setSelectedWarehouseId(warehouseId || null);
    }
  }, [stockTransfer, isLoading, productsLoading, products, warehousesLoading, warehouses, vendingMachinesLoading, vendingMachines, reset, replace, setValue, isFormInitialized]);

  useEffect(() => {
    if (watchedWarehouse && watchedWarehouse > 0) {
      setSelectedWarehouseId(watchedWarehouse);
    } else {
      setSelectedWarehouseId(null);
    }
  }, [watchedWarehouse]);

  const onSubmit = (data: StockTransferFormData) => {
    setError("root", { type: "server", message: "" });

    // Filter out existing products - only send new products
    // Existing products that weren't removed are still in the database
    // We only need to add new products via update
    const newProducts = data.products.filter((product) => {
      if (!product.product_id || product.product_id === 0) return false;
      
      // Check if this product is an existing one (already in stockTransfer)
      const isExisting = stockTransfer?.stock_transfer_products?.some(
        (stp) => {
          const stpProductId = stp.product_id || stp.product?.id;
          return stpProductId === product.product_id;
        }
      );
      
      return !isExisting; // Only include if it's NOT existing
    });

    // Build the payload explicitly to ensure status is included
    // Only include products field if there are new products to add
    // If only updating status/other fields without new products, don't send products array
    const updatePayload: any = {
      id: transferId,
      from_warehouse_id: data.from_warehouse_id,
      to_vending_machine_id: data.to_vending_machine_id,
      date: data.date,
      status: data.status || "pending", // CRITICAL: Ensure status is included
    };

    // Only add optional fields if they have values
    if (data.reference) {
      updatePayload.reference = data.reference;
    }
    if (data.notes) {
      updatePayload.notes = data.notes;
    }
    
    // Only include products if there are new products to add
    // Backend doesn't need products array if we're only updating status/other fields
    if (newProducts.length > 0) {
      updatePayload.products = newProducts;
    }

    console.log("📤 Updating stock transfer data:", JSON.stringify(updatePayload, null, 2));
    console.log("📤 Status being sent:", updatePayload.status);
    console.log("📤 Full payload keys:", Object.keys(updatePayload));
    console.log("📤 Has products field?", "products" in updatePayload);
    console.log("📤 New products count:", newProducts.length);
    console.log("📤 Existing products in form:", data.products.length);

    // OPTIMISTIC NOTIFICATION: Show success toast immediately
    setShowToast(true);
    
    // Auto-hide notification after 1 second
    setTimeout(() => {
      setShowToast(false);
      setTimeout(() => {
        navigate("/stock-management/stock-transfer");
      }, 100);
    }, 1000);

    // If there are no new products and no changes to other fields, we might not need to update
    // But for now, we'll send the update anyway (backend should handle it)
    updateStockTransfer(
      updatePayload,
      {
        onSuccess: (response) => {
          console.log("✅ Stock Transfer updated successfully");
          console.log("✅ Response from backend:", response);
          console.log("✅ Status in response:", response?.status);
          // Toast already shown and auto-hidden optimistically
          // Navigation already triggered above
        },
        onError: (error: AxiosError<ApiErrorResponse>) => {
          // Hide optimistic toast on error
          setShowToast(false);
          
          if (error.response) {
            const { message, errors } = error.response.data;

            if (message) {
              setError("root", { type: "server", message });
            }

            if (errors) {
              Object.entries(errors).forEach(([key, messages]) => {
                setError(key as keyof StockTransferFormData, {
                  type: "server",
                  message: messages[0],
                });
              });
            }
          }
        },
      }
    );
  };

  const addProduct = () => {
    append({ product_id: 0, quantity: 1 });
  };

  const removeProduct = async (index: number) => {
    const product = watchedProducts[index];
    
    // Try to find existing product by checking if product_id matches any existing product in stockTransfer
    let existingTransferProductId: number | null = null;
    let productName = "";
    
    if (product?.product_id && product.product_id > 0 && stockTransfer?.stock_transfer_products) {
      // Find the matching stock_transfer_product by product_id
      const matchingTransferProduct = stockTransfer.stock_transfer_products.find(
        (stp) => {
          const stpProductId = stp.product_id || stp.product?.id;
          return stpProductId === product.product_id;
        }
      );
      
      if (matchingTransferProduct?.id) {
        existingTransferProductId = matchingTransferProduct.id;
        productName = matchingTransferProduct.product?.name || products?.find(p => p.id === product.product_id)?.name || "Unknown Product";
      }
    }
    
    // If it's an existing product, call API to remove it
    if (existingTransferProductId && transferId > 0) {
      // Prevent multiple simultaneous removes
      if (removingProductIds.has(existingTransferProductId)) {
        return;
      }
      
      setRemovingProductIds(prev => new Set(prev).add(existingTransferProductId));
      
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
      removeProductFromTransfer(
        {
          transferId: transferId,
          productId: product.product_id,
        },
        {
          onSuccess: () => {
            // Remove from existing products map
            setExistingProducts(prev => {
              const next = new Map(prev);
              next.delete(existingTransferProductId!);
              return next;
            });
            
            // Refetch stock transfer to get updated data
            queryClient.invalidateQueries({ queryKey: ["stock-transfer", transferId] });
          },
          onError: (error: AxiosError<ApiErrorResponse>) => {
            console.error("Error removing product:", error);
            
            // ROLLBACK: Add product back to form if API fails
            const rollbackProduct = {
              product_id: product.product_id,
              quantity: product.quantity || 0,
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
              next.delete(existingTransferProductId!);
              return next;
            });
            // Note: Toast is already set to auto-hide after 2 seconds above
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

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!stockTransfer) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="font-semibold text-xl text-gray-500 mb-2">
            Stock Transfer not found
          </p>
          <Link
            to="/stock-management/stock-transfer"
            className="btn btn-primary font-semibold"
          >
            Back to List
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
                  {removedProductName} has been removed and stock has been returned to warehouse.
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
                  Transfer has been successfully updated. System automatically uses FEFO/FIFO.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowToast(false);
                  navigate("/stock-management/stock-transfer");
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
              <h1 className="font-bold text-2xl">Edit Stock Transfer</h1>
              <p className="font-medium text-base text-monday-gray">
                Update stock transfer information (automatic FEFO/FIFO)
              </p>
              <Link
                to="/stock-management/stock-transfer"
                className="flex items-center gap-[6px] text-monday-gray font-semibold mt-1"
              >
                <img
                  src="/assets/images/icons/arrow-left-grey.svg"
                  className="size-4 flex shrink-0"
                  alt="icon"
                />
                Back to Stock Transfer
              </Link>
            </div>
          </div>
          <UserProfileCard />
        </div>

        <main className="flex flex-col gap-6 flex-1">
          <section
            id="Edit-Stock-Transfer"
            className="flex flex-col gap-6 flex-1 rounded-3xl p-[18px] px-0 bg-white"
          >
            <form onSubmit={handleSubmit(onSubmit)} className="flex gap-6 px-[18px]" style={{ position: 'relative' }} onClick={(e) => {
              // Prevent form from blocking button clicks
              const target = e.target as HTMLElement;
              if (target.closest('button[type="button"]')) {
                e.stopPropagation();
              }
            }}>
              <div className="flex flex-col gap-6 flex-1">
                {errors.root && (
                  <div className="w-full py-2 px-3 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-xs font-medium text-center text-red-600">
                      {errors.root.message}
                    </p>
                  </div>
                )}

                {/* Info Box */}
                <div className="w-full py-4 px-6 rounded-2xl bg-blue-50 border-2 border-blue-200">
                  <div className="flex items-start gap-3">
                    <img
                      src="/assets/images/icons/note-2-grey.svg"
                      className="size-6 flex-shrink-0 mt-0.5"
                      alt="info"
                    />
                    <div>
                      <h4 className="font-semibold text-base text-blue-900 mb-1">
                        Automatic FEFO/FIFO System
                      </h4>
                      <p className="text-sm text-blue-700">
                        The system will automatically select batches that expire first (FEFO) 
                        or entered first (FIFO) when transfer is performed.
                      </p>
                    </div>
                  </div>
                </div>

                {/* From Warehouse */}
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
                      {...register("from_warehouse_id", {
                        valueAsNumber: true,
                      })}
                      disabled={warehousesLoading}
                      className="appearance-none w-full h-[72px] font-semibold text-lg outline-none pl-20 pr-6 pb-[14.5px] pt-[32px]"
                    >
                      <option value="0">Select source warehouse</option>
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

                {/* To Vending Machine */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700">
                    To Vending Machine <span className="text-red-500">*</span>
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
                      {...register("to_vending_machine_id", {
                        valueAsNumber: true,
                      })}
                      disabled={vendingMachinesLoading}
                      className="appearance-none w-full h-[72px] font-semibold text-lg outline-none pl-20 pr-6 pb-[14.5px] pt-[32px]"
                    >
                      <option value="0">Select destination vending machine</option>
                      {activeVendingMachines.map((vm) => (
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
                  {errors.to_vending_machine_id && (
                    <p className="text-red-500 text-sm">{errors.to_vending_machine_id.message}</p>
                  )}
                </div>

                {/* Date */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Transfer Date <span className="text-red-500">*</span>
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

                {/* Reference */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Reference (Optional)
                  </label>
                  <label className="group relative">
                    <div className="flex items-center pr-4 absolute transform -translate-y-1/2 top-1/2 left-6 border-r-[1.5px] border-monday-border">
                      <img
                        src="/assets/images/icons/document-text-grey.svg"
                        className="flex size-6 shrink-0"
                        alt="icon"
                      />
                    </div>
                    <input
                      type="text"
                      {...register("reference")}
                      className="appearance-none w-full h-[72px] font-semibold text-lg rounded-3xl border-[1.5px] border-monday-border pl-20 pr-6 pb-[14.5px] pt-[34.5px] placeholder-shown:pt-[14.5px] focus:border-monday-black transition-300"
                      placeholder="DO No., Delivery Note, etc."
                    />
                  </label>
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
                      placeholder="Additional notes"
                    />
                  </label>
                </div>

                {/* Status */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <label className="group relative rounded-3xl border-[1.5px] border-monday-border focus-within:border-monday-black transition-300 overflow-hidden">
                    <div className="flex items-center pr-4 absolute transform -translate-y-1/2 top-1/2 left-6 border-r-[1.5px] border-monday-border">
                      <img
                        src="/assets/images/icons/note-text-grey.svg"
                        className="flex size-6 shrink-0"
                        alt="icon"
                      />
                    </div>
                    <select
                      {...register("status")}
                      className="appearance-none w-full h-[72px] font-semibold text-lg outline-none pl-20 pr-6 pb-[14.5px] pt-[32px]"
                    >
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <img
                      src="/assets/images/icons/arrow-down-grey.svg"
                      className="absolute transform -translate-y-1/2 top-1/2 right-6 size-6"
                      alt="icon"
                    />
                  </label>
                  {errors.status && (
                    <p className="text-red-500 text-sm">{errors.status.message}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    💡 <strong>Important:</strong> Set status to "Completed" to create vending machine stock. Stock return from vending machine can only be done after status is "Completed".
                  </p>
                </div>

                {/* Products Section */}
                <div className="flex flex-col gap-4">
                  <div>
                    <h3 className="font-semibold text-xl">Products to Transfer</h3>
                    <p className="text-sm text-monday-gray">
                      Select products and quantities to transfer
                    </p>
                  </div>

                  {fields.map((field, index) => {
                    const product = watchedProducts[index];
                    const productId = product?.product_id || 0;
                    
                    // Check if this is an existing product
                    const isExisting = stockTransfer?.stock_transfer_products?.some(
                      (stp) => {
                        const stpProductId = stp.product_id || stp.product?.id;
                        return stpProductId === productId;
                      }
                    );
                    
                    if (isExisting && productId > 0) {
                      // Find the matching stock transfer product for details
                      const matchingTransferProduct = stockTransfer.stock_transfer_products?.find(
                        (stp) => {
                          const stpProductId = stp.product_id || stp.product?.id;
                          return stpProductId === productId;
                        }
                      );
                      
                      const productName = matchingTransferProduct?.product?.name || 
                                         products?.find(p => p.id === productId)?.name || 
                                         "Unknown Product";
                      const productQuantity = matchingTransferProduct?.quantity || product?.quantity || 0;
                      const transferProductId = matchingTransferProduct?.id;
                      
                      return (
                        <LockedProductField
                          key={field.id}
                          index={index}
                          field={field}
                          productId={productId}
                          productName={productName}
                          productQuantity={productQuantity}
                          selectedWarehouseId={selectedWarehouseId}
                          fieldsLength={fields.length}
                          onRemove={() => removeProduct(index)}
                          isRemoving={transferProductId ? removingProductIds.has(transferProductId) : false}
                          isExistingProduct={true}
                          stockReturnCodeMap={stockReturnCodeMap}
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
                          products={products}
                          productsLoading={productsLoading}
                          register={register}
                          errors={errors}
                          fieldsLength={fields.length}
                          onRemove={() => removeProduct(index)}
                          watch={watch}
                          stockReturnCodeMap={stockReturnCodeMap}
                        />
                      );
                    }
                  })}
                </div>

                {errors.products && typeof errors.products === "object" && (
                  <p className="text-red-500">Please fill all product fields</p>
                )}

                {/* Add Product Button - dipindahkan ke sini, di atas tombol Update Transfer */}
                <div className="flex items-center justify-end mb-2">
                  <button
                    type="button"
                    onClick={addProduct}
                    className="btn btn-primary font-semibold text-sm"
                  >
                    + Add Product
                  </button>
                </div>

                {/* Action Buttons (Cancel & Update Transfer) */}
                <div className="flex items-center justify-end gap-4">
                  <Link
                    to="/stock-management/stock-transfer"
                    className="btn btn-red font-semibold"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="btn btn-primary font-semibold"
                  >
                    {isPending ? "Updating..." : "Update Transfer"}
                  </button>
                </div>
              </div>
            </form>
          </section>
        </main>
    </>
  );
};

export default EditStockTransfer;



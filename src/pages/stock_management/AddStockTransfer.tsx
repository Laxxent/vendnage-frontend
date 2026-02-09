import { useCreateStockTransfer, useFetchAllStockReturns } from "../../hooks/useStockManagement";
import { useFetchProducts } from "../../hooks/useProducts";
import { useFetchWarehouses } from "../../hooks/useWarehouses";
import { useFetchVendingMachines } from "../../hooks/useVendingMachines";
import { useFetchProductStockBalance } from "../../hooks/useStockManagement";
import { useForm, useFieldArray, UseFormRegister, FieldErrors, UseFormWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AxiosError } from "axios";
import { ApiErrorResponse } from "../../types/types";
import { Link } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { StockTransferFormData, stockTransferSchema } from "../../schemas/stockTransferSchema";
import UserProfileCard from "../../components/UserProfileCard";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

// Separate component for Product Field to fix Rules of Hooks violation
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
  stockReturnCodeMap: Map<string, string>;
}

const ProductField = ({
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
    (sum, b) => sum + (b.quantity_remaining || 0),
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
              max={totalAvailable || undefined}
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

const AddStockTransfer = () => {
  const { mutate: createStockTransfer, isPending } = useCreateStockTransfer();
  const { data: products, isPending: productsLoading } = useFetchProducts();
  const { data: warehouses, isPending: warehousesLoading } = useFetchWarehouses();
  const { data: vendingMachines, isPending: vendingMachinesLoading } = useFetchVendingMachines();
  const { data: allStockReturns = [] } = useFetchAllStockReturns();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showToast, setShowToast] = useState(false);
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

  // Filter out inactive/maintenance vending machines
  const activeVendingMachines = vendingMachines?.filter(
    (vm) => vm.status !== "inactive" && vm.status !== "maintenance"
  ) || [];

  const {
    register,
    handleSubmit,
    setError,
    control,
    watch,
    formState: { errors },
  } = useForm<StockTransferFormData>({
    resolver: zodResolver(stockTransferSchema),
    defaultValues: {
      from_warehouse_id: 0,
      to_vending_machine_id: 0,
      date: new Date().toISOString().split("T")[0],
      products: [{ product_id: 0, quantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "products",
  });

  const watchedWarehouse = watch("from_warehouse_id");
  const watchedProducts = watch("products");

  useEffect(() => {
    const warehouseId = Number(watchedWarehouse) || 0;
    console.log(`🏭 Warehouse watch value:`, watchedWarehouse, `converted to:`, warehouseId);
    if (warehouseId > 0) {
      setSelectedWarehouseId(warehouseId);
      console.log(`🏭 Warehouse changed to:`, warehouseId);
      // Invalidate and refetch all stock-balance queries when warehouse changes
      queryClient.invalidateQueries({ queryKey: ["stock-balance"] });
      queryClient.refetchQueries({ queryKey: ["stock-balance"] });
    } else {
      setSelectedWarehouseId(null);
    }
  }, [watchedWarehouse, queryClient]);
  
  // Also refetch when products change
  useEffect(() => {
    const productIds = watchedProducts?.map(p => p?.product_id).filter(id => id && id > 0) || [];
    if (productIds.length > 0) {
      console.log(`📦 Products changed:`, productIds);
      // Invalidate and refetch all stock-balance queries when products change
      queryClient.invalidateQueries({ queryKey: ["stock-balance"] });
      queryClient.refetchQueries({ queryKey: ["stock-balance"] });
    }
  }, [watchedProducts, queryClient]);

  const onSubmit = (data: StockTransferFormData) => {
    setError("root", { type: "server", message: "" });

    console.log("Submitting stock transfer data:", data);

    createStockTransfer(data, {
      onSuccess: () => {
        // ✅ Tampilkan toast langsung
        setShowToast(true);
        
        // ✅ Navigate setelah 1.5 detik (cukup untuk user melihat toast)
        setTimeout(() => {
          setShowToast(false);
          navigate("/stock-management/stock-transfer");
        }, 1500); // ✅ Kurangi dari 2000ms menjadi 1500ms, dan hapus nested setTimeout
      },
      onError: (error: AxiosError<ApiErrorResponse>) => {
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
    });
  };

  const addProduct = () => {
    append({ product_id: 0, quantity: 1 });
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
                  Transfer has been successfully created. System automatically uses FEFO/FIFO.
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
              <h1 className="font-bold text-2xl">Add Stock Transfer</h1>
              <p className="font-medium text-base text-monday-gray">
                Transfer products from warehouse to vending machine (automatic FEFO/FIFO)
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
            id="Add-Stock-Transfer"
            className="flex flex-col gap-6 flex-1 rounded-3xl p-[18px] px-0 bg-white"
          >
            <form onSubmit={handleSubmit(onSubmit)} className="flex gap-6 px-[18px]">
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
                      {...register("to_vending_machine_id")}
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

                {/* Products Section */}
                <div className="flex flex-col gap-4">
                  <div>
                    <h3 className="font-semibold text-xl">Products to Transfer</h3>
                    <p className="text-sm text-monday-gray">
                      Select products and quantities to transfer
                    </p>
                  </div>

                  {fields.map((field, index) => {
                    const productId = Number(watchedProducts[index]?.product_id) || 0;
                    console.log(`🔍 Rendering ProductField ${index}:`, {
                      productId,
                      selectedWarehouseId,
                      watchedProduct: watchedProducts[index],
                      rawProductId: watchedProducts[index]?.product_id,
                    });
                    return (
                      <ProductField
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
                  })}
                </div>

                {errors.products && typeof errors.products === "object" && (
                  <p className="text-red-500">Please fill all product fields</p>
                )}

                {/* Add Product Button - dipindahkan ke sini, di atas tombol Save Transfer */}
                <div className="flex items-center justify-end mb-2">
                  <button
                    type="button"
                    onClick={addProduct}
                    className="btn btn-primary font-semibold text-sm"
                  >
                    + Add Product
                  </button>
                </div>

                {/* Action Buttons (Cancel & Save Transfer) */}
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
                    {isPending ? "Saving..." : "Save Transfer"}
                  </button>
                </div>
              </div>
            </form>
          </section>
        </main>
    </>
  );
};

export default AddStockTransfer;


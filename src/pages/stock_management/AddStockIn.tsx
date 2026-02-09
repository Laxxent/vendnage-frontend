import { useCreateStockIn } from "../../hooks/useStockManagement";
import { useFetchProducts } from "../../hooks/useProducts";
import { useFetchWarehouses } from "../../hooks/useWarehouses";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AxiosError } from "axios";
import { ApiErrorResponse } from "../../types/types";
import { Link } from "react-router-dom";
import { useState } from "react";
import { StockInFormData, stockInSchema } from "../../schemas/stockInSchema";
import UserProfileCard from "../../components/UserProfileCard";
import { useNavigate } from "react-router-dom";

const AddStockIn = () => {
  const { mutate: createStockIn, isPending } = useCreateStockIn();
  const { data: products, isPending: productsLoading } = useFetchProducts();
  const { data: warehouses, isPending: warehousesLoading } = useFetchWarehouses();
  const navigate = useNavigate();
  const [showToast, setShowToast] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm<StockInFormData>({
    resolver: zodResolver(stockInSchema),
    defaultValues: {
      warehouse_id: 0,
      date: new Date().toISOString().split("T")[0],
      products: [{ product_id: 0, quantity: 1, price: 0, expiry_date: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "products",
  });

  const onSubmit = (data: StockInFormData) => {
    setError("root", { type: "server", message: "" });

    console.log("Submitting stock in data:", data);

    createStockIn(data, {
      onSuccess: () => {
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
          setTimeout(() => {
            // ✅ Redirect ke page 1 untuk memastikan data baru terlihat
            navigate("/stock-management/stock-in?page=1");
          }, 100);
        }, 2000);
      },
      onError: (error: AxiosError<ApiErrorResponse>) => {
        if (error.response) {
          const { message, errors } = error.response.data;

          if (message) {
            setError("root", { type: "server", message });
          }

          if (errors) {
            Object.entries(errors).forEach(([key, messages]) => {
              setError(key as keyof StockInFormData, {
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
    append({ product_id: 0, quantity: 1, price: 0, expiry_date: "" });
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
                  Stock in data has been successfully created and saved.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowToast(false);
                  navigate("/stock-management/stock-in");
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
              <h1 className="font-bold text-2xl">Add Stock In</h1>
              <p className="font-medium text-base text-monday-gray">
                Record products entering the warehouse
              </p>
              <Link
                to="/stock-management/stock-in"
                className="flex items-center gap-[6px] text-monday-gray font-semibold mt-1"
              >
                <img
                  src="/assets/images/icons/arrow-left-grey.svg"
                  className="size-4 flex shrink-0"
                  alt="icon"
                />
                Back to Stock In
              </Link>
            </div>
          </div>
          <UserProfileCard />
        </div>

        <main className="flex flex-col gap-6 flex-1">
          <section
            id="Add-Stock-In"
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

                {/* Warehouse Selection */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Select Warehouse <span className="text-red-500">*</span>
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
                      {...register("warehouse_id")}
                      disabled={warehousesLoading}
                      className="appearance-none w-full h-[72px] font-semibold text-lg outline-none pl-20 pr-6 pb-[14.5px] pt-[32px]"
                    >
                      <option value="0">Select warehouse</option>
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
                  {errors.warehouse_id && (
                    <p className="text-red-500 text-sm">{errors.warehouse_id.message}</p>
                  )}
                </div>

                {/* Date */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Date In <span className="text-red-500">*</span>
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
                      Add products entering the warehouse
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

                        {/* Price */}
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-semibold text-gray-700">
                            Price <span className="text-red-500">*</span>
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
                              type="number"
                              {...register(`products.${index}.price`, {
                                valueAsNumber: true,
                              })}
                              min="0.01"
                              step="0.01"
                              required
                              className="appearance-none w-full h-[72px] font-semibold text-lg rounded-3xl border-[1.5px] border-monday-border pl-20 pr-6 pb-[14.5px] pt-[34.5px] placeholder-shown:pt-[14.5px] focus:border-monday-black transition-300"
                              placeholder="Enter price"
                            />
                          </label>
                          {errors.products?.[index]?.price && (
                            <p className="text-red-500 text-sm">
                              {errors.products[index]?.price?.message}
                            </p>
                          )}
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
                    to="/stock-management/stock-in"
                    className="btn btn-red font-semibold"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="btn btn-primary font-semibold"
                  >
                    {isPending ? "Saving..." : "Save Data"}
                  </button>
                </div>
              </div>
            </form>
          </section>
        </main>
    </>
  );
};

export default AddStockIn;

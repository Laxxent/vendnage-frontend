import { Link, useParams } from "react-router-dom";
import { useFetchVendingMachine, useFetchVendingMachineStocks } from "../../hooks/useVendingMachines";
import UserProfileCard from "../../components/UserProfileCard";
import { useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import LoadingSpinner from "../../components/LoadingSpinner";


const VendingMachineStockPage = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: vendingMachine, isPending: isVendingMachineLoading } = useFetchVendingMachine(Number(id));
  const { data: stocks = [], isPending: isStocksLoading } = useFetchVendingMachineStocks(Number(id));

  // Force refetch when component mounts to ensure fresh data
  useEffect(() => {
    if (id) {
      queryClient.invalidateQueries({ queryKey: ["vending-machine-stocks", Number(id)] });
    }
  }, [id, queryClient]);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString || dateString === "" || dateString === "null" || dateString === "undefined") {
      return "N/A";
    }
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "N/A";
      }
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      console.warn("Error formatting date:", dateString, error);
      return "N/A";
    }
  };

  // ✅ Sort stocks by expiry date (FEFO) and date transferred (FIFO)
  const sortedStocks = useMemo(() => {
    return [...stocks].sort((a, b) => {
      // First sort by expiry date (FEFO - First Expired First Out)
      if (a.expiry_date && b.expiry_date) {
        const dateA = new Date(a.expiry_date).getTime();
        const dateB = new Date(b.expiry_date).getTime();
        if (dateA !== dateB) {
          return dateA - dateB; // Earlier expiry first
        }
      } else if (a.expiry_date && !b.expiry_date) {
        return -1; // Items with expiry date come first
      } else if (!a.expiry_date && b.expiry_date) {
        return 1;
      }
      
      // If expiry dates are same or both null, sort by date transferred (FIFO)
      if (a.date_transferred && b.date_transferred) {
        const transferA = new Date(a.date_transferred).getTime();
        const transferB = new Date(b.date_transferred).getTime();
        return transferA - transferB; // Earlier transfer first
      }
      
      return 0;
    });
  }, [stocks]);

  if (isVendingMachineLoading || isStocksLoading) {
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
      <div
        id="Top-Bar"
        className="flex items-center w-full gap-6 mt-[30px] mb-6"
      >
        <div className="flex items-center justify-between gap-6 h-[92px] bg-white w-full rounded-3xl p-[18px] border border-monday-border">
          <div className="flex flex-col gap-4">
            <h1 className="font-bold text-2xl text-gray-900">Vending Machine Stock</h1>
            <Link
              to={"/vending-machines"}
              className="flex items-center gap-[6px] text-monday-gray font-semibold hover:text-gray-900 transition-colors"
            >
              <img
                src="/assets/images/icons/arrow-left-grey.svg"
                className="size-4 flex shrink-0"
                alt="icon"
              />
              Manage Vending Machines
            </Link>
          </div>
          <div className="flex flex-col items-end gap-3">
            <p className="font-semibold text-lg text-gray-900">
              {vendingMachine.name}
            </p>
            {vendingMachine.location && (
              <p className="font-semibold text-base text-gray-700">
                {vendingMachine.location}
              </p>
            )}
          </div>
        </div>
        <UserProfileCard />
      </div>
      <main className="flex flex-col gap-6 flex-1">
        <section
          id="Vending-Machine-Stock"
          className="flex flex-col gap-6 flex-1 rounded-3xl p-[18px] px-0 bg-white"
        >
          <div
            id="Header"
            className="flex items-center justify-between px-[18px]"
          >
            <div className="flex flex-col gap-[6px]">
              <p className="flex items-center gap-[6px]">
                <img
                  src="/assets/images/icons/box-black.svg"
                  className="size-6 flex shrink-0"
                  alt="icon"
                />
                <span className="font-semibold text-2xl">
                  {sortedStocks.length} Stock Batches
                </span>
              </p>
              <p className="font-semibold text-lg text-monday-gray">
                Stock in {vendingMachine.name} (sorted by FEFO/FIFO)
              </p>
            </div>
          </div>
          <hr className="border-monday-border" />
          <div id="Stock-List" className="flex flex-col px-4 gap-5 flex-1">
            {sortedStocks && sortedStocks.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-monday-border bg-monday-gray-background">
                      <th className="text-left py-4 px-4 font-semibold text-lg">Product Image</th>
                      <th className="text-left py-4 px-4 font-semibold text-lg">Product Name</th>
                      <th className="text-left py-4 px-4 font-semibold text-lg">Batch Code</th>
                      <th className="text-left py-4 px-4 font-semibold text-lg">Date Transferred</th>
                      <th className="text-left py-4 px-4 font-semibold text-lg">Expiry Date</th>
                      <th className="text-left py-4 px-4 font-semibold text-lg">Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedStocks.map((stock, index) => (
                      <tr
                        key={stock.id || `stock-${stock.product_id}-${stock.stock_in_id}-${index}`}
                        className="border-b border-monday-border hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-4 px-4">
                          {stock.product?.thumbnail ? (
                            <div className="flex items-center justify-center">
                              <img
                                src={stock.product.thumbnail}
                                alt={stock.product.name}
                                className="size-16 object-cover rounded-xl"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center justify-center size-16 bg-gray-200 rounded-xl">
                              <img
                                src="/assets/images/icons/box-grey.svg"
                                className="size-8 opacity-50"
                                alt="no image"
                              />
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-semibold text-lg text-gray-900">
                            {stock.product?.name || `Product ID: ${stock.product_id}`}
                          </p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-semibold text-base text-gray-900">
                            {(() => {
                              // ✅ Batch code: Ambil dari stock_in.code (backend sudah include)
                              // Fallback: Generate dari stock_in_id jika code tidak ada
                              if (stock.stock_in?.code && stock.stock_in.code.trim() !== '') {
                                return stock.stock_in.code;
                              } else if (stock.stock_in_id && stock.stock_in_id > 0) {
                                // Generate batch code dari stock_in_id sebagai fallback
                                return `STK-IN-${stock.stock_in_id}`;
                              } else {
                                return "N/A";
                              }
                            })()}
                          </p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-medium text-base text-gray-700">
                            {formatDate(stock.date_transferred)}
                          </p>
                        </td>
                        <td className="py-4 px-4">
                          {(() => {
                            // Helper untuk safe date parsing
                            const safeFormatDate = (dateString: string | undefined | null): string => {
                              if (!dateString || dateString === "null" || dateString === "undefined" || (typeof dateString === 'string' && dateString.trim() === "")) {
                                return "N/A";
                              }
                              
                              try {
                                const date = new Date(dateString);
                                if (isNaN(date.getTime())) {
                                  console.warn("Invalid date format:", dateString);
                                  return "N/A";
                                }
                                return date.toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                });
                              } catch (error) {
                                console.warn("Error formatting date:", dateString, error);
                                return "N/A";
                              }
                            };

                            // Helper untuk safe date comparison
                            const getExpiryStatus = (dateString: string | undefined | null): { color: string; weight: string } => {
                              if (!dateString || dateString === "null" || dateString === "undefined" || (typeof dateString === 'string' && dateString.trim() === "")) {
                                return { color: "text-gray-500", weight: "font-medium" };
                              }

                              try {
                                const expiryDate = new Date(dateString);
                                if (isNaN(expiryDate.getTime())) {
                                  return { color: "text-gray-500", weight: "font-medium" };
                                }

                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                expiryDate.setHours(0, 0, 0, 0);
                                const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                                if (expiryDate < today) {
                                  return { color: "text-red-600", weight: "font-bold" };
                                } else if (expiryDate <= thirtyDaysFromNow) {
                                  return { color: "text-orange-600", weight: "font-semibold" };
                                } else {
                                  return { color: "text-gray-700", weight: "font-medium" };
                                }
                              } catch (error) {
                                console.warn("Error comparing dates:", dateString, error);
                                return { color: "text-gray-500", weight: "font-medium" };
                              }
                            };

                            // ✅ Expiry date: Ambil dari stock.expiry_date (sudah di-extract di hook)
                            // Fallback: Try from stock_in.stock_in_products jika tidak ada
                            // Backend sudah include stock_in.stock_in_products, jadi fallback ini seharusnya jarang digunakan
                            let expiryDate = stock.expiry_date;
                            
                            // ✅ Fallback: Try from stock_in.stock_in_products (backend sudah include)
                            if (!expiryDate && stock.stock_in?.stock_in_products && Array.isArray(stock.stock_in.stock_in_products)) {
                              try {
                                const matchingProduct = stock.stock_in.stock_in_products.find(
                                  (sip: any) => sip?.product_id === stock?.product_id
                                );
                                if (matchingProduct?.expiry_date && typeof matchingProduct.expiry_date === 'string') {
                                  const cleaned = matchingProduct.expiry_date.trim();
                                  if (cleaned !== '' && cleaned !== 'null' && cleaned !== 'undefined') {
                                    expiryDate = cleaned;
                                  }
                                }
                              } catch (err) {
                                console.warn("Error accessing stock_in.stock_in_products in UI:", err);
                              }
                            }

                            const formattedDate = safeFormatDate(expiryDate);
                            const status = getExpiryStatus(expiryDate);

                            return (
                              <p className={`${status.weight} text-base ${status.color}`}>
                                {formattedDate}
                              </p>
                            );
                          })()}
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-semibold text-lg text-gray-900">
                            {stock.quantity.toLocaleString("id")} unit
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <img
                  src="/assets/images/icons/box-grey.svg"
                  className="size-16 mb-4 opacity-50"
                  alt="empty icon"
                />
                <p className="font-semibold text-xl text-gray-500 mb-2">
                  No Stock Available
                </p>
                <p className="font-medium text-base text-monday-gray">
                  No stock has been transferred to this vending machine yet.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
};

export default VendingMachineStockPage;


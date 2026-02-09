import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./providers/AuthProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, lazy, Suspense } from "react";
import LoadingSpinner from "./components/LoadingSpinner";

// ✅ Public pages - tidak perlu lazy load (perlu cepat)
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Unauthorized from "./pages/Unauthorized";

import ProtectedRoute from "./routes/ProtectedRoute";

// ✅ Lazy load semua protected pages untuk code splitting
const Overview = lazy(() => import("./pages/Overview"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));

// Brand Pages
const BrandList = lazy(() => import("./pages/brands/BrandList"));
const AddBrand = lazy(() => import("./pages/brands/AddBrand"));
const EditBrand = lazy(() => import("./pages/brands/EditBrand"));

// Product Pages
const ProductList = lazy(() => import("./pages/products/ProductList"));
const AddProduct = lazy(() => import("./pages/products/AddProduct"));
const EditProduct = lazy(() => import("./pages/products/EditProduct"));

// Warehouse Pages
const WarehouseList = lazy(() => import("./pages/warehouses/WarehouseList"));
const AddWarehouse = lazy(() => import("./pages/warehouses/AddWarehouse"));
const EditWarehouse = lazy(() => import("./pages/warehouses/EditWarehouse"));

// User Pages
const UserList = lazy(() => import("./pages/users/UserList"));
const AddUser = lazy(() => import("./pages/users/AddUser"));
const EditUser = lazy(() => import("./pages/users/EditUser"));

// Role Pages
const RoleList = lazy(() => import("./pages/roles/RoleList"));
const AddRole = lazy(() => import("./pages/roles/AddRole"));
const EditRole = lazy(() => import("./pages/roles/EditRole"));

// Merchant Product Pages - REMOVED (folder deleted during cleanup)
// const MerchantProductList = lazy(() => import("./pages/merchant_products/MerchantProductList"));
// const AddAssignProduct = lazy(() => import("./pages/merchant_products/AssignProduct"));
// const EditAssignProduct = lazy(() => import("./pages/merchant_products/EditAssignProduct"));

// User Roles
const AssignUserRoles = lazy(() => import("./pages/user_roles/AssignUserRoles"));

// Stock Management Pages
const StockInList = lazy(() => import("./pages/stock_management/StockInList"));
const AddStockIn = lazy(() => import("./pages/stock_management/AddStockIn"));
const EditStockIn = lazy(() => import("./pages/stock_management/EditStockIn"));
const StockReturnList = lazy(() => import("./pages/stock_management/StockReturnList"));
const AddStockReturn = lazy(() => import("./pages/stock_management/AddStockReturn"));
const EditStockReturn = lazy(() => import("./pages/stock_management/EditStockReturn"));
const StockTransferList = lazy(() => import("./pages/stock_management/StockTransferList"));
const AddStockTransfer = lazy(() => import("./pages/stock_management/AddStockTransfer"));
const EditStockTransfer = lazy(() => import("./pages/stock_management/EditStockTransfer"));
const StockBalancePage = lazy(() => import("./pages/stock_management/StockBalance"));
const ExpiryAlertPage = lazy(() => import("./pages/stock_management/ExpiryAlert"));

// Vending Machine Pages
const VendingMachineList = lazy(() => import("./pages/vending_machines/VendingMachineList"));
const AddVendingMachine = lazy(() => import("./pages/vending_machines/AddVendingMachine"));
const EditVendingMachine = lazy(() => import("./pages/vending_machines/EditVendingMachine"));
const VendingMachineStockPage = lazy(() => import("./pages/vending_machines/VendingMachineStock"));


// ✅ Create a QueryClient instance for React Query with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // ✅ 5 menit - data dianggap fresh lebih lama (reduce refetch)
      gcTime: 10 * 60 * 1000, // ✅ 10 menit - keep in cache lebih lama
      refetchOnWindowFocus: false, // ✅ Don't refetch on window focus (faster UX)
      refetchOnMount: true, // ✅ Refetch on mount if data is stale (ensure list updates after mutation)
      refetchOnReconnect: false, // ✅ Don't refetch on reconnect (faster UX)
      retry: 1, // ✅ Reduce retry attempts (faster failure recovery)
      retryDelay: 1000, // ✅ Retry delay 1 detik
    },
  },
});

// ✅ Loading fallback component untuk lazy loaded pages
const PageLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <LoadingSpinner />
  </div>
);

function App() {
  // Disable browser scroll restoration to prevent auto-scroll
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoadingFallback />}>
          <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          
          {/* Protected Routes - Generic untuk semua authenticated user */}
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute roles={['manager']} permissionPath="/settings"><Settings /></ProtectedRoute>} />
          <Route path="/overview" element={<ProtectedRoute><Overview /></ProtectedRoute>} />
          
          {/* Brand Routes - Generic untuk semua authenticated user */}
          <Route path="/brands" element={<ProtectedRoute><BrandList /></ProtectedRoute>} />
          <Route path="/brands/add" element={<ProtectedRoute roles={['manager']}><AddBrand /></ProtectedRoute>} />
          <Route path="/brands/edit/:id" element={<ProtectedRoute roles={['manager']}><EditBrand /></ProtectedRoute>} />
          
          {/* Product Routes - Generic untuk semua authenticated user */}
          <Route path="/products" element={<ProtectedRoute><ProductList /></ProtectedRoute>} />
          <Route path="/products/add" element={<ProtectedRoute roles={['manager']}><AddProduct /></ProtectedRoute>} />
          <Route path="/products/edit/:id" element={<ProtectedRoute roles={['manager']}><EditProduct /></ProtectedRoute>} />
          
          {/* Warehouse Routes - Generic untuk semua authenticated user */}
          <Route path="/warehouses" element={<ProtectedRoute><WarehouseList /></ProtectedRoute>} />
          <Route path="/warehouses/add" element={<ProtectedRoute roles={['manager']}><AddWarehouse /></ProtectedRoute>} />
          <Route path="/warehouses/edit/:id" element={<ProtectedRoute roles={['manager']}><EditWarehouse /></ProtectedRoute>} />
          
          {/* User Management Routes */}
          <Route path="/users" element={<ProtectedRoute roles={['manager']}><UserList /></ProtectedRoute>} />
          <Route path="/users/add" element={<ProtectedRoute roles={['manager']}><AddUser /></ProtectedRoute>} />
          <Route path="/users/edit/:id" element={<ProtectedRoute roles={['manager']}><EditUser /></ProtectedRoute>} />
          
          {/* Role Management Routes */}
          <Route path="/roles" element={<ProtectedRoute roles={['manager']}><RoleList /></ProtectedRoute>} />
          <Route path="/roles/add" element={<ProtectedRoute roles={['manager']}><AddRole /></ProtectedRoute>} />
          <Route path="/roles/edit/:id" element={<ProtectedRoute roles={['manager']}><EditRole /></ProtectedRoute>} />
          
          <Route path="/users/assign-roles" element={<ProtectedRoute roles={['manager']}><AssignUserRoles /></ProtectedRoute>} />
          
          {/* Merchant Management Routes - REMOVED */}
          {/* <Route path="/merchants" element={<ProtectedRoute roles={['manager']}><MerchantList /></ProtectedRoute>} /> */}
          {/* <Route path="/merchants/add" element={<ProtectedRoute roles={['manager']}><AddMerchant /></ProtectedRoute>} /> */}
          {/* <Route path="/merchants/edit/:id" element={<ProtectedRoute roles={['manager']}><EditMerchant /></ProtectedRoute>} /> */} 



          {/* Merchant Product Routes - REMOVED (folder deleted during cleanup) */}
          {/* <Route path="/merchant-products/:id" element={<ProtectedRoute roles={['manager']}><MerchantProductList /></ProtectedRoute>} /> */}
          {/* <Route path="/merchant-products/:id/assign" element={<ProtectedRoute roles={['manager']}><AddAssignProduct /></ProtectedRoute>} /> */}
          {/* <Route path="/merchant-products/:merchantId/edit-assign/:productId" 
            element={<ProtectedRoute roles={['manager']}><EditAssignProduct /></ProtectedRoute>} /> */}

          {/* warehouse Product Routes (For Managers) - DISABLED: Product management now handled via Stock In */}
          {/* <Route path="/warehouse-products/:id" element={<ProtectedRoute roles={['manager']}><WarehouseProductList /></ProtectedRoute>} /> */}
          {/* <Route path="/warehouse-products/:id/assign" element={<ProtectedRoute roles={['manager']}><AssignWarehouseProduct /></ProtectedRoute>} /> */}
          {/* <Route path="/warehouse-products/:warehouseId/edit-assign/:productId" 
            element={<ProtectedRoute roles={['manager']}><EditWarehouseProduct /></ProtectedRoute>} /> */}

          {/* Stock Management Routes - Generic untuk semua authenticated user */}
          <Route path="/stock-management/stock-in" element={<ProtectedRoute><StockInList /></ProtectedRoute>} />
          <Route path="/stock-management/stock-in/add" element={<ProtectedRoute><AddStockIn /></ProtectedRoute>} />
          <Route path="/stock-management/stock-in/edit/:id" element={<ProtectedRoute><EditStockIn /></ProtectedRoute>} />
          <Route path="/stock-management/stock-retur" element={<ProtectedRoute><StockReturnList /></ProtectedRoute>} />
          <Route path="/stock-management/stock-retur/add" element={<ProtectedRoute><AddStockReturn /></ProtectedRoute>} />
          <Route path="/stock-management/stock-retur/edit/:id" element={<ProtectedRoute><EditStockReturn /></ProtectedRoute>} />
          <Route path="/stock-management/stock-transfer" element={<ProtectedRoute><StockTransferList /></ProtectedRoute>} />
          <Route path="/stock-management/stock-transfer/add" element={<ProtectedRoute><AddStockTransfer /></ProtectedRoute>} />
          <Route path="/stock-management/stock-transfer/edit/:id" element={<ProtectedRoute><EditStockTransfer /></ProtectedRoute>} />
          <Route path="/stock-management/stock-balance" element={<ProtectedRoute><StockBalancePage /></ProtectedRoute>} />
          <Route path="/stock-management/expiry-alert" element={<ProtectedRoute><ExpiryAlertPage /></ProtectedRoute>} />

          {/* Vending Machine Routes */}
          <Route path="/vending-machines" element={<ProtectedRoute><VendingMachineList /></ProtectedRoute>} />
          <Route path="/vending-machines/add" element={<ProtectedRoute roles={["manager"]}><AddVendingMachine /></ProtectedRoute>} />
          <Route path="/vending-machines/edit/:id" element={<ProtectedRoute roles={["manager"]}><EditVendingMachine /></ProtectedRoute>} />
          <Route path="/vending-machines/:id/stock" element={<ProtectedRoute><VendingMachineStockPage /></ProtectedRoute>} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;

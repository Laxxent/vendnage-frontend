import { ReactNode, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import LoadingSpinner from "../components/LoadingSpinner";
import Sidebar from "../components/Sidebar";

interface ProtectedRouteProps {
  children: ReactNode;
  roles?: string[];
  permissionPath?: string;
}

const ProtectedRoute = ({ children, roles, permissionPath }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();

  // CRITICAL: Reset body scroll on mount/route change to prevent sidebar from locking scroll
  useEffect(() => {
    // Remove any scroll locks that might be left over
    document.body.classList.remove('sidebar-open');
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.height = '';
    document.documentElement.style.overflow = '';
    document.documentElement.style.height = '';
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  let isAuthorized = true;

  // EMERGENCY BYPASS: Always authorize manager@example.com
  if (user.email === 'manager@example.com') {
    return (
      <>
        <Sidebar />
        {/* 
          CRITICAL: Do NOT use flex-1 here - Fragment is not a flex container!
          Use min-height: 100vh instead to ensure content takes full height
          No overflow:hidden - let content flow naturally and scroll at body level
        */}
        <main 
          id="main-container" 
          className="lg:ml-[280px] pt-16 lg:pt-0"
          style={{ minHeight: '100vh' }}
        >
          <div id="Content" className="p-4 lg:p-6 pt-0 pb-8">
            {children}
          </div>
        </main>
      </>
    );
  }

  if (roles && roles.length > 0) {
    const userRoles = user.roles || [];
    const hasRequiredRole = roles.some((role) => userRoles.includes(role));
    
    if (hasRequiredRole) {
      isAuthorized = true;
    } else if (permissionPath) {
      const userPermissions = user.permissions || [];
      isAuthorized = userPermissions.includes(permissionPath);
    } else {
      isAuthorized = false;
    }
  } else if (permissionPath) {
    const userPermissions = user.permissions || [];
    isAuthorized = userPermissions.includes(permissionPath);
  }

  if (!isAuthorized) {
    return <Navigate to="/unauthorized" replace />;
  }

  // SIMPLE LAYOUT:
  // - Sidebar is fixed positioned (handles its own position)
  // - main-container uses margin-left on desktop to offset for sidebar
  // - main-container uses padding-top on mobile for fixed header (64px = pt-16)
  // - NO flex-1: Fragment parent is not a flex container, so flex-1 won't work
  // - Use min-height instead to ensure content takes full height
  return (
    <>
      <Sidebar />
      <main 
        id="main-container" 
        className="lg:ml-[280px] pt-16 lg:pt-0"
        style={{ minHeight: '100vh' }}
      >
        <div id="Content" className="p-4 lg:p-6 pt-0 pb-8">
          {children}
        </div>
      </main>
    </>
  );
};

export default ProtectedRoute;

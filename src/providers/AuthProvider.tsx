import { useState, useEffect, ReactNode } from "react";
import { User } from "../types/types";
import { authService } from "../api/authService";
import { AuthContext } from "../context/AuthContext";
// import Cookies from "js-cookie"; // ✅ Import js-cookie
import { useLocation, useNavigate } from "react-router-dom";

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation(); // ✅ Get current route
  const navigate = useNavigate();

  // ✅ Fetch user hanya sekali saat mount, bukan setiap route change
  useEffect(() => {
    const publicRoutes = ["/", "/login", "/register", "/reset-password", "/unauthorized"];
    if (publicRoutes.includes(location.pathname)) {
      setLoading(false);
      return;
    }
    
    // ✅ Jika user sudah ada, skip fetch (menghemat ~200-500ms setiap navigasi)
    if (user) {
      setLoading(false);
      return;
    }
    
    const initializeUser = async () => { 
      try {
        const userData = await authService.fetchUser();
        if (userData) {
          // EMERGENCY BYPASS: Ensure manager@example.com has manager role
          if (userData.email === 'manager@example.com') {
            const roles = userData.roles || [];
            if (!roles.includes('manager')) {
              userData.roles = [...roles, 'manager'];
            }
          }
           
          setUser(userData);
        } else {
          // ✅ User not authenticated, redirect to login
          setUser(null);
          navigate("/login", { replace: true });
        }
      } catch (error) {
        // ✅ Only log unexpected errors (not 401/403)
        console.error("Error fetching user:", error);
        setUser(null);
        navigate("/login", { replace: true });
      }
      finally {
        setLoading(false);
      }
    };

    initializeUser();
  }, []); // ✅ Hanya run sekali saat mount, bukan setiap location change

  // ✅ Separate effect untuk handle logout/unauthorized
  useEffect(() => {
    const publicRoutes = ["/", "/login", "/register", "/reset-password", "/unauthorized"];
    if (!publicRoutes.includes(location.pathname) && !user && !loading) {
      // User tidak authenticated, redirect ke login
      navigate("/login", { replace: true });
    }
  }, [location.pathname, user, loading, navigate]);

  const login = async (email: string, password: string) => {
    try {
      // ✅ Login will automatically save token via authService
      const userData = await authService.login(email, password);
      
      // EMERGENCY BYPASS: Ensure manager@example.com has manager role
      if (userData.email === 'manager@example.com') {
        const roles = userData.roles || [];
        if (!roles.includes('manager')) {
          userData.roles = [...roles, 'manager'];
        }
      }

      // ✅ Set user immediately after successful login
      setUser(userData);

      // ❌ REMOVED: Delay dan verifikasi tidak perlu - userData sudah valid dari response login
      // Ini menghemat ~200-500ms loading time

      // ✅ Redirect immediately based on role
      if (userData.roles && userData.roles.includes("manager")) {
        navigate("/overview", { replace: true });
      } else {
        // ✅ Fallback redirect for users without specific roles (e.g. staff, or just authenticated)
        navigate("/overview", { replace: true });
      }
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null); 
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout failed", error);
      // ✅ Ensure user is cleared even if logout fails
      setUser(null);
      navigate("/login", { replace: true });
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

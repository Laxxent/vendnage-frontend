import { useEffect } from "react";
import { useAuth } from "./useAuth";
import { useNavigate } from "react-router-dom";

export const useRoleRedirect = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user?.roles) {
      // Manager dan semua PIC redirect ke overview
      if (user.roles.length > 0) {
        navigate("/overview");
      }
    }
  }, [user, loading, navigate]);
};

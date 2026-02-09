import { useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../api/axiosConfig";
import { AxiosError } from "axios";
import { ApiErrorResponse } from "../types/types";

interface AssignUserRolePayload {
  user_id: number;
  role_id: number;
}
 
export const useAssignUserRole = () => {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    AxiosError<ApiErrorResponse>,
    AssignUserRolePayload
  >({
    mutationFn: async ({ user_id, role_id }) => {
      await apiClient.post("/users/roles", { user_id, role_id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] }); // Refresh user data
    },
    onError: (error) => {
      console.error("Failed to assign role:", error.response?.data);
    },
  });
};
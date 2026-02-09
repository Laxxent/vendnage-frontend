export interface Role {
    id: number;
    name: string;
    users_web_count: number;
    permissions?: string[]; // Array of page paths yang bisa diakses
  }
  
  export interface CreateRolePayload {
    name: string;
    permissions?: string[]; // Array of page paths
  }
  
  export interface UpdateRolePayload {
    id: number;
    name: string;
    permissions?: string[]; // Array of page paths
  }
  
  export interface User {
    id: number;
    name: string;
    email: string;
    photo: string;
    phone: string;
    roles?: string[];
    permissions?: string[]; // Array of page paths yang bisa diakses user
    token?: string;
    merchant: import("./merchant").Merchant;
  }

  export interface CreateUserPayload {
    name: string;
    phone: string;
    email: string;
    password: string;
    password_confirmation: string;
    photo?: File | null;
  } 

  export interface UpdateUserPayload {
    id: number;
    name: string;
    phone: string;
    email: string;
    role?: string; // ✅ Role field for updating user role
    password?: string;
    password_confirmation?: string;
    photo?: File | null;
  }
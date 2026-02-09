export interface PagePermission {
  path: string;
  label: string;
  category: string;
}

// Daftar semua halaman yang bisa diatur permission
export const AVAILABLE_PAGES: PagePermission[] = [
  // Main Menu
  {
    path: "/overview",
    label: "Overview",
    category: "Main Menu",
  },
  {
    path: "/products",
    label: "Products",
    category: "Main Menu",
  },
  {
    path: "/stock-management/stock-in",
    label: "Stock In",
    category: "Main Menu",
  },
  {
    path: "/stock-management/stock-return",
    label: "Stock Return",
    category: "Main Menu",
  },
  {
    path: "/stock-management/stock-transfer",
    label: "Stock Transfer",
    category: "Main Menu",
  },
  {
    path: "/stock-management/stock-balance",
    label: "Stock Balance",
    category: "Main Menu",
  },
  {
    path: "/stock-management/expiry-alert",
    label: "Expiry Alert",
    category: "Main Menu",
  },
  {
    path: "/brands",
    label: "Brands",
    category: "Main Menu",
  },
  {
    path: "/warehouses",
    label: "Warehouses",
    category: "Main Menu",
  },
  {
    path: "/vending-machines",
    label: "Vending Machines",
    category: "Main Menu",
  },
  // Account Settings
  {
    path: "/settings",
    label: "Settings",
    category: "Account Settings",
  },
  {
    path: "/users",
    label: "Users List",
    category: "Account Settings",
  },
  {
    path: "/users/assign-roles",
    label: "Assign Role",
    category: "Account Settings",
  },
];

// Group pages by category
export const getPagesByCategory = (): Record<string, PagePermission[]> => {
  const grouped: Record<string, PagePermission[]> = {};
  
  AVAILABLE_PAGES.forEach(page => {
    if (!grouped[page.category]) {
      grouped[page.category] = [];
    }
    grouped[page.category].push(page);
  });
  
  return grouped;
};

// Check if role is PIC role (generic - tidak hardcode)
// Role yang mengandung "pic" atau bukan "manager"/"admin" dianggap PIC
export const isPICRole = (roleName: string): boolean => {
  if (!roleName) return false;
  const name = roleName.toLowerCase();
  
  // Generic detection: role yang mengandung "pic" atau bukan "manager"/"admin"
  return name.includes('pic') || 
         (name !== 'manager' && name !== 'admin');
};


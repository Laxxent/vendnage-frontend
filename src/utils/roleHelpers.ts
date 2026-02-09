// Role constants - hanya untuk Manager
export const ROLES = {
  MANAGER: 'manager',
} as const;

// Check if user is manager (case-insensitive to handle both 'manager' and 'Manager')
export const isManager = (roles?: string[]): boolean => {
  if (!roles || roles.length === 0) return false;
  // Check both lowercase 'manager' and capitalized 'Manager' for compatibility
  return roles.some(role => role.toLowerCase() === 'manager');
};

// Check if user is any PIC (generic - tidak hardcode role names)
// PIC adalah semua role yang BUKAN manager
export const isPIC = (roles?: string[]): boolean => {
  if (!roles || roles.length === 0) return false;
  return !isManager(roles);
};

// Get all roles that can access a route
// Return empty array berarti semua role bisa akses
export const getAllAccessibleRoles = (): string[] => {
  // Empty array = semua authenticated user bisa akses
  return [];
};

// Get roles that can access management features (only Manager)
export const getManagerOnlyRoles = (): string[] => {
  return [ROLES.MANAGER];
};

// Get role display name (generic)
export const getRoleDisplayName = (role: string): string => {
  if (!role) return '';
  
  // Convert snake_case to UPPERCASE with spaces
  return role
    .split('_')
    .map(word => word.toUpperCase())
    .join(' ');
};

// Extract location dari role name (misal "PIC SEMARANG" -> "Semarang")
export const getUserLocationFromRole = (roles?: string[]): string | null => {
  if (!roles || roles.length === 0) return null;
  
  // Cari role yang mengandung "pic" (case insensitive)
  const picRole = roles.find(role => 
    role.toLowerCase().includes("pic")
  );
  
  if (!picRole) return null;
  
  // Extract location dari role name
  // Format: "PIC SEMARANG" atau "PIC JAKARTA" -> ambil bagian setelah "PIC"
  const parts = picRole.split(/\s+/); // Split by whitespace
  if (parts.length > 1) {
    // Ambil semua bagian setelah "PIC" dan join kembali
    const locationParts = parts.slice(1);
    return locationParts.join(" ").trim();
  }
  
  return null;
};


import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useState, useEffect, useMemo, useRef } from "react";
import { useFetchRoles } from "../hooks/useRoles";
import { createPortal } from "react-dom";

// REMOVED: All scroll-related code - scroll bar has been removed from sidebar

const Sidebar = () => {
  const { user } = useAuth();
  const location = useLocation();
  // Load accordion state from localStorage on mount
  const [openAccordions, setOpenAccordions] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-open-accordions');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  
  // Save accordion state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar-open-accordions', JSON.stringify(openAccordions));
    }
  }, [openAccordions]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  // Load collapsed state from localStorage on initial mount (desktop only)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Only load from localStorage if not mobile (check window width)
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      const saved = localStorage.getItem('sidebar-collapsed');
      return saved === 'true';
    }
    return false; // Default to expanded
  });
  
  // Use refs for direct DOM control
  const sidebarRef = useRef<HTMLElement | null>(null);
  const isMobileMenuOpenRef = useRef(false);

  const toggleAccordion = (label: string) => {
    setOpenAccordions((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label]
    );
  };

  
  // Get user's permissions directly from user object (backend should send this)
  // Only fetch roles if user is manager (PIC cannot access /api/roles endpoint, so we disable the query)
  const { data: allRoles = [] } = useFetchRoles();
  
  // Note: useFetchRoles will be disabled for PIC users to avoid 403 errors
  // This is handled in useRoles.ts by checking if query should be enabled

  // Helper helper to handle role as string or object
  const getRoleName = (role: any): string => {
    if (typeof role === 'string') return role;
    if (role && typeof role === 'object' && role.name) return role.name;
    return '';
  };

  // Compute effective roles (including bypass)
  const userRoles = useMemo(() => {
    const roles = user?.roles || [];
    // EMERGENCY FIX: Ensure manager@example.com always has manager access
    if (user?.email === 'manager@example.com') {
      const hasManager = roles.some(r => getRoleName(r).toLowerCase() === 'manager');
      if (!hasManager) {
        return [...roles, 'manager'];
      }
    }
    return roles;
  }, [user]);

  const userPermissions = useMemo(() => {
    // Priority 1: Use permissions directly from user object (if backend sends it)
    if (user?.permissions && Array.isArray(user.permissions) && user.permissions.length > 0) {
      return user.permissions;
    }
    
    // Priority 2: Fallback - get permissions from roles (only works for manager)
    if (!user || !user.roles || user.roles.length === 0) {
      return [];
    }
    
    if (allRoles.length === 0) {
      return [];
    }
    
    const permissions: string[] = [];
    
    user.roles.forEach((roleItem) => {
      const roleName = getRoleName(roleItem);
      // Case-insensitive matching untuk role name
      const role = allRoles.find((r) => 
        r.name.toLowerCase() === roleName.toLowerCase()
      );
      
      if (role) {
        if (role.permissions && Array.isArray(role.permissions)) {
          permissions.push(...role.permissions);
        }
      }
    });
    
    return permissions;
  }, [user, allRoles]);

  const sidebarMenus = [
    {
      section: "Main Menu",
      items: [
        {
          label: "Dashboard",
          path: "/overview",
          iconBlack: "/assets/images/icons/home-black.svg",
          iconBlue: "/assets/images/icons/home-blue-fill.svg",
          roles: [], // Empty = semua authenticated user bisa akses
          permissionPath: "/overview", // ✅ Added for permission checking
        },
        {
          label: "Products",
          path: "/products",
          iconBlack: "/assets/images/icons/bag-black.svg",
          iconBlue: "/assets/images/icons/bag-blue-fill.svg",
          roles: [],
          permissionPath: "/products", // ✅ Added for permission checking
        },
        {
          label: "Stock In",
          path: "/stock-management/stock-in",
          iconBlack: "/assets/images/icons/box-black.svg",
          iconBlue: "/assets/images/icons/box-black.svg",
          roles: [],
          permissionPath: "/stock-management/stock-in", // ✅ Added for permission checking
        },
        {
          label: "Stock Return",
          path: "/stock-management/stock-retur",
          iconBlack: "/assets/images/icons/shopping-cart-black.svg",
          iconBlue: "/assets/images/icons/shopping-cart-black.svg",
          roles: [],
          permissionPath: "/stock-management/stock-return", // ✅ Added for permission checking
        },
        {
          label: "Stock Transfer",
          path: "/stock-management/stock-transfer",
          iconBlack: "/assets/images/icons/arrow-right-black.svg",
          iconBlue: "/assets/images/icons/arrow-right-blue.svg",
          roles: [],
          permissionPath: "/stock-management/stock-transfer", // ✅ Added for permission checking
        },
        {
          label: "Stock Balance",
          path: "/stock-management/stock-balance",
          iconBlack: "/assets/images/icons/weight-black.svg",
          iconBlue: "/assets/images/icons/weight-black.svg",
          roles: [],
          permissionPath: "/stock-management/stock-balance", // ✅ Added for permission checking
        },
        {
          label: "Expiry Alert",
          path: "/stock-management/expiry-alert",
          iconBlack: "/assets/images/icons/notification-black.svg",
          iconBlue: "/assets/images/icons/notification-black.svg",
          roles: [],
          permissionPath: "/stock-management/expiry-alert", // ✅ Added for permission checking
        },
        {
          label: "Brands",
          path: "/brands",
          iconBlack: "/assets/images/icons/barcode-black.svg",
          iconBlue: "/assets/images/icons/barcode-black.svg",
          roles: [],
          permissionPath: "/brands", // ✅ Added for permission checking
        },
        {
          label: "Warehouses",
          path: "/warehouses",
          iconBlack: "/assets/images/icons/buildings-2-black.svg",
          iconBlue: "/assets/images/icons/buildings-2-blue-fill.svg",
          roles: [],
          permissionPath: "/warehouses", // ✅ Added for permission checking
        },
        {
          label: "Vending Machines",
          path: "/vending-machines",
          iconBlack: "/assets/images/icons/shop-black.svg",
          iconBlue: "/assets/images/icons/shop-blue-fill.svg",
          roles: [],
          permissionPath: "/vending-machines", // ✅ Added for permission checking
        },
        // Merchants menu removed
        // {
        //   label: "Merchants",
        //   path: "/merchants",
        //   iconBlack: "/assets/images/icons/shop-black.svg",
        //   iconBlue: "/assets/images/icons/shop-blue-fill.svg",
        //   roles: ["manager"],
        // },
      ],
    },
    {
      section: "Account Settings",
      items: [
        {
          label: "Roles",
          path: "/roles",
          iconBlack: "/assets/images/icons/stickynote-black.svg",
          iconBlue: "/assets/images/icons/stickynote-blue-fill.svg",
          roles: ["manager"],
          permissionPath: "/roles",
        },
        {
          label: "Manage Users",
          iconBlack: "/assets/images/icons/user-square-black.svg",
          iconBlue: "/assets/images/icons/user-square-black.svg",
          roles: ["manager"],
          permissionPath: "/users",
          children: [
            {
              label: "Users List",
              path: "/users",
              iconBlack: "/assets/images/icons/profile-2user-black.svg",
              iconBlue: "/assets/images/icons/profile-2user-blue-fill.svg",
            },
            {
              label: "Assign Role",
              path: "/users/assign-roles",
              iconBlack: "/assets/images/icons/profile-tick-black.svg",
              iconBlue: "/assets/images/icons/profile-tick-blue.svg",
            },
          ],
        }, 
        {
          label: "Settings",
          path: "/settings",
          iconBlack: "/assets/images/icons/setting-black.svg",
          iconBlue: "/assets/images/icons/setting-black.svg",
          roles: ["manager"], // Manager always has access
          permissionPath: "/settings", // PIC can access if they have this permission
        },
      ],
    },
  ];

  // Sync sidebar state with DOM (mobile/tablet) - FORCE UPDATE with multiple attempts
  useEffect(() => {
    if (!isMobile) return;
    
      const updateSidebar = () => {
      const sidebar = sidebarRef.current || document.getElementById('app-sidebar');
      if (!sidebar) {
        console.log('Sidebar element not found in useEffect, retrying...');
        return false;
      }

      // Use ref as source of truth
      const shouldBeOpen = isMobileMenuOpenRef.current;
      console.log('Syncing sidebar state in useEffect:', { 
        refState: shouldBeOpen, 
        reactState: isMobileMenuOpen, 
        isMobile 
      });

      if (shouldBeOpen) {
        console.log('Opening sidebar in useEffect');
        sidebar.style.cssText = `
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          height: 100vh !important;
          width: 280px !important;
          z-index: 99999 !important;
          transform: translateX(0) !important;
          display: flex !important;
          flex-direction: column !important;
          visibility: visible !important;
          background-color: white !important;
          box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15) !important;
          transition: transform 350ms cubic-bezier(0.25, 0.46, 0.45, 0.94) !important;
          will-change: transform !important;
          backface-visibility: hidden !important;
          -webkit-backface-visibility: hidden !important;
        `;
        // Also update class and attribute
        sidebar.classList.remove('-translate-x-full');
        sidebar.classList.add('translate-x-0');
        sidebar.setAttribute('data-mobile-open', 'true');
      } else {
        console.log('Closing sidebar in useEffect');
        sidebar.style.cssText = `
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          height: 100vh !important;
          width: 280px !important;
          z-index: -1 !important;
          transform: translateX(-100%) !important;
          display: flex !important;
          flex-direction: column !important;
          visibility: hidden !important;
          background-color: white !important;
          transition: transform 350ms cubic-bezier(0.25, 0.46, 0.45, 0.94) !important;
          will-change: transform !important;
          backface-visibility: hidden !important;
          -webkit-backface-visibility: hidden !important;
        `;
        // Also update class and attribute
        sidebar.classList.remove('translate-x-0');
        sidebar.classList.add('-translate-x-full');
        sidebar.setAttribute('data-mobile-open', 'false');
      }
      return true;
    };

    // Try multiple times to ensure sidebar is rendered (portal might take time)
    const tryUpdate = () => {
      updateSidebar();
    };

    // Use requestAnimationFrame for smooth update
    requestAnimationFrame(() => {
      tryUpdate();
      // Also try again multiple times to catch portal rendering
      setTimeout(tryUpdate, 10);
      setTimeout(tryUpdate, 50);
      setTimeout(tryUpdate, 100);
      setTimeout(tryUpdate, 200);
    });
  }, [isMobile, isMobileMenuOpen]);

  // Detect mobile/tablet and initialize
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      
      const mainContainer = document.getElementById('main-container');
      const sidebar = document.getElementById('app-sidebar');
      
      if (mobile) {
        // Mobile: only reset on initial load, not on resize
        // Check if this is initial load (sidebar state not set yet)
        const isInitialLoad = !sidebar || sidebar.getAttribute('data-mobile-open') === null;
        
        if (isInitialLoad) {
          setIsMobileMenuOpen(false);
          isMobileMenuOpenRef.current = false;
        }
        
        setIsCollapsed(false); // Not used in mobile
        document.documentElement.style.setProperty('--sidebar-width', '0px');
        if (mainContainer) {
          mainContainer.style.marginLeft = '0px';
          mainContainer.style.width = '100%';
        }
        // Only force sidebar to be hidden if it's not open (use ref as source of truth)
        if (sidebar && !isMobileMenuOpenRef.current) {
          console.log('Setting sidebar to hidden on mobile init');
          sidebar.style.setProperty('transform', 'translateX(-100%)', 'important');
          sidebar.style.setProperty('z-index', '-1', 'important');
          sidebar.style.setProperty('visibility', 'hidden', 'important');
          sidebar.style.setProperty('display', 'flex', 'important');
          sidebar.setAttribute('data-mobile-open', 'false');
        }
      } else {
        // Desktop: ensure state is loaded from localStorage (for resize from mobile to desktop)
        // But only update if state hasn't been initialized yet or if switching from mobile
        const saved = localStorage.getItem('sidebar-collapsed');
        const collapsed = saved === 'true';
        // Only update state if it's different (to prevent unnecessary re-renders)
        if (isCollapsed !== collapsed) {
          setIsCollapsed(collapsed);
        }
        const width = collapsed ? '70px' : '280px';
        document.documentElement.style.setProperty('--sidebar-width', width);
        if (mainContainer) {
          mainContainer.style.marginLeft = width;
          mainContainer.style.width = `calc(100% - ${width})`;
        }
        if (sidebar) {
          // CRITICAL: Use requestAnimationFrame to ensure DOM is ready
          requestAnimationFrame(() => {
            // Remove all mobile-related classes FIRST
            sidebar.classList.remove(
              'sidebar-closed-mobile', 
              'sidebar-open-mobile', 
              '-translate-x-full'
            );
            // Add translate-x-0 to ensure it's visible
            sidebar.classList.add('translate-x-0');
            sidebar.removeAttribute('data-mobile-open');
            
            // Set desktop styles with !important to override everything
            sidebar.style.setProperty('width', width, 'important');
            sidebar.style.setProperty('display', 'flex', 'important');
            sidebar.style.setProperty('flex-direction', 'column', 'important');
            sidebar.style.setProperty('visibility', 'visible', 'important');
            sidebar.style.setProperty('position', 'fixed', 'important');
            sidebar.style.setProperty('top', '0', 'important');
            sidebar.style.setProperty('left', '0', 'important');
            sidebar.style.setProperty('height', '100vh', 'important');
            sidebar.style.setProperty('z-index', '10', 'important');
            sidebar.style.setProperty('transform', 'translateX(0)', 'important');
            sidebar.style.setProperty('background-color', 'white', 'important');
            sidebar.style.setProperty('transition', 'all 300ms', 'important');
            sidebar.style.removeProperty('box-shadow');
            
            // Only use CSS class for overflow control
            document.body.classList.remove('sidebar-open');
          });
        }
        // Reset mobile menu state
        setIsMobileMenuOpen(false);
        isMobileMenuOpenRef.current = false;
      }
    };

    checkMobile();
    
    // Use debounce to avoid too many calls
    let resizeTimer: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        checkMobile();
      }, 100);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
    };
  }, []);

  // CRITICAL: Ensure sidebar is visible when switching from mobile to desktop
  useEffect(() => {
    if (!isMobile) {
      const ensureSidebarVisible = () => {
        const sidebar = document.getElementById('app-sidebar');
        if (sidebar) {
          // Force sidebar to be visible on desktop
          const width = isCollapsed ? '70px' : '280px';
          
          // CRITICAL: Use requestAnimationFrame to ensure DOM is ready
          requestAnimationFrame(() => {
            // Set desktop styles with !important to override everything
            sidebar.style.setProperty('width', width, 'important');
            sidebar.style.setProperty('display', 'flex', 'important');
            sidebar.style.setProperty('flex-direction', 'column', 'important');
            sidebar.style.setProperty('visibility', 'visible', 'important');
            sidebar.style.setProperty('position', 'fixed', 'important');
            sidebar.style.setProperty('z-index', '10', 'important');
            sidebar.style.setProperty('transform', 'translateX(0)', 'important');
            sidebar.style.setProperty('left', '0', 'important');
            sidebar.style.setProperty('top', '0', 'important');
            sidebar.style.setProperty('height', '100vh', 'important');
            sidebar.style.setProperty('background-color', 'white', 'important');
            sidebar.style.setProperty('transition', 'all 300ms', 'important');
            
            // Remove mobile classes that hide sidebar
            sidebar.classList.remove('-translate-x-full');
            sidebar.classList.add('translate-x-0');
            sidebar.removeAttribute('data-mobile-open');
          });
        }
      };
      
      // Run immediately and with multiple delays to ensure it works
      ensureSidebarVisible();
      const timer1 = setTimeout(ensureSidebarVisible, 0);
      const timer2 = setTimeout(ensureSidebarVisible, 10);
      const timer3 = setTimeout(ensureSidebarVisible, 50);
      const timer4 = setTimeout(ensureSidebarVisible, 100);
      const timer5 = setTimeout(ensureSidebarVisible, 200);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        clearTimeout(timer4);
        clearTimeout(timer5);
      };
    }
  }, [isMobile, isCollapsed]);

  // REMOVED: All scroll-related useEffect and useLayoutEffect - scroll bar has been removed

  // Auto-open accordion if any child item is active
  useEffect(() => {
    setOpenAccordions((prev) => {
      // CRITICAL: Load from localStorage first to preserve previously opened accordions
      const savedAccordions = typeof window !== 'undefined' 
        ? JSON.parse(localStorage.getItem('sidebar-open-accordions') || '[]')
        : [];
      
      // Merge saved accordions with current state
      const mergedAccordions = [...new Set([...savedAccordions, ...prev])];
      
      const accordionsToOpen: string[] = [];
      
      sidebarMenus.forEach((section) => {
        section.items.forEach((item: any) => {
          if (item.children) {
            const hasActiveChild = item.children.some(
              (child: any) => location.pathname === child.path
            );
            if (hasActiveChild && !mergedAccordions.includes(item.label)) {
              accordionsToOpen.push(item.label);
            }
          }
        });
      });

      // Return merged accordions + new accordions to open
      if (accordionsToOpen.length > 0) {
        return [...new Set([...mergedAccordions, ...accordionsToOpen])];
      }
      return mergedAccordions; // CRITICAL: Return merged accordions to preserve state
    });
  }, [location.pathname, isMobile]);

  // REMOVED: All aggressive scroll protection mechanisms
  // These were causing scrollbar to jump unexpectedly:
  // - Route change handler with aggressive restore
  // - CSS transform lock and monitoring
  // - Infinite monitoring loop
  // - useLayoutEffect immediate restore
  // - Ultra aggressive restore with many timeouts
  // - Restore after accordion opens with multiple delays
  // - Save scroll before accordion opens (causing conflicts)
  // Only simple save/restore mechanisms remain (lines 483-561)

  // Update CSS variable when collapsed state changes (desktop only)
  // CRITICAL: This effect also syncs state with localStorage to ensure persistence
  useEffect(() => {
    if (!isMobile) {
      // Always save to localStorage when state changes
      localStorage.setItem('sidebar-collapsed', isCollapsed.toString());
      
      document.documentElement.style.setProperty('--sidebar-width', isCollapsed ? '70px' : '280px');
      
      // Update main container
      const mainContainer = document.getElementById('main-container');
      if (mainContainer) {
        mainContainer.style.marginLeft = isCollapsed ? '70px' : '280px';
        mainContainer.style.width = isCollapsed ? 'calc(100% - 70px)' : 'calc(100% - 280px)';
      }
      
      // Update sidebar width directly
      const sidebar = document.getElementById('app-sidebar');
      if (sidebar) {
        sidebar.style.setProperty('width', isCollapsed ? '70px' : '280px', 'important');
      }
    }
  }, [isCollapsed, isMobile]);

  // Close mobile menu on route change
  useEffect(() => {
    if (isMobile && isMobileMenuOpenRef.current) {
      isMobileMenuOpenRef.current = false;
      setIsMobileMenuOpen(false);
      document.body.classList.remove('sidebar-open');
      
      // Force close sidebar
      const sidebar = sidebarRef.current || document.getElementById('app-sidebar');
      if (sidebar) {
        sidebar.style.cssText = `
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          height: 100vh !important;
          width: 280px !important;
          z-index: -1 !important;
          transform: translateX(-100%) !important;
          display: flex !important;
          flex-direction: column !important;
          visibility: hidden !important;
          background-color: white !important;
          transition: transform 350ms cubic-bezier(0.25, 0.46, 0.45, 0.94) !important;
          will-change: transform !important;
          backface-visibility: hidden !important;
          -webkit-backface-visibility: hidden !important;
        `;
        sidebar.classList.remove('translate-x-0');
        sidebar.classList.add('-translate-x-full');
        sidebar.setAttribute('data-mobile-open', 'false');
      }
    }
  }, [location.pathname, isMobile]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    if (!isMobile || !isMobileMenuOpenRef.current) return;

    const handleClickOutside = (e: Event) => {
      const target = e.target as HTMLElement;
      const sidebar = sidebarRef.current || document.getElementById('app-sidebar');
      const hamburger = document.getElementById('hamburger-button');
      
      if (sidebar && !sidebar.contains(target) && hamburger && !hamburger.contains(target)) {
        isMobileMenuOpenRef.current = false;
        setIsMobileMenuOpen(false);
        document.body.classList.remove('sidebar-open');
        
        // Force close sidebar
        if (sidebar) {
          sidebar.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            height: 100vh !important;
            width: 280px !important;
            z-index: -1 !important;
            transform: translateX(-100%) !important;
            display: flex !important;
            flex-direction: column !important;
            visibility: hidden !important;
            background-color: white !important;
            transition: transform 350ms cubic-bezier(0.25, 0.46, 0.45, 0.94) !important;
            will-change: transform !important;
            backface-visibility: hidden !important;
            -webkit-backface-visibility: hidden !important;
          `;
          sidebar.classList.remove('translate-x-0');
          sidebar.classList.add('-translate-x-full');
          sidebar.setAttribute('data-mobile-open', 'false');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isMobile]);

  // REMOVED: Duplicate accordion auto-open useEffect with scroll lock - already handled above
  // REMOVED: Duplicate useEffect for CSS variable update (line 619-641) - already handled at line 511-531

  // Close mobile menu on route change
  useEffect(() => {
    if (isMobile && isMobileMenuOpenRef.current) {
      isMobileMenuOpenRef.current = false;
      setIsMobileMenuOpen(false);
      document.body.classList.remove('sidebar-open');
      
      // Force close sidebar
      const sidebar = sidebarRef.current || document.getElementById('app-sidebar');
      if (sidebar) {
        sidebar.style.cssText = `
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          height: 100vh !important;
          width: 280px !important;
          z-index: -1 !important;
          transform: translateX(-100%) !important;
          display: flex !important;
          flex-direction: column !important;
          visibility: hidden !important;
          background-color: white !important;
          transition: transform 350ms cubic-bezier(0.25, 0.46, 0.45, 0.94) !important;
          will-change: transform !important;
          backface-visibility: hidden !important;
          -webkit-backface-visibility: hidden !important;
        `;
        sidebar.classList.remove('translate-x-0');
        sidebar.classList.add('-translate-x-full');
        sidebar.setAttribute('data-mobile-open', 'false');
      }
    }
  }, [location.pathname, isMobile]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    if (!isMobile || !isMobileMenuOpenRef.current) return;

    const handleClickOutside = (e: Event) => {
      const target = e.target as HTMLElement;
      const sidebar = sidebarRef.current || document.getElementById('app-sidebar');
      const hamburger = document.getElementById('hamburger-button');
      
      if (sidebar && !sidebar.contains(target) && hamburger && !hamburger.contains(target)) {
        isMobileMenuOpenRef.current = false;
        setIsMobileMenuOpen(false);
        document.body.classList.remove('sidebar-open');
        
        // Force close sidebar
        if (sidebar) {
          sidebar.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            height: 100vh !important;
            width: 280px !important;
            z-index: -1 !important;
            transform: translateX(-100%) !important;
            display: flex !important;
            flex-direction: column !important;
            visibility: hidden !important;
            background-color: white !important;
            transition: transform 350ms cubic-bezier(0.25, 0.46, 0.45, 0.94) !important;
            will-change: transform !important;
            backface-visibility: hidden !important;
            -webkit-backface-visibility: hidden !important;
          `;
          sidebar.classList.remove('translate-x-0');
          sidebar.classList.add('-translate-x-full');
          sidebar.setAttribute('data-mobile-open', 'false');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isMobile]);

  // REMOVED: Duplicate accordion auto-open useEffect with scroll lock - already handled above

  // REMOVED: Restore scroll position after accordion opens with many delays (lines 918-987)
  // This was causing multiple scroll jumps when accordions auto-open

  const toggleMobileMenu = () => {
    console.log('=== TOGGLE MOBILE MENU ===');
    const currentState = isMobileMenuOpenRef.current;
    const newState = !currentState;
    
    console.log('Current ref state:', currentState);
    console.log('New state:', newState);
    console.log('isMobile:', isMobile);
    
    // Update ref immediately (this is the source of truth)
    isMobileMenuOpenRef.current = newState;
    
    // Update state for React (for re-renders)
    setIsMobileMenuOpen(newState);
    
    // Update body - ONLY use CSS class, no inline style
    // CSS handles overflow via .sidebar-open class
    if (newState) {
      document.body.classList.add('sidebar-open');
    } else {
      document.body.classList.remove('sidebar-open');
    }
    
    // Force update sidebar using ref or getElementById
    const updateSidebar = () => {
      const sidebar = sidebarRef.current || document.getElementById('app-sidebar');
      if (sidebar) {
        console.log('Sidebar found, updating to:', newState);
        if (newState) {
          // OPEN SIDEBAR
          console.log('OPENING sidebar');
          sidebar.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            height: 100vh !important;
            width: 280px !important;
            z-index: 99999 !important;
            transform: translateX(0) !important;
            display: flex !important;
            flex-direction: column !important;
            visibility: visible !important;
            background-color: white !important;
            box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15) !important;
            transition: transform 350ms cubic-bezier(0.25, 0.46, 0.45, 0.94) !important;
            will-change: transform !important;
            backface-visibility: hidden !important;
            -webkit-backface-visibility: hidden !important;
          `;
          sidebar.classList.remove('-translate-x-full');
          sidebar.classList.add('translate-x-0');
          sidebar.setAttribute('data-mobile-open', 'true');
        } else {
          // CLOSE SIDEBAR
          console.log('CLOSING sidebar');
          sidebar.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            height: 100vh !important;
            width: 280px !important;
            z-index: -1 !important;
            transform: translateX(-100%) !important;
            display: flex !important;
            flex-direction: column !important;
            visibility: hidden !important;
            background-color: white !important;
            transition: transform 350ms cubic-bezier(0.25, 0.46, 0.45, 0.94) !important;
            will-change: transform !important;
            backface-visibility: hidden !important;
            -webkit-backface-visibility: hidden !important;
          `;
          sidebar.classList.remove('translate-x-0');
          sidebar.classList.add('-translate-x-full');
          sidebar.setAttribute('data-mobile-open', 'false');
        }
        return true;
      } else {
        console.error('Sidebar NOT FOUND!');
        return false;
      }
    };
    
    // Try multiple times to ensure it works
    updateSidebar();
    requestAnimationFrame(() => {
      updateSidebar();
      setTimeout(() => updateSidebar(), 10);
      setTimeout(() => updateSidebar(), 50);
      setTimeout(() => updateSidebar(), 100);
      setTimeout(() => updateSidebar(), 200);
    });
  };

  const toggleSidebar = () => {
    if (isMobile) {
      toggleMobileMenu();
    } else {
      setIsCollapsed(prev => !prev);
    }
  };

  // Sidebar Content Component
  const SidebarContent = () => (
    <aside
      ref={sidebarRef}
      id="app-sidebar"
      className={`
        ${isMobile 
          ? `fixed top-0 left-0 h-screen w-[280px] shadow-xl transition-transform duration-[350ms] ease-out ${
              isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
            }`
          : `fixed top-0 left-0 h-screen transition-all duration-300 ${
              isCollapsed ? 'w-[70px]' : 'w-[280px]'
            } z-10 translate-x-0`
        }
        flex flex-col bg-white
      `}
      data-mobile-open={isMobile ? (isMobileMenuOpen ? 'true' : 'false') : undefined}
      style={isMobile ? {
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100dvh', // Use dvh to handle mobile address bars
        width: '280px',
        zIndex: isMobileMenuOpen ? 99999 : -1,
        transform: isMobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        willChange: 'transform',
        display: 'flex',
        flexDirection: 'column',
        visibility: isMobileMenuOpen ? 'visible' : 'hidden',
        backgroundColor: 'white',
        boxShadow: isMobileMenuOpen ? '2px 0 8px rgba(0, 0, 0, 0.15)' : 'none',
        maxHeight: '-webkit-fill-available', // Fallback for iOS Safari
      } : {
        // Desktop: CRITICAL - ensure sidebar is always visible
        width: isCollapsed ? '70px' : '280px',
        display: 'flex',
        visibility: 'visible',
        position: 'fixed',
        zIndex: 10,
        transform: 'translateX(0)',
        left: 0,
        top: 0,
        height: '100vh',
        backgroundColor: 'white',
      }}
    >
        <div className={`flex flex-col ${isMobile ? 'w-full h-full' : 'w-full h-full'} ${isMobile ? 'pt-4' : 'pt-4'} ${isMobile ? 'px-4' : (isCollapsed ? 'px-2' : 'px-6')}`}>
          {/* Sidebar Header with Logo and Toggle */}
          <div className={`
            flex items-center ${isMobile ? 'justify-between mb-3 pb-3 border-b border-gray-200 shrink-0' : (isCollapsed ? 'justify-center mb-5' : 'mb-3')}
          `}>
            {isMobile ? (
              <>
                <img
                  src="/assets/images/logos/vendnage3-logo.png"
                  className="h-9 w-auto"
                  alt="VENDNAGE logo"
                />
                <button
                  onClick={toggleMobileMenu}
                  className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
                  aria-label="Close sidebar"
                >
                  <svg
                    className="w-5 h-5 text-gray-700"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </>
            ) : (
              <>
                {!isCollapsed && (
                  <img
                    src="/assets/images/logos/vendnage3-logo.png"
                    className="h-12 w-fit"
                    alt="VENDNAGE logo"
                  />
                )}
                <button
                  onClick={toggleSidebar}
                  className={`flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition-colors ${isCollapsed && !isMobile ? 'mx-auto mt-4' : isCollapsed ? 'mx-auto mt-2' : 'ml-auto'}`}
                  aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  <svg
                    className={`w-6 h-6 text-gray-600 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                    />
                  </svg>
                </button>
              </>
            )}
          </div>
        <div 
          key="sidebar-content-container"
          className={`flex flex-col ${isMobile ? 'overflow-y-auto pb-24 overscroll-contain' : 'overflow-hidden'} ${isMobile ? 'gap-[22px] flex-1' : (isCollapsed ? 'gap-3 flex-1' : 'gap-[22px] flex-1')}`}
          style={isMobile ? { WebkitOverflowScrolling: 'touch' } : {}}
        >
          {sidebarMenus.map((section) => {
            const visibleItems = section.items.filter((item: any) => {
              // ✅ Check if user is Manager - Manager always has access to ALL menus
              const isManagerUser = userRoles.some(ur => 
                getRoleName(ur).toLowerCase() === 'manager' || 
                getRoleName(ur).toLowerCase() === 'admin'
              );
              
              // Manager bypass: always show all menu items
              if (isManagerUser) {
                return true;
              }
              
              // For non-manager users (PIC), check permissions
              // If no permissionPath, default to showing (backward compatibility)
              if (!item.permissionPath) {
                return true;
              }
              
              // Check if user has permission for this menu item
              const hasPermission = userPermissions.includes(item.permissionPath);
              return hasPermission;
            });

            if (visibleItems.length === 0) {
              return null;
            }

            return (
              <nav key={section.section} className={`flex flex-col gap-4 ${isCollapsed && !isMobile ? 'items-center' : ''} ${section.section === 'Account Settings' && (!isCollapsed || isMobile) ? 'mt-4' : ''}`}>
                {(!isCollapsed || isMobile) && (
                  <p className={`font-medium text-monday-gray text-xs uppercase tracking-wider ${section.section === 'Account Settings' ? 'pt-2 mb-4' : 'mb-3'}`}>
                  {section.section}
                </p>
                )}
                <ul className={`flex flex-col ${isCollapsed && !isMobile ? 'gap-4' : 'gap-3'}`}>
                  {visibleItems.map((item) => {
                    // Check if current path matches item path or is a child route (e.g., /brands/edit/1)
                    let isActive = location.pathname === item.path || 
                      (location.pathname.startsWith(item.path + "/") && item.path !== "/");
                    
                    // Special case for Warehouses: only check warehouse routes (warehouse-products disabled)
                    if (item.path === "/warehouses") {
                      isActive = isActive || 
                        (location.pathname.startsWith("/warehouses/") && !location.pathname.startsWith("/warehouse-products/"));
                    }
                    
                    // Special case for Merchants: also check merchant-products routes
                    if (item.path === "/merchants") {
                      isActive = isActive || 
                        location.pathname.startsWith("/merchant-products/");
                    }
                    
                    // Special case for Stock Management routes
                    if (item.path === "/stock-management/stock-in") {
                      isActive = isActive || 
                        location.pathname.startsWith("/stock-management/stock-in");
                    }
                    if (item.path === "/stock-management/stock-retur") {
                      isActive = isActive || 
                        location.pathname.startsWith("/stock-management/stock-retur");
                    }
                    if (item.path === "/stock-management/stock-transfer") {
                      isActive = isActive || 
                        location.pathname.startsWith("/stock-management/stock-transfer");
                    }
                    if (item.path === "/stock-management/stock-balance") {
                      isActive = isActive || 
                        location.pathname.startsWith("/stock-management/stock-balance");
                    }
                    if (item.path === "/stock-management/expiry-alert") {
                      isActive = isActive || 
                        location.pathname.startsWith("/stock-management/expiry-alert");
                    }
                    
                    const isAccordion = !!(item as any).children;

                    if (isAccordion) {
                      const isOpen = openAccordions.includes(item.label);
                      
                      // Untuk "Manage Users", ketika collapsed, tampilkan child items sebagai item terpisah
                      if (item.label === "Manage Users" && isCollapsed && !isMobile && (item as any).children) {
                        // Render child items sebagai item individual ketika collapsed
                        return (
                          <>
                            {(item as any).children.map((child: any) => {
                              // Logika active state yang lebih spesifik untuk menghindari konflik
                              let isChildActive = location.pathname === child.path;
                              
                              // Untuk "Users List" (/users), hanya active jika exact match atau sub-routes yang bukan /users/assign-roles
                              if (child.path === "/users") {
                                isChildActive = location.pathname === "/users" || 
                                  (location.pathname.startsWith("/users/") && !location.pathname.startsWith("/users/assign-roles"));
                              }
                              // Untuk "Assign Role" (/users/assign-roles), hanya active jika exact match atau sub-routes
                              else if (child.path === "/users/assign-roles") {
                                isChildActive = location.pathname === "/users/assign-roles" || 
                                  location.pathname.startsWith("/users/assign-roles/");
                              }
                              // Untuk child items lainnya, gunakan logika default
                              else {
                                isChildActive = location.pathname === child.path || 
                                  location.pathname.startsWith(child.path + '/');
                              }
                              
                              return (
                                <li key={child.label} className={`group ${isChildActive ? "active" : ""}`}>
                                  <Link
                                    to={child.path}
                                    className={`flex items-center w-full min-h-11 gap-3 rounded-lg overflow-hidden ${isCollapsed && !isMobile ? 'py-3.5' : 'py-3'} transition-300 ${
                                      isCollapsed && !isMobile ? 'justify-center pl-0 pr-0 gap-0' : 'pl-5'
                                    } hover:bg-monday-gray-background ${isChildActive ? 'bg-monday-blue/10' : ''}`}
                                  >
                                    <div className="relative flex size-6 shrink-0">
                                      <img
                                        src={child.iconBlack}
                                        className={`size-6 absolute ${
                                          isChildActive ? "opacity-0" : "opacity-100"
                                        } transition-300`}
                                        alt="icon"
                                      />
                                      <img
                                        src={child.iconBlue}
                                        className={`size-6 absolute ${
                                          isChildActive ? "opacity-100" : "opacity-0"
                                        } transition-300`}
                                        alt="icon"
                                      />
                                    </div>
                                    {(!isCollapsed || isMobile) && (
                                      <>
                                        <p className={`text-sm font-medium transition-300 w-full ${
                                          isChildActive ? "text-monday-blue" : ""
                                        }`}>
                                          {child.label}
                                        </p>
                                        <div className={`w-2 h-8 shrink-0 rounded-full bg-monday-blue ${
                                          isChildActive ? "flex" : "hidden"
                                        } transition-300`}></div>
                                      </>
                                    )}
                                  </Link>
                                </li>
                              );
                            })}
                          </>
                        );
                      }
                      
                      // Render accordion normal untuk expanded atau mobile
                      return (
                        <li key={item.label} className="group flex flex-col">
                          <button
                            onClick={() => toggleAccordion(item.label)}
                            className={`flex items-center w-full min-h-11 rounded-lg overflow-hidden ${isCollapsed && !isMobile ? 'py-3.5' : 'py-3'} transition-300 ${
                              isCollapsed && !isMobile ? 'justify-center pl-0 pr-0 gap-0' : 'pl-5 gap-3'
                            }`}
                          >
                            <div className="relative flex size-6 shrink-0">
                              <img
                                src={item.iconBlack}
                                className={`size-6 absolute ${
                                  isOpen ? "opacity-0" : "opacity-100"
                                } transition-300`}
                                alt="icon"
                              />
                              <img
                                src={item.iconBlue}
                                className={`size-6 absolute ${
                                  isOpen ? "opacity-100" : "opacity-0"
                                } transition-300`}
                                alt="icon"
                              />
                            </div>
                            {(!isCollapsed || isMobile) && (
                              <>
                                <p className="text-sm font-medium w-full text-left">
                              {item.label}
                            </p>
                            <img
                              src="/assets/images/icons/arrow-circle-up.svg"
                                  className={`size-5 transition-300 ${
                                isOpen ? "rotate-180" : ""
                              }`}
                              alt="icon"
                            />
                              </>
                            )}
                          </button>
                          {isOpen && (!isCollapsed || isMobile) && (
                            <div className="flex mt-2" style={{ marginTop: '8px' }}>
                              <div className="flex shrink-0 justify-end items-start" style={{ width: '52px', paddingTop: '10px' }}>
                                <img
                                  src="/assets/images/icons/accordion-branch.svg"
                                  style={{ width: '24px', height: '24px' }}
                                  alt="icon"
                                />
                              </div>
                              <ul className="flex flex-col w-full" style={{ gap: !isMobile && !isCollapsed ? '2px' : '10px' }}>
                                {(item as any).children.map((child: any) => {
                                  const isChildActive =
                                    location.pathname === child.path;
                                  return (
                                    <li
                                      key={child.label}
                                      className={`group ${
                                        isChildActive ? "active" : ""
                                      }`}
                                    >
                                      <Link
                                        to={child.path}
                                        onClick={() => {
                                          // Handle mobile menu close
                                          if (isMobile) {
                                            isMobileMenuOpenRef.current = false;
                                            setIsMobileMenuOpen(false);
                                            document.body.classList.remove('sidebar-open');
                                            
                                            // Force close sidebar
                                            const sidebar = sidebarRef.current || document.getElementById('app-sidebar');
                                            if (sidebar) {
                                              sidebar.style.cssText = `
                                                position: fixed !important;
                                                top: 0 !important;
                                                left: 0 !important;
                                                height: 100vh !important;
                                                width: 280px !important;
                                                z-index: -1 !important;
                                                transform: translateX(-100%) !important;
                                                display: flex !important;
                                                flex-direction: column !important;
                                                visibility: hidden !important;
                                                background-color: white !important;
                                                transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1) !important;
                                              `;
                                              sidebar.classList.remove('translate-x-0');
                                              sidebar.classList.add('-translate-x-full');
                                              sidebar.setAttribute('data-mobile-open', 'false');
                                            }
                                          }
                                        }}
                                        className="flex items-center w-full rounded-lg overflow-hidden transition-300"
                                        style={{
                                          minHeight: !isMobile && !isCollapsed ? '36px' : '44px',
                                          gap: '12px',
                                          paddingTop: !isMobile && !isCollapsed ? '6px' : '10px',
                                          paddingBottom: !isMobile && !isCollapsed ? '6px' : '10px',
                                          paddingLeft: '20px',
                                          backgroundColor: isChildActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent'
                                        }}
                                        onMouseEnter={(e) => {
                                          if (!isChildActive) {
                                            e.currentTarget.style.backgroundColor = '#F3F5F9';
                                          }
                                        }}
                                        onMouseLeave={(e) => {
                                          if (!isChildActive) {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                          }
                                        }}
                                      >
                                        <div className="relative flex shrink-0" style={{ width: '20px', height: '20px' }}>
                                          <img
                                            src={child.iconBlack}
                                            className={`absolute transition-300`}
                                            style={{
                                              width: '20px',
                                              height: '20px',
                                              opacity: isChildActive ? 0 : 1
                                            }}
                                            alt="icon"
                                          />
                                          <img
                                            src={child.iconBlue}
                                            className={`absolute transition-300`}
                                            style={{
                                              width: '20px',
                                              height: '20px',
                                              opacity: isChildActive ? 1 : 0
                                            }}
                                            alt="icon"
                                          />
                                        </div>
                                        <p
                                          className="font-medium transition-300 w-full"
                                          style={{
                                            fontSize: '11px',
                                            color: isChildActive ? '#3B82F6' : 'inherit'
                                          }}
                                        >
                                          {child.label}
                                        </p>
                                        <div
                                          className="shrink-0 rounded-full bg-monday-blue transition-300"
                                          style={{
                                            width: '8px',
                                            height: '36px',
                                            display: isChildActive ? 'flex' : 'none'
                                          }}
                                        ></div>
                                      </Link>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          )}
                        </li>
                      );
                    }

                    return (
                      <li
                        key={item.label}
                        className={`group ${isActive ? "active" : ""}`}
                      >
                        <Link
                          to={(item as any).path || '#'}
                          onClick={() => {
                            // Handle mobile menu close
                            if (isMobile) {
                              isMobileMenuOpenRef.current = false;
                              setIsMobileMenuOpen(false);
                              document.body.classList.remove('sidebar-open');
                              
                              // Force close sidebar
                              const sidebar = sidebarRef.current || document.getElementById('app-sidebar');
                              if (sidebar) {
                                sidebar.style.cssText = `
                                  position: fixed !important;
                                  top: 0 !important;
                                  left: 0 !important;
                                  height: 100vh !important;
                                  width: 280px !important;
                                  z-index: -1 !important;
                                  transform: translateX(-100%) !important;
                                  display: flex !important;
                                  flex-direction: column !important;
                                  visibility: hidden !important;
                                  background-color: white !important;
                                  transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1) !important;
                                `;
                                sidebar.classList.remove('translate-x-0');
                                sidebar.classList.add('-translate-x-full');
                                sidebar.setAttribute('data-mobile-open', 'false');
                              }
                            }
                          }}
                          className={`flex items-center w-full min-h-11 gap-3 rounded-lg overflow-hidden ${isCollapsed && !isMobile ? 'py-3.5' : 'py-3'} transition-300 ${
                            isCollapsed && !isMobile ? 'justify-center pl-0 pr-0' : 'pl-5'
                          } ${
                            isActive
                              ? "bg-monday-blue/10"
                              : "hover:bg-monday-gray-background"
                          }`}
                        >
                          <div className="relative flex size-6 shrink-0">
                            <img
                              src={item.iconBlack}
                              className={`size-6 absolute ${
                                isActive ? "opacity-0" : "opacity-100"
                              } transition-300`}
                              alt="icon"
                            />
                            <img
                              src={item.iconBlue}
                              className={`size-6 absolute ${
                                isActive ? "opacity-100" : "opacity-0"
                              } transition-300`}
                              style={item.label === "Stock In" && item.iconBlack === item.iconBlue && isActive ? {
                                filter: 'brightness(0) saturate(100%) invert(27%) sepia(95%) saturate(7500%) hue-rotate(214deg) brightness(104%) contrast(101%)'
                              } : {}}
                              alt="icon"
                            />
                          </div>
                          {(!isCollapsed || isMobile) && (
                            <>
                          <p
                                className={`text-sm font-medium transition-300 w-full ${
                              isActive ? "text-monday-blue" : ""
                            }`}
                          >
                            {item.label}
                          </p>
                          <div
                                className={`w-2 h-8 shrink-0 rounded-full bg-monday-blue hidden ${
                              isActive ? "flex" : ""
                            } transition-300`}
                          ></div>
                            </>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            );
          })}
          
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile Header - Always visible */}
      {isMobile && (
        <header 
          className="fixed top-0 left-0 right-0 h-16 bg-monday-blue flex items-center justify-between px-4 shadow-md"
          style={{ 
            zIndex: 10000,
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 1rem',
            backgroundColor: '#0073EA',
            opacity: isMobileMenuOpen ? 0 : 1,
            pointerEvents: isMobileMenuOpen ? 'none' : 'auto',
          }}
        >
          <img
            src="/assets/images/logos/vendnage3-logo.png"
            className="h-7 w-auto"
            alt="VENDNAGE logo"
          />
          <button
            id="hamburger-button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Hamburger button clicked');
              toggleMobileMenu();
            }}
            className="flex items-center justify-center w-11 h-11 text-white hover:bg-white/10 rounded-lg transition-colors"
            style={{ 
              zIndex: 10001, 
              position: 'relative',
              display: 'flex',
              visibility: 'visible',
              opacity: 1,
              pointerEvents: 'auto',
              cursor: 'pointer'
            }}
            aria-label="Toggle sidebar"
          >
            <svg
              className="w-7 h-7"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
              style={{
                display: 'block',
                visibility: 'visible',
                opacity: 1,
                color: 'white'
              }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </header>
      )}

      {/* Mobile Backdrop - Portal to body */}
      {isMobile && isMobileMenuOpen && createPortal(
        <div
          className="fixed inset-0 bg-black/50 transition-opacity duration-300"
          onClick={toggleMobileMenu}
          style={{ 
            zIndex: 99998,
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          }}
        />,
        document.body
      )}

      {/* Sidebar - Use Portal for mobile/tablet, normal render for desktop */}
      {isMobile ? (
        createPortal(
          <SidebarContent />,
          document.body
        )
      ) : (
        <SidebarContent />
      )}
    </>
  );
};

export default Sidebar;

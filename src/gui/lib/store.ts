import { create } from 'zustand';

interface AppState {
  sidebarCollapsed: boolean;
  activeInspectionId: string | null;
  currentUser: {
    name: string;
    email?: string;
    role?: string;
  };
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActiveInspectionId: (inspectionId: string | null) => void;
  setCurrentUser: (user: { name: string; email?: string; role?: string }) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  activeInspectionId: null,
  currentUser: {
    name: "FDA User",
    email: "",
    role: "",
  },
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setActiveInspectionId: (inspectionId) => set({ activeInspectionId: inspectionId }),
  setCurrentUser: (user) => set({ currentUser: user }),
}));

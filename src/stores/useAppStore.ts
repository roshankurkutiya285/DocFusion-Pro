import { create } from 'zustand'
import type {
  RibbonTabId,
  SidebarTabId,
  ModalType,
  ToastMessage,
  RecentDocument,
} from '@/types'

interface AppState {
  activeRibbonTab: RibbonTabId
  isSidebarOpen: boolean
  activeSidebarTab: SidebarTabId
  isOffline: boolean

  // Modals
  activeModal: ModalType
  modalData: unknown

  // Toasts
  toasts: ToastMessage[]

  // Recent files
  recentDocuments: RecentDocument[]

  // Actions
  setActiveRibbonTab: (tab: RibbonTabId) => void
  toggleSidebar: () => void
  setSidebarOpen: (isOpen: boolean) => void
  setActiveSidebarTab: (tab: SidebarTabId) => void
  setIsOffline: (isOffline: boolean) => void

  openModal: (type: ModalType, data?: unknown) => void
  closeModal: () => void

  addToast: (toast: Omit<ToastMessage, 'id'>) => string
  removeToast: (id: string) => void

  addRecentDocument: (doc: Omit<RecentDocument, 'id' | 'lastOpened'>) => void
  removeRecentDocument: (id: string) => void
  clearRecentDocuments: () => void

  initApp: () => void
}

const RECENT_DOCS_KEY = 'docfusion_recent_docs'

export const useAppStore = create<AppState>((set, get) => ({
  activeRibbonTab: 'home',
  isSidebarOpen: true,
  activeSidebarTab: 'thumbnails',
  isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,

  activeModal: 'none',
  modalData: null,

  toasts: [],
  recentDocuments: [],

  setActiveRibbonTab: (tab) => set({ activeRibbonTab: tab }),

  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),

  setActiveSidebarTab: (tab) => set({ activeSidebarTab: tab, isSidebarOpen: true }),

  setIsOffline: (isOffline) => set({ isOffline }),

  openModal: (type, data = null) => set({ activeModal: type, modalData: data }),

  closeModal: () => set({ activeModal: 'none', modalData: null }),

  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast: ToastMessage = {
      id,
      type: 'info',
      duration: 4000,
      ...toast,
    }

    set((state) => ({ toasts: [...state.toasts, newToast] }))

    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        get().removeToast(id)
      }, newToast.duration)
    }

    return id
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
  },

  addRecentDocument: (doc) => {
    const prev = get().recentDocuments.filter((d) => d.name !== doc.name)
    const updated: RecentDocument[] = [
      {
        id: Math.random().toString(36).substring(2, 9),
        ...doc,
        lastOpened: Date.now(),
      },
      ...prev,
    ].slice(0, 15) // Keep last 15 files

    try {
      localStorage.setItem(RECENT_DOCS_KEY, JSON.stringify(updated))
    } catch {
      // Storage failure fallback
    }

    set({ recentDocuments: updated })
  },

  removeRecentDocument: (id) => {
    const updated = get().recentDocuments.filter((d) => d.id !== id)
    try {
      localStorage.setItem(RECENT_DOCS_KEY, JSON.stringify(updated))
    } catch {
      // Ignore
    }
    set({ recentDocuments: updated })
  },

  clearRecentDocuments: () => {
    try {
      localStorage.removeItem(RECENT_DOCS_KEY)
    } catch {
      // Ignore
    }
    set({ recentDocuments: [] })
  },

  initApp: () => {
    // Load recent docs
    try {
      const stored = localStorage.getItem(RECENT_DOCS_KEY)
      if (stored) {
        set({ recentDocuments: JSON.parse(stored) })
      }
    } catch {
      // Ignore parse errors
    }

    // Network listeners
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => set({ isOffline: false }))
      window.addEventListener('offline', () => set({ isOffline: true }))
    }
  },
}))

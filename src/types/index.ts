import type { PDFDocumentProxy } from '@/services/pdfService'

export type ThemeMode = 'light' | 'dark' | 'system'

export type ViewMode = 'single' | 'continuous'

export type FitMode = 'custom' | 'width' | 'page' | 'actual'

export type RibbonTabId =
  | 'home'
  | 'view'
  | 'organize'
  | 'edit'
  | 'stamp'
  | 'convert'
  | 'finish'
  | 'advanced'

export type SidebarTabId = 'thumbnails' | 'bookmarks' | 'annotations' | 'search'

export type ModalType =
  | 'none'
  | 'open-file'
  | 'export'
  | 'shortcuts'
  | 'settings'
  | 'about'

export interface ToastMessage {
  id: string
  title?: string
  message: string
  type?: 'info' | 'success' | 'warning' | 'error'
  duration?: number
}

export interface RecentDocument {
  id: string
  name: string
  size: number
  lastOpened: number
  pageCount?: number
}

export interface DocumentHistoryEntry {
  buffer: ArrayBuffer
  fileName: string
  description: string
  timestamp: number
}

export interface DocumentState {
  file: File | null
  fileName: string | null
  fileSize: number
  fileUrl: string | null
  fileData: ArrayBuffer | null
  pdfDoc: PDFDocumentProxy | null
  numPages: number
  currentPage: number
  zoom: number
  fitMode: FitMode
  viewMode: ViewMode
  rotation: number
  isReady: boolean
  isLoading: boolean
  error: string | null
  undoStack: DocumentHistoryEntry[]
  redoStack: DocumentHistoryEntry[]
  canUndo: boolean
  canRedo: boolean
  lastAutosaved: number | null
}

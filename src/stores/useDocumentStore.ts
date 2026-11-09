import { create } from 'zustand'
import type { FitMode, ViewMode, DocumentState } from '@/types'
import { loadPdfDocument, createSamplePdfBuffer } from '@/services/pdfService'
import { saveAutosaveSession } from '@/services/autosaveService'
import { useAppStore } from './useAppStore'

interface DocumentActions {
  loadDocument: (file: File) => Promise<void>
  loadBuffer: (buffer: ArrayBuffer, fileName: string) => Promise<void>
  loadSampleDocument: () => Promise<void>
  closeDocument: () => void
  setCurrentPage: (page: number) => void
  nextPage: () => void
  prevPage: () => void
  setZoom: (zoom: number) => void
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
  setFitMode: (mode: FitMode) => void
  setViewMode: (mode: ViewMode) => void
  rotateClockwise: () => void
  rotateCounterClockwise: () => void
  setRotation: (deg: number) => void
  setError: (error: string | null) => void
  commitBuffer: (buffer: ArrayBuffer, fileName: string, description?: string) => Promise<void>
  getSafeFileData: () => Promise<ArrayBuffer>
  undo: () => Promise<void>
  redo: () => Promise<void>
  clearHistory: () => void
}

const MIN_ZOOM = 0.25
const MAX_ZOOM = 5.0
const ZOOM_STEP = 0.15

const initialState: DocumentState = {
  file: null,
  fileName: null,
  fileSize: 0,
  fileUrl: null,
  fileData: null,
  pdfDoc: null,
  numPages: 0,
  currentPage: 1,
  zoom: 1.0,
  fitMode: 'custom',
  viewMode: 'continuous',
  rotation: 0,
  isReady: false,
  isLoading: false,
  error: null,
  undoStack: [],
  redoStack: [],
  canUndo: false,
  canRedo: false,
  lastAutosaved: null,
}

export const useDocumentStore = create<DocumentState & DocumentActions>((set, get) => ({
  ...initialState,

  loadDocument: async (file: File) => {
    // Revoke old object URL if exists
    const currentUrl = get().fileUrl
    if (currentUrl) {
      URL.revokeObjectURL(currentUrl)
    }

    // Destroy old PDF doc if exists
    const currentPdf = get().pdfDoc
    if (currentPdf) {
      try {
        currentPdf.cleanup?.()
      } catch {
        // Ignore
      }
    }

    set({
      isLoading: true,
      error: null,
      file,
      fileName: file.name,
      fileSize: file.size,
      currentPage: 1,
      zoom: 1.0,
      fitMode: 'custom',
      rotation: 0,
    })

    try {
      const fileUrl = URL.createObjectURL(file)
      const rawBuffer = await file.arrayBuffer()
      const buffer = rawBuffer.slice(0)
      const pdfDoc = await loadPdfDocument(buffer.slice(0))

      set({
        fileUrl,
        fileData: buffer,
        pdfDoc,
        numPages: pdfDoc.numPages,
        isLoading: false,
        isReady: true,
      })

      // Add to recent docs
      useAppStore.getState().addRecentDocument({
        name: file.name,
        size: file.size,
        pageCount: pdfDoc.numPages,
      })

      useAppStore.getState().addToast({
        title: 'Document Opened',
        message: `${file.name} (${pdfDoc.numPages} ${pdfDoc.numPages === 1 ? 'page' : 'pages'}) loaded successfully`,
        type: 'success',
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to parse PDF document'
      set({
        isLoading: false,
        error: message,
        isReady: false,
      })
      useAppStore.getState().addToast({
        title: 'Error Opening PDF',
        message,
        type: 'error',
      })
    }
  },

  loadBuffer: async (buffer: ArrayBuffer, fileName: string) => {
    const currentUrl = get().fileUrl
    if (currentUrl) URL.revokeObjectURL(currentUrl)
    const currentPdf = get().pdfDoc
    if (currentPdf) {
      try {
        currentPdf.cleanup?.()
      } catch {
        // Ignore
      }
    }

    set({
      isLoading: true,
      error: null,
      file: null,
      fileName,
      fileSize: buffer.byteLength,
      currentPage: 1,
      zoom: 1.0,
      fitMode: 'custom',
      rotation: 0,
    })

    try {
      const safeBuffer = buffer.slice(0)
      const pdfDoc = await loadPdfDocument(buffer.slice(0))
      const blob = new Blob([safeBuffer], { type: 'application/pdf' })
      const fileUrl = URL.createObjectURL(blob)

      set({
        fileUrl,
        fileData: safeBuffer,
        pdfDoc,
        numPages: pdfDoc.numPages,
        isLoading: false,
        isReady: true,
      })

      useAppStore.getState().addRecentDocument({
        name: fileName,
        size: buffer.byteLength,
        pageCount: pdfDoc.numPages,
      })

      useAppStore.getState().addToast({
        title: 'Document Opened',
        message: `${fileName} (${pdfDoc.numPages} pages) loaded`,
        type: 'success',
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to parse PDF buffer'
      set({
        isLoading: false,
        error: message,
        isReady: false,
      })
      useAppStore.getState().addToast({
        title: 'Error Opening PDF',
        message,
        type: 'error',
      })
    }
  },

  loadSampleDocument: async () => {
    const sampleBuffer = createSamplePdfBuffer()
    await get().loadBuffer(sampleBuffer, 'DocFusion_Sample.pdf')
  },

  closeDocument: () => {
    const currentUrl = get().fileUrl
    if (currentUrl) URL.revokeObjectURL(currentUrl)
    const currentPdf = get().pdfDoc
    if (currentPdf) {
      try {
        currentPdf.cleanup?.()
      } catch {
        // Ignore
      }
    }
    set({ ...initialState })
  },

  setCurrentPage: (page: number) => {
    const { numPages } = get()
    if (numPages > 0) {
      const clamped = Math.max(1, Math.min(page, numPages))
      set({ currentPage: clamped })
    } else {
      set({ currentPage: Math.max(1, page) })
    }
  },

  nextPage: () => {
    const { currentPage, numPages } = get()
    if (numPages === 0 || currentPage < numPages) {
      set({ currentPage: currentPage + 1 })
    }
  },

  prevPage: () => {
    const { currentPage } = get()
    if (currentPage > 1) {
      set({ currentPage: currentPage - 1 })
    }
  },

  setZoom: (zoom: number) => {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
    set({ zoom: Number(clamped.toFixed(2)), fitMode: 'custom' })
  },

  zoomIn: () => {
    const current = get().zoom
    get().setZoom(current + ZOOM_STEP)
  },

  zoomOut: () => {
    const current = get().zoom
    get().setZoom(current - ZOOM_STEP)
  },

  resetZoom: () => {
    set({ zoom: 1.0, fitMode: 'custom' })
  },

  setFitMode: (mode: FitMode) => {
    set({ fitMode: mode })
  },

  setViewMode: (mode: ViewMode) => {
    set({ viewMode: mode })
  },

  rotateClockwise: () => {
    set((state) => ({ rotation: (state.rotation + 90) % 360 }))
  },

  rotateCounterClockwise: () => {
    set((state) => ({ rotation: (state.rotation - 90 + 360) % 360 }))
  },

  setRotation: (deg: number) => {
    set({ rotation: ((deg % 360) + 360) % 360 })
  },

  setError: (error: string | null) => {
    set({ error })
  },

  commitBuffer: async (buffer: ArrayBuffer, fileName: string, description = 'Edit document') => {
    const { fileData, fileName: currentName, undoStack } = get()
    if (fileData && currentName) {
      try {
        const undoCopy = fileData.slice(0)
        const newEntry = {
          buffer: undoCopy,
          fileName: currentName,
          description,
          timestamp: Date.now(),
        }
        set({
          undoStack: [...undoStack, newEntry].slice(-25),
          redoStack: [],
          canUndo: true,
          canRedo: false,
        })
      } catch {
        // fileData was detached, skip pushing damaged state to undo
      }
    }
    await get().loadBuffer(buffer, fileName)
    // Autosave integration
    try {
      await saveAutosaveSession({
        buffer,
        fileName,
        timestamp: Date.now(),
        description,
      })
      set({ lastAutosaved: Date.now() })
    } catch {
      // Ignore
    }
  },

  getSafeFileData: async (): Promise<ArrayBuffer> => {
    const state = get()
    const buf = state.fileData

    // 1. Check if existing buffer is intact and non-detached
    if (buf && buf.byteLength > 0 && !(buf as any).detached) {
      try {
        new Uint8Array(buf)
        return buf.slice(0)
      } catch {
        // Detached, proceed to healing
      }
    }

    // 2. Self-heal from File object if available
    if (state.file) {
      try {
        const fresh = await state.file.arrayBuffer()
        const cloned = fresh.slice(0)
        set({ fileData: cloned })
        return cloned.slice(0)
      } catch {
        // Fallthrough
      }
    }

    // 3. Self-heal from Object URL if available
    if (state.fileUrl) {
      try {
        const resp = await fetch(state.fileUrl)
        const fresh = await resp.arrayBuffer()
        const cloned = fresh.slice(0)
        set({ fileData: cloned })
        return cloned.slice(0)
      } catch {
        // Fallthrough
      }
    }

    throw new Error('PDF document buffer is detached or unavailable')
  },

  undo: async () => {
    const { undoStack, redoStack, fileData, fileName } = get()
    if (undoStack.length === 0) return

    const previousEntry = undoStack[undoStack.length - 1]
    const nextUndoStack = undoStack.slice(0, -1)

    const nextRedoStack = fileData && fileName ? [
      ...redoStack,
      {
        buffer: fileData,
        fileName,
        description: 'Reverted action',
        timestamp: Date.now(),
      }
    ].slice(-25) : redoStack

    set({
      undoStack: nextUndoStack,
      redoStack: nextRedoStack,
      canUndo: nextUndoStack.length > 0,
      canRedo: true,
    })

    await get().loadBuffer(previousEntry.buffer, previousEntry.fileName)
    useAppStore.getState().addToast({
      type: 'info',
      title: 'Undo Action',
      message: `Reverted: ${previousEntry.description}`,
    })
  },

  redo: async () => {
    const { undoStack, redoStack, fileData, fileName } = get()
    if (redoStack.length === 0) return

    const nextEntry = redoStack[redoStack.length - 1]
    const nextRedoStack = redoStack.slice(0, -1)

    const nextUndoStack = fileData && fileName ? [
      ...undoStack,
      {
        buffer: fileData,
        fileName,
        description: 'Redone action',
        timestamp: Date.now(),
      }
    ].slice(-25) : undoStack

    set({
      undoStack: nextUndoStack,
      redoStack: nextRedoStack,
      canUndo: true,
      canRedo: nextRedoStack.length > 0,
    })

    await get().loadBuffer(nextEntry.buffer, nextEntry.fileName)
    useAppStore.getState().addToast({
      type: 'info',
      title: 'Redo Action',
      message: `Restored: ${nextEntry.description}`,
    })
  },

  clearHistory: () => {
    set({
      undoStack: [],
      redoStack: [],
      canUndo: false,
      canRedo: false,
    })
  },
}))

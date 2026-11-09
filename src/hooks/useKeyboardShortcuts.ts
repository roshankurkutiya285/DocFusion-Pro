import { useEffect } from 'react'
import { useDocumentStore } from '@/stores/useDocumentStore'
import { useAppStore } from '@/stores/useAppStore'
import { downloadPdfBlob } from '@/services/organizeService'

export function useKeyboardShortcuts() {
  const {
    zoomIn,
    zoomOut,
    resetZoom,
    nextPage,
    prevPage,
    setCurrentPage,
    numPages,
    fileName,
    undo,
    redo,
    canUndo,
    canRedo,
    getSafeFileData,
  } = useDocumentStore()

  const { openModal, closeModal, activeModal } = useAppStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture shortcuts when user is typing in form inputs, textareas, or contentEditable
      const target = e.target as HTMLElement
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable

      // ESC: Close open modal
      if (e.key === 'Escape') {
        if (activeModal !== 'none') {
          e.preventDefault()
          closeModal()
        }
        return
      }

      // Ctrl or Meta (Cmd on Mac) combos
      if (e.ctrlKey || e.metaKey) {
        // Ctrl+Z: Undo
        if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
          if (!isInput && canUndo) {
            e.preventDefault()
            undo()
          }
          return
        }

        // Ctrl+Y or Ctrl+Shift+Z: Redo
        if (
          e.key.toLowerCase() === 'y' ||
          (e.key.toLowerCase() === 'z' && e.shiftKey)
        ) {
          if (!isInput && canRedo) {
            e.preventDefault()
            redo()
          }
          return
        }

        // Ctrl+S: Save / Download
        if (e.key.toLowerCase() === 's') {
          e.preventDefault()
          getSafeFileData()
            .then((safeBuffer) => {
              downloadPdfBlob(new Uint8Array(safeBuffer), fileName || 'document.pdf')
            })
            .catch(() => {})
          return
        }

        // Ctrl+O: Open file modal / picker
        if (e.key.toLowerCase() === 'o') {
          e.preventDefault()
          const fileInput = document.getElementById('global-pdf-file-picker') as HTMLInputElement
          if (fileInput) {
            fileInput.click()
          } else {
            openModal('open-file')
          }
          return
        }

        // Ctrl+= / Ctrl++: Zoom In
        if (e.key === '=' || e.key === '+') {
          e.preventDefault()
          zoomIn()
          return
        }

        // Ctrl+-: Zoom Out
        if (e.key === '-') {
          e.preventDefault()
          zoomOut()
          return
        }

        // Ctrl+0: Reset Zoom
        if (e.key === '0') {
          e.preventDefault()
          resetZoom()
          return
        }

        // Ctrl+F: Open search in sidebar
        if (e.key.toLowerCase() === 'f') {
          e.preventDefault()
          useAppStore.getState().setActiveSidebarTab('search')
          return
        }

        // Ctrl+K: Open keyboard shortcuts help modal
        if (e.key.toLowerCase() === 'k') {
          e.preventDefault()
          openModal('shortcuts')
          return
        }
      }

      // Non-ctrl single-key navigation (only when not typing in an input)
      if (!isInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === '?' || (e.shiftKey && e.key === '/')) {
          e.preventDefault()
          openModal('shortcuts')
          return
        }
        if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
          e.preventDefault()
          prevPage()
          return
        }
        if (e.key === 'ArrowRight' || e.key === 'PageDown') {
          e.preventDefault()
          nextPage()
          return
        }
        if (e.key === 'Home') {
          e.preventDefault()
          setCurrentPage(1)
          return
        }
        if (e.key === 'End' && numPages > 0) {
          e.preventDefault()
          setCurrentPage(numPages)
          return
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    zoomIn,
    zoomOut,
    resetZoom,
    nextPage,
    prevPage,
    setCurrentPage,
    numPages,
    fileName,
    undo,
    redo,
    canUndo,
    canRedo,
    getSafeFileData,
    activeModal,
    openModal,
    closeModal,
  ])
}

import React, { useState, useRef } from 'react'
import type { AnyAnnotation, EditToolType, ShapeType } from '@/types/edit'
import { useDocumentStore } from '@/stores/useDocumentStore'
import { useAppStore } from '@/stores/useAppStore'
import { EditToolbar } from '@/components/edit/EditToolbar'
import { EditCanvasOverlay } from '@/components/edit/EditCanvasOverlay'
import { SignatureModal } from '@/components/edit/SignatureModal'
import { FindAndInterchangeModal } from '@/components/edit/FindAndInterchangeModal'
import { PdfPageView } from '@/components/viewer/PdfPageView'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { applyEditsToPdf } from '@/services/editService'
import { extractPageTextItems, type DetectedTextItem } from '@/services/pdfService'
import { toArrayBuffer, downloadPdfBlob, deletePages } from '@/services/organizeService'
import {
  ChevronLeft,
  ChevronRight,
  Save,
  Download,
  FolderOpen,
  Sparkles,
  Edit3,
  Loader2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Trash2,
  Eraser,
} from 'lucide-react'
import { formatZoom } from '@/utils/formatters'

export const EditPage: React.FC = () => {
  const {
    fileName,
    pdfDoc,
    numPages,
    isReady,
    currentPage,
    setCurrentPage,
    getSafeFileData,
    zoom,
    rotation,
    nextPage,
    prevPage,
    zoomIn,
    zoomOut,
    resetZoom,
    rotateClockwise,
    commitBuffer,
    loadDocument,
    loadSampleDocument,
  } = useDocumentStore()
  const { addToast } = useAppStore()

  // Tool states
  const [activeTool, setActiveTool] = useState<EditToolType>('select')
  const [activeShape, setActiveShape] = useState<ShapeType>('rectangle')
  const [color, setColor] = useState('#000000')
  const [fontSize, setFontSize] = useState(16)
  const [strokeWidth, setStrokeWidth] = useState(2)
  const [fontFamily, setFontFamily] = useState<'Helvetica' | 'TimesRoman' | 'Courier'>('Helvetica')
  const [isBold, setIsBold] = useState(false)
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false)
  const [isFindAndInterchangeOpen, setIsFindAndInterchangeOpen] = useState(false)
  const [isApplying, setIsApplying] = useState(false)

  // Real page dimensions from PDF viewport
  const [pageSize, setPageSize] = useState({ width: 612, height: 792 })

  // Detected text items on current page for direct editing & interchange
  const [detectedTextItems, setDetectedTextItems] = useState<DetectedTextItem[]>([])

  // Document annotations list with full Undo/Redo stacks
  const [annotations, setAnnotations] = useState<AnyAnnotation[]>([])
  const [undoStack, setUndoStack] = useState<AnyAnnotation[][]>([])
  const [redoStack, setRedoStack] = useState<AnyAnnotation[][]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const activePageIndex = Math.max(0, currentPage - 1)

  // Extract detected text items on current page
  React.useEffect(() => {
    let isCancelled = false
    if (!pdfDoc) {
      setDetectedTextItems([])
      return
    }

    const loadText = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage)
        const items = await extractPageTextItems(page, currentPage, rotation)
        if (!isCancelled) {
          setDetectedTextItems(items)
        }
      } catch (err) {
        console.error('Failed to extract text items', err)
      }
    }

    loadText()
    return () => {
      isCancelled = true
    }
  }, [pdfDoc, currentPage, rotation])

  // Push state to undo stack and clear redo with functional state updates (prevents stale closure overwrites)
  const pushState = (
    newAnnotationsOrFn: AnyAnnotation[] | ((prev: AnyAnnotation[]) => AnyAnnotation[])
  ) => {
    setAnnotations((current) => {
      const next =
        typeof newAnnotationsOrFn === 'function'
          ? newAnnotationsOrFn(current)
          : newAnnotationsOrFn
      setUndoStack((prev) => [...prev, current])
      setRedoStack([])
      return next
    })
  }

  // Add single Annotation
  const handleAddAnnotation = (ann: AnyAnnotation) => {
    pushState((current) => [...current, ann])
  }

  // Add multiple Annotations in a single atomic batch (e.g. whiteout + text)
  const handleAddAnnotations = (newAnns: AnyAnnotation[]) => {
    pushState((current) => [...current, ...newAnns])
  }

  // Apply batch edits (e.g. from Find & Replace or Document Interchange)
  const handleApplyBatchEdits = (newAnnotations: AnyAnnotation[], desc: string) => {
    pushState((current) => [...current, ...newAnnotations])
    addToast({
      title: 'Edits Staged',
      message: `${desc}. Click "Apply to Document" to burn changes into the PDF.`,
      type: 'success',
    })
  }

  // Update Annotation
  const handleUpdateAnnotation = (id: string, updates: Partial<AnyAnnotation>) => {
    pushState((current) =>
      current.map((a) => (a.id === id ? ({ ...a, ...updates } as AnyAnnotation) : a))
    )
  }

  // Delete Annotation (and companion automated whiteout mask if present)
  const handleDeleteAnnotation = (id: string) => {
    pushState((current) => {
      const idsToRemove = new Set<string>([id])
      if (id.startsWith('txt_edt_')) {
        idsToRemove.add(id.replace('txt_edt_', 'wo_edt_'))
      } else if (id.startsWith('txt_swp_')) {
        idsToRemove.add(id.replace('txt_swp_', 'wo_swp_'))
      } else if (id.startsWith('txt_mov_')) {
        idsToRemove.add(id.replace('txt_mov_', 'wo_mov_'))
      } else if (id.startsWith('txt_rep_')) {
        idsToRemove.add(id.replace('txt_rep_', 'wo_rep_'))
      } else {
        idsToRemove.add(`${id}_bg`)
      }
      return current.filter((a) => !idsToRemove.has(a.id))
    })
  }

  // Clear current page annotations
  const handleClearCurrentPage = () => {
    pushState(annotations.filter((a) => a.pageIndex !== activePageIndex))
    addToast({
      title: 'Annotations Cleared',
      message: `Removed edits on Page ${currentPage}.`,
      type: 'info',
    })
  }

  // Delete current PDF page from document
  const handleDeleteCurrentPage = async () => {
    if (numPages <= 1) {
      addToast({
        title: 'Cannot Delete Page',
        message: 'A PDF must contain at least one page.',
        type: 'warning',
      })
      return
    }

    const pageIdxToDelete = activePageIndex
    const pageNumToDelete = currentPage

    try {
      const safeBuffer = await getSafeFileData()
      const newBytes = await deletePages(safeBuffer, [pageIdxToDelete])
      const newNumPages = numPages - 1
      const nextCurrentPage = currentPage > newNumPages ? newNumPages : currentPage

      await commitBuffer(
        toArrayBuffer(newBytes),
        fileName || 'document.pdf',
        `Delete Page ${pageNumToDelete}`
      )

      setCurrentPage(nextCurrentPage)

      // Shift remaining annotations
      setAnnotations((current) =>
        current
          .filter((a) => a.pageIndex !== pageIdxToDelete)
          .map((a) =>
            a.pageIndex > pageIdxToDelete
              ? ({ ...a, pageIndex: a.pageIndex - 1 } as AnyAnnotation)
              : a
          )
      )

      addToast({
        title: 'Page Deleted',
        message: `Page ${pageNumToDelete} was removed from the document.`,
        type: 'success',
      })
    } catch (err) {
      addToast({
        title: 'Delete Failed',
        message: err instanceof Error ? err.message : 'Failed to delete page',
        type: 'error',
      })
    }
  }

  // Undo Annotation
  const handleUndo = () => {
    if (undoStack.length === 0) return
    const prev = undoStack[undoStack.length - 1]
    setUndoStack((stack) => stack.slice(0, stack.length - 1))
    setRedoStack((stack) => [...stack, annotations])
    setAnnotations(prev)
  }

  // Redo Annotation
  const handleRedo = () => {
    if (redoStack.length === 0) return
    const next = redoStack[redoStack.length - 1]
    setRedoStack((stack) => stack.slice(0, stack.length - 1))
    setUndoStack((stack) => [...stack, annotations])
    setAnnotations(next)
  }

  // Save / Burn annotations directly into PDF
  const handleSaveEdits = async (downloadAfter = false) => {
    if (annotations.length === 0) {
      addToast({
        title: 'No Edits to Save',
        message: 'Add annotations, text, or shapes to save changes.',
        type: 'info',
      })
      return
    }

    setIsApplying(true)
    try {
      const safeBuffer = await getSafeFileData()
      const updatedBytes = await applyEditsToPdf(safeBuffer, annotations)
      const buffer = toArrayBuffer(updatedBytes)
      const outName = fileName || 'Edited_Document.pdf'

      if (downloadAfter) {
        downloadPdfBlob(updatedBytes, outName)
        addToast({
          title: 'Edits Exported',
          message: 'Document saved with all annotations burned in.',
          type: 'success',
        })
      } else {
        await commitBuffer(buffer, outName, 'Apply edits & annotations')
        setAnnotations([]) // Clear applied annotations as they are now burned into the PDF!
        addToast({
          title: 'Changes Applied',
          message: 'All edits burned directly into PDF document.',
          type: 'success',
        })
      }
    } catch (err) {
      addToast({
        title: 'Error Saving Edits',
        message: err instanceof Error ? err.message : 'Failed to apply edits',
        type: 'error',
      })
    } finally {
      setIsApplying(false)
    }
  }

  // Keyboard Shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z, Ctrl+S, Ctrl+H)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if focus is inside an input or textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault()
        if (e.shiftKey) {
          handleRedo()
        } else {
          handleUndo()
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault()
        handleRedo()
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault()
        handleSaveEdits(false)
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault()
        setIsFindAndInterchangeOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [annotations, undoStack, redoStack, fileName])

  // Handle Add Image File
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string
        handleAddAnnotation({
          id: Math.random().toString(36).substring(2, 9),
          pageIndex: activePageIndex,
          type: 'addImage',
          createdAt: Date.now(),
          x: 50,
          y: 50,
          width: 150,
          height: 100,
          dataUrl,
        })
        setActiveTool('select')
        addToast({
          title: 'Image Added',
          message: 'Image placed on canvas. Drag to position or drag bottom-right corner to resize.',
          type: 'info',
        })
      }
      reader.readAsDataURL(file)
    }
    e.target.value = ''
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-200/80 dark:bg-slate-900/90">
      {/* Hidden File Pickers */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) loadDocument(file)
          e.target.value = ''
        }}
        className="hidden"
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleImageFileChange}
        className="hidden"
      />

      {/* Top Edit Ribbon Toolbar */}
      <EditToolbar
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        activeShape={activeShape}
        setActiveShape={setActiveShape}
        color={color}
        setColor={setColor}
        fontSize={fontSize}
        setFontSize={setFontSize}
        strokeWidth={strokeWidth}
        setStrokeWidth={setStrokeWidth}
        fontFamily={fontFamily}
        setFontFamily={setFontFamily}
        isBold={isBold}
        setIsBold={setIsBold}
        onUndo={handleUndo}
        canUndo={undoStack.length > 0}
        onRedo={handleRedo}
        canRedo={redoStack.length > 0}
        onOpenSignatureModal={() => setIsSignatureModalOpen(true)}
        onOpenImageInput={() => imageInputRef.current?.click()}
        onOpenFindAndInterchange={() => setIsFindAndInterchangeOpen(true)}
      />

      {/* Secondary Shelf: Page Navigation, Zoom, and Save Actions */}
      <div className="h-9 px-4 bg-white/70 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 shrink-0 select-none overflow-x-auto no-scrollbar gap-2">
        {/* Left: Page nav & Annotations count */}
        <div className="flex items-center gap-1.5 shrink-0">
          <IconButton
            size="xs"
            tooltip="Previous Page"
            disabled={!isReady || currentPage <= 1}
            onClick={prevPage}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </IconButton>

          <span className="font-mono text-xs font-semibold px-1.5 whitespace-nowrap">
            Page {currentPage} of {numPages > 0 ? numPages : 1}
          </span>

          <IconButton
            size="xs"
            tooltip="Next Page"
            disabled={!isReady || currentPage >= numPages}
            onClick={nextPage}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </IconButton>

          {/* Direct Delete Page button */}
          <IconButton
            size="xs"
            tooltip={`Delete Page ${currentPage} from document`}
            disabled={!isReady || numPages <= 1}
            onClick={handleDeleteCurrentPage}
            className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 ml-0.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </IconButton>

          <div className="h-3.5 w-px bg-slate-300 dark:bg-slate-800 mx-1" />

          {/* Quick Zoom in Editor */}
          <IconButton size="xs" tooltip="Zoom Out" onClick={zoomOut} disabled={!isReady}>
            <ZoomOut className="w-3.5 h-3.5" />
          </IconButton>
          <span
            onClick={resetZoom}
            className="font-mono text-[11px] font-medium px-1 cursor-pointer hover:underline"
            title="Reset Zoom to 100%"
          >
            {formatZoom(zoom)}
          </span>
          <IconButton size="xs" tooltip="Zoom In" onClick={zoomIn} disabled={!isReady}>
            <ZoomIn className="w-3.5 h-3.5" />
          </IconButton>
          <IconButton size="xs" tooltip="Rotate Clockwise" onClick={rotateClockwise} disabled={!isReady}>
            <RotateCw className="w-3.5 h-3.5" />
          </IconButton>

          <div className="h-3.5 w-px bg-slate-300 dark:bg-slate-800 mx-1" />

          <span className="text-[11px] text-slate-500 hidden sm:inline whitespace-nowrap">
            {annotations.length} pending edit{annotations.length === 1 ? '' : 's'}
          </span>

          {annotations.some((a) => a.pageIndex === activePageIndex) && (
            <button
              type="button"
              onClick={handleClearCurrentPage}
              className="text-[11px] text-amber-600 hover:text-amber-700 flex items-center gap-0.5 ml-1 px-1.5 py-0.5 rounded hover:bg-amber-50 dark:hover:bg-amber-950/40"
              title="Clear unsaved annotations on this page"
            >
              <Eraser className="w-3 h-3" />
              <span>Clear Edits</span>
            </button>
          )}
        </div>

        {/* Right: Apply & Export buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="xs"
            variant="outline"
            disabled={!isReady || annotations.length === 0 || isApplying}
            leftIcon={<Download className="w-3 h-3" />}
            onClick={() => handleSaveEdits(true)}
          >
            Export PDF
          </Button>

          <Button
            size="xs"
            variant="primary"
            disabled={!isReady || annotations.length === 0 || isApplying}
            leftIcon={
              isApplying ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Save className="w-3 h-3" />
              )
            }
            onClick={() => handleSaveEdits(false)}
          >
            Apply to Document
          </Button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 overflow-auto p-6 flex justify-center items-start">
        {!isReady || !pdfDoc ? (
          <div className="max-w-md w-full bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-desktop border border-slate-200 dark:border-slate-800 text-center my-auto">
            <div className="w-14 h-14 rounded-2xl bg-violet-50 dark:bg-violet-950/70 text-violet-600 dark:text-violet-400 flex items-center justify-center mx-auto mb-4 border border-violet-200 dark:border-violet-800/80 shadow-inner">
              <Edit3 className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1.5">
              Interactive PDF Editor
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              Add text, replace existing text, insert images, freehand draw, highlight, underline, draw shapes, whiteout, redact, fill forms, and sign digitally.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<FolderOpen className="w-4 h-4" />}
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto"
              >
                Open PDF to Edit
              </Button>
              <Button
                variant="subtle"
                size="sm"
                leftIcon={<Sparkles className="w-4 h-4" />}
                onClick={() => loadSampleDocument()}
                className="w-full sm:w-auto"
              >
                Try Sample PDF
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative inline-block shadow-2xl rounded-sm shrink-0">
            {/* 1. Underlying High-DPI PDF Page */}
            <PdfPageView
              pdfDoc={pdfDoc}
              pageNumber={currentPage}
              scale={zoom}
              rotation={rotation}
              onPageLoaded={(_page, w, h) => {
                if (w && h && (w !== pageSize.width || h !== pageSize.height)) {
                  setPageSize({ width: w, height: h })
                }
              }}
            />

            {/* 2. Interactive Editing Overlay (Synchronized to actual PDF Page size) */}
            <EditCanvasOverlay
              pageIndex={activePageIndex}
              width={pageSize.width * zoom}
              height={pageSize.height * zoom}
              scale={zoom}
              activeTool={activeTool}
              activeShape={activeShape}
              color={color}
              fontSize={fontSize}
              strokeWidth={strokeWidth}
              fontFamily={fontFamily}
              isBold={isBold}
              signatureDataUrl={signatureDataUrl}
              annotations={annotations}
              detectedTextItems={detectedTextItems}
              onAddAnnotation={handleAddAnnotation}
              onAddAnnotations={handleAddAnnotations}
              onUpdateAnnotation={handleUpdateAnnotation}
              onDeleteAnnotation={handleDeleteAnnotation}
              onSelectTool={setActiveTool}
            />
          </div>
        )}
      </div>

      {/* Signature Modal */}
      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onSaveSignature={(dataUrl) => {
          setSignatureDataUrl(dataUrl)
          setActiveTool('signature')
          addToast({
            title: 'Signature Ready',
            message: 'Click anywhere on the document page to place your signature.',
            type: 'info',
          })
        }}
      />

      {/* Find, Replace & Interchange Content Modal */}
      <FindAndInterchangeModal
        isOpen={isFindAndInterchangeOpen}
        onClose={() => setIsFindAndInterchangeOpen(false)}
        pdfDoc={pdfDoc}
        currentPage={currentPage}
        numPages={numPages}
        rotation={rotation}
        fontFamily={fontFamily}
        color={color}
        onApplyEdits={handleApplyBatchEdits}
      />
    </div>
  )
}

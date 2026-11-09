import React, { useEffect, useRef, useCallback } from 'react'
import { useDocumentStore } from '@/stores/useDocumentStore'
import { PdfPageView } from './PdfPageView'
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCw,
  Square,
  Rows,
} from 'lucide-react'
import { IconButton } from '@/components/ui/IconButton'
import { formatZoom } from '@/utils/formatters'

export const PdfViewer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const isAutoScrolling = useRef(false)

  const {
    pdfDoc,
    numPages,
    currentPage,
    zoom,
    viewMode,
    fitMode,
    rotation,
    setCurrentPage,
    nextPage,
    prevPage,
    zoomIn,
    zoomOut,
    setZoom,
    setFitMode,
    setViewMode,
    rotateClockwise,
  } = useDocumentStore()

  // Calculate Fit Width
  const handleFitWidth = useCallback(async () => {
    if (!containerRef.current || !pdfDoc) return
    try {
      const page = await pdfDoc.getPage(currentPage || 1)
      const viewport = page.getViewport({ scale: 1.0, rotation })
      const containerWidth = containerRef.current.clientWidth - 64 // 32px padding each side
      if (containerWidth > 0 && viewport.width > 0) {
        const newZoom = Math.max(0.25, Math.min(4.0, containerWidth / viewport.width))
        setZoom(Number(newZoom.toFixed(2)))
        setFitMode('width')
      }
    } catch (err) {
      console.error('Fit width calculation failed', err)
    }
  }, [pdfDoc, currentPage, rotation, setZoom, setFitMode])

  // Calculate Fit Page (Full page visible vertically and horizontally)
  const handleFitPage = useCallback(async () => {
    if (!containerRef.current || !pdfDoc) return
    try {
      const page = await pdfDoc.getPage(currentPage || 1)
      const viewport = page.getViewport({ scale: 1.0, rotation })
      const containerWidth = containerRef.current.clientWidth - 64
      const containerHeight = containerRef.current.clientHeight - 64
      if (containerWidth > 0 && containerHeight > 0 && viewport.width > 0 && viewport.height > 0) {
        const scaleX = containerWidth / viewport.width
        const scaleY = containerHeight / viewport.height
        const newZoom = Math.max(0.25, Math.min(4.0, Math.min(scaleX, scaleY)))
        setZoom(Number(newZoom.toFixed(2)))
        setFitMode('page')
      }
    } catch (err) {
      console.error('Fit page calculation failed', err)
    }
  }, [pdfDoc, currentPage, rotation, setZoom, setFitMode])

  // Re-calculate fit mode if container resizes or rotation changes
  useEffect(() => {
    if (fitMode === 'width') {
      handleFitWidth()
    } else if (fitMode === 'page') {
      handleFitPage()
    }
  }, [fitMode, rotation, handleFitWidth, handleFitPage])

  // Continuous Scroll - IntersectionObserver to track visible page
  useEffect(() => {
    if (viewMode !== 'continuous' || !containerRef.current || numPages === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (isAutoScrolling.current) return
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            const pageNumStr = entry.target.getAttribute('data-page-number')
            if (pageNumStr) {
              const pageNum = parseInt(pageNumStr, 10)
              if (!isNaN(pageNum) && pageNum !== currentPage) {
                setCurrentPage(pageNum)
              }
            }
          }
        }
      },
      {
        root: containerRef.current,
        threshold: [0.5],
      }
    )

    const pageElements = containerRef.current.querySelectorAll('[data-page-number]')
    pageElements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [viewMode, numPages, currentPage, setCurrentPage, zoom, rotation])

  // Ctrl + Wheel to Zoom
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        if (e.deltaY < 0) {
          zoomIn()
        } else {
          zoomOut()
        }
      }
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [zoomIn, zoomOut])

  // Keyboard navigation within the viewer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if focus is inside an input or textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return
      }

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault()
        nextPage()
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        prevPage()
      } else if (e.key === 'Home') {
        e.preventDefault()
        setCurrentPage(1)
      } else if (e.key === 'End' && numPages > 0) {
        e.preventDefault()
        setCurrentPage(numPages)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [nextPage, prevPage, setCurrentPage, numPages])

  if (!pdfDoc) return null

  const pageNumbers = Array.from({ length: numPages }, (_, i) => i + 1)

  return (
    <div className="relative flex-1 flex flex-col h-full overflow-hidden bg-slate-200/80 dark:bg-slate-900/90 group">
      {/* Floating Quick Action HUD (Hover Toolbar) */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/85 dark:bg-slate-950/90 backdrop-blur-md text-white rounded-full shadow-floating border border-slate-700/60 transition-opacity duration-200 opacity-90 hover:opacity-100 select-none">
        {/* Page Nav */}
        <IconButton
          size="xs"
          variant="ghost"
          tooltip="Previous Page"
          shortcut="Left Arrow"
          disabled={currentPage <= 1}
          onClick={prevPage}
          className="text-white hover:text-white hover:bg-white/20"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </IconButton>

        <span className="text-xs font-mono px-1 font-medium whitespace-nowrap">
          {currentPage} / {numPages}
        </span>

        <IconButton
          size="xs"
          variant="ghost"
          tooltip="Next Page"
          shortcut="Right Arrow"
          disabled={currentPage >= numPages}
          onClick={nextPage}
          className="text-white hover:text-white hover:bg-white/20"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </IconButton>

        <div className="h-3.5 w-px bg-white/20 mx-1" />

        {/* Zoom Controls */}
        <IconButton
          size="xs"
          variant="ghost"
          tooltip="Zoom Out"
          shortcut="Ctrl+-"
          onClick={zoomOut}
          className="text-white hover:text-white hover:bg-white/20"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </IconButton>

        <span
          className="text-xs font-mono font-medium w-11 text-center cursor-pointer hover:underline"
          onClick={() => setZoom(1.0)}
          title="Reset Zoom to 100%"
        >
          {formatZoom(zoom)}
        </span>

        <IconButton
          size="xs"
          variant="ghost"
          tooltip="Zoom In"
          shortcut="Ctrl++"
          onClick={zoomIn}
          className="text-white hover:text-white hover:bg-white/20"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </IconButton>

        <div className="h-3.5 w-px bg-white/20 mx-1" />

        {/* Fit Width / Fit Page */}
        <IconButton
          size="xs"
          variant="ghost"
          tooltip="Fit Width"
          isActive={fitMode === 'width'}
          onClick={handleFitWidth}
          className="text-white hover:text-white hover:bg-white/20"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </IconButton>

        <IconButton
          size="xs"
          variant="ghost"
          tooltip="Fit Page"
          isActive={fitMode === 'page'}
          onClick={handleFitPage}
          className="text-white hover:text-white hover:bg-white/20"
        >
          <Minimize2 className="w-3.5 h-3.5" />
        </IconButton>

        {/* Rotate */}
        <IconButton
          size="xs"
          variant="ghost"
          tooltip="Rotate Clockwise"
          shortcut="Ctrl+Shift+R"
          onClick={rotateClockwise}
          className="text-white hover:text-white hover:bg-white/20"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </IconButton>

        <div className="h-3.5 w-px bg-white/20 mx-1" />

        {/* View Mode */}
        <IconButton
          size="xs"
          variant="ghost"
          tooltip={viewMode === 'continuous' ? 'Switch to Single Page' : 'Switch to Continuous Scroll'}
          onClick={() => setViewMode(viewMode === 'continuous' ? 'single' : 'continuous')}
          className="text-white hover:text-white hover:bg-white/20"
        >
          {viewMode === 'continuous' ? (
            <Square className="w-3.5 h-3.5" />
          ) : (
            <Rows className="w-3.5 h-3.5" />
          )}
        </IconButton>
      </div>

      {/* Main PDF Canvas Scroll Viewport */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-8 flex flex-col items-center gap-6"
      >
        {viewMode === 'continuous' ? (
          // Continuous Vertical Scroll
          pageNumbers.map((pageNum) => (
            <PdfPageView
              key={`${pageNum}-${rotation}-${zoom}`}
              pdfDoc={pdfDoc}
              pageNumber={pageNum}
              scale={zoom}
              rotation={rotation}
              className="my-1 group shrink-0"
            />
          ))
        ) : (
          // Single Page View
          <div className="m-auto flex items-center justify-center shrink-0 min-h-full min-w-full">
            <PdfPageView
              key={`${currentPage}-${rotation}-${zoom}`}
              pdfDoc={pdfDoc}
              pageNumber={currentPage}
              scale={zoom}
              rotation={rotation}
              className="group shrink-0"
            />
          </div>
        )}
      </div>
    </div>
  )
}

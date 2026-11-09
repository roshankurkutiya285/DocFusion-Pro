import React, { useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy, PDFPageProxy } from '@/services/pdfService'
import { renderPdfPage } from '@/services/pdfService'
import { Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'

interface PdfPageViewProps {
  pdfDoc: PDFDocumentProxy
  pageNumber: number
  scale: number
  rotation: number
  className?: string
  onPageLoaded?: (pageNumber: number, width: number, height: number) => void
}

export const PdfPageView: React.FC<PdfPageViewProps> = ({
  pdfDoc,
  pageNumber,
  scale,
  rotation,
  className,
  onPageLoaded,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState<PDFPageProxy | null>(null)
  const [isRendering, setIsRendering] = useState(true)
  const [pageSize, setPageSize] = useState<{ width: number; height: number }>({
    width: 612 * scale,
    height: 792 * scale,
  })

  // 1. Fetch PDFPageProxy
  useEffect(() => {
    let isCancelled = false

    const fetchPage = async () => {
      try {
        const p = await pdfDoc.getPage(pageNumber)
        if (!isCancelled) {
          setPage(p)
          const viewport = p.getViewport({ scale: 1.0, rotation })
          setPageSize({ width: viewport.width * scale, height: viewport.height * scale })
          onPageLoaded?.(pageNumber, viewport.width, viewport.height)
        }
      } catch (err) {
        console.error(`Failed to get page ${pageNumber}`, err)
      }
    }

    fetchPage()

    return () => {
      isCancelled = true
    }
  }, [pdfDoc, pageNumber, rotation, scale, onPageLoaded])

  // 2. Render Page to Canvas
  useEffect(() => {
    if (!page || !canvasRef.current) return

    let isMounted = true
    setIsRendering(true)

    const render = async () => {
      try {
        if (canvasRef.current) {
          await renderPdfPage(page, canvasRef.current, scale, rotation)
        }
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'name' in err && err.name !== 'RenderingCancelledException') {
          console.error(`Error rendering page ${pageNumber}`, err)
        }
      } finally {
        if (isMounted) {
          setIsRendering(false)
        }
      }
    }

    render()

    return () => {
      isMounted = false
    }
  }, [page, scale, rotation, pageNumber])

  return (
    <div
      ref={containerRef}
      data-page-number={pageNumber}
      className={cn(
        'relative bg-white text-slate-900 shadow-xl transition-shadow duration-200 select-none border border-slate-200/80 dark:border-slate-800 rounded-sm overflow-hidden shrink-0',
        className
      )}
      style={{
        width: `${pageSize.width}px`,
        height: `${pageSize.height}px`,
        minWidth: `${pageSize.width}px`,
        minHeight: `${pageSize.height}px`,
      }}
    >
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="block shrink-0"
        style={{
          width: `${pageSize.width}px`,
          height: `${pageSize.height}px`,
        }}
      />

      {/* Loading Overlay */}
      {isRendering && (
        <div className="absolute inset-0 bg-white/60 dark:bg-slate-950/40 backdrop-blur-[1px] flex items-center justify-center z-10 transition-opacity">
          <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
        </div>
      )}

      {/* Page Number Watermark Badge */}
      <div className="absolute bottom-2 right-2 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white/80 dark:bg-slate-900/80 rounded border border-slate-200/50 dark:border-slate-800/50 shadow-xs pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        {pageNumber}
      </div>
    </div>
  )
}

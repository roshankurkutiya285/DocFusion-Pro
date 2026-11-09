import React, { useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy } from '@/services/pdfService'
import { renderThumbnail } from '@/services/pdfService'
import { useDocumentStore } from '@/stores/useDocumentStore'
import { useAppStore } from '@/stores/useAppStore'
import { deletePages, duplicatePages, rotatePages, toArrayBuffer } from '@/services/organizeService'
import { RotateCw, Copy, Trash2 } from 'lucide-react'
import { cn } from '@/utils/cn'

interface ThumbnailItemProps {
  pdfDoc: PDFDocumentProxy
  pageNumber: number
  isActive: boolean
  rotation: number
  canDelete: boolean
  onClick: () => void
  onDelete: () => void
  onDuplicate: () => void
  onRotate: () => void
}

const ThumbnailItem: React.FC<ThumbnailItemProps> = ({
  pdfDoc,
  pageNumber,
  isActive,
  rotation,
  canDelete,
  onClick,
  onDelete,
  onDuplicate,
  onRotate,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [rendered, setRendered] = useState(false)

  useEffect(() => {
    let isCancelled = false

    const render = async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber)
        if (!isCancelled && canvasRef.current) {
          await renderThumbnail(page, canvasRef.current, 130, rotation)
          setRendered(true)
        }
      } catch (err) {
        console.error(`Failed to render thumbnail for page ${pageNumber}`, err)
      }
    }

    render()

    return () => {
      isCancelled = true
    }
  }, [pdfDoc, pageNumber, rotation])

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative flex flex-col items-center p-2 rounded-lg cursor-pointer transition-all duration-150',
        isActive
          ? 'bg-brand-50/80 dark:bg-brand-950/60 ring-2 ring-brand-500'
          : 'hover:bg-slate-100 dark:hover:bg-slate-800/60'
      )}
    >
      <div
        className={cn(
          'relative bg-white shadow-sm border rounded-sm overflow-hidden flex items-center justify-center transition-transform group-hover:scale-[1.02]',
          isActive
            ? 'border-brand-500 shadow-md'
            : 'border-slate-300 dark:border-slate-700'
        )}
        style={{ minHeight: '120px', minWidth: '90px' }}
      >
        <canvas ref={canvasRef} className="block w-full h-auto" />
        {!rendered && (
          <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 animate-pulse" />
        )}

        {/* Hover Quick Action Buttons (Rotate, Duplicate, Delete) */}
        <div className="absolute top-1 right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/90 text-white rounded p-0.5 shadow-lg z-10 backdrop-blur-xs">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onRotate()
            }}
            className="p-1 rounded text-slate-300 hover:text-white hover:bg-white/20 transition-colors"
            title={`Rotate Page ${pageNumber} (+90°)`}
          >
            <RotateCw className="w-2.5 h-2.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDuplicate()
            }}
            className="p-1 rounded text-slate-300 hover:text-white hover:bg-white/20 transition-colors"
            title={`Duplicate Page ${pageNumber}`}
          >
            <Copy className="w-2.5 h-2.5" />
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="p-1 rounded text-rose-400 hover:text-white hover:bg-rose-600 transition-colors"
              title={`Delete Page ${pageNumber}`}
            >
              <Trash2 className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      </div>

      <span
        className={cn(
          'text-[11px] font-medium mt-1.5 font-mono px-2 py-0.5 rounded',
          isActive
            ? 'text-brand-600 dark:text-brand-400 font-bold bg-brand-100/60 dark:bg-brand-900/40'
            : 'text-slate-500 dark:text-slate-400'
        )}
      >
        Page {pageNumber}
      </span>
    </div>
  )
}

export const ThumbnailPanel: React.FC = () => {
  const {
    fileName,
    pdfDoc,
    numPages,
    currentPage,
    rotation,
    commitBuffer,
    setCurrentPage,
    getSafeFileData,
  } = useDocumentStore()
  const { addToast } = useAppStore()

  if (!pdfDoc || numPages === 0) {
    return null
  }

  const pages = Array.from({ length: numPages }, (_, i) => i + 1)

  const handleSelectPage = (pageNumber: number) => {
    setCurrentPage(pageNumber)

    // Scroll to page element if in continuous mode
    const pageElement = document.querySelector(`[data-page-number="${pageNumber}"]`)
    if (pageElement) {
      pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handleDeletePage = async (pageNumber: number) => {
    if (numPages <= 1) {
      addToast({
        title: 'Cannot Delete Page',
        message: 'A PDF document must contain at least one page.',
        type: 'warning',
      })
      return
    }

    try {
      const pageIndex = pageNumber - 1
      const safeBuffer = await getSafeFileData()
      const newBytes = await deletePages(safeBuffer, [pageIndex])
      const newNumPages = numPages - 1
      const nextCurrentPage = currentPage > newNumPages ? newNumPages : currentPage

      await commitBuffer(
        toArrayBuffer(newBytes),
        fileName || 'document.pdf',
        `Delete Page ${pageNumber}`
      )
      setCurrentPage(nextCurrentPage)

      addToast({
        title: 'Page Deleted',
        message: `Page ${pageNumber} was removed from the document.`,
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

  const handleDuplicatePage = async (pageNumber: number) => {
    try {
      const pageIndex = pageNumber - 1
      const safeBuffer = await getSafeFileData()
      const newBytes = await duplicatePages(safeBuffer, [pageIndex])
      await commitBuffer(
        toArrayBuffer(newBytes),
        fileName || 'document.pdf',
        `Duplicate Page ${pageNumber}`
      )
      addToast({
        title: 'Page Duplicated',
        message: `Duplicated Page ${pageNumber}.`,
        type: 'success',
      })
    } catch (err) {
      addToast({
        title: 'Duplicate Failed',
        message: err instanceof Error ? err.message : 'Failed to duplicate page',
        type: 'error',
      })
    }
  }

  const handleRotatePage = async (pageNumber: number) => {
    try {
      const pageIndex = pageNumber - 1
      const safeBuffer = await getSafeFileData()
      const newBytes = await rotatePages(safeBuffer, [pageIndex], 90)
      await commitBuffer(
        toArrayBuffer(newBytes),
        fileName || 'document.pdf',
        `Rotate Page ${pageNumber}`
      )
      addToast({
        title: 'Page Rotated',
        message: `Page ${pageNumber} rotated 90°.`,
        type: 'success',
      })
    } catch (err) {
      addToast({
        title: 'Rotate Failed',
        message: err instanceof Error ? err.message : 'Failed to rotate page',
        type: 'error',
      })
    }
  }

  return (
    <div className="flex flex-col gap-2 p-1 overflow-y-auto">
      {pages.map((pageNum) => (
        <ThumbnailItem
          key={pageNum}
          pdfDoc={pdfDoc}
          pageNumber={pageNum}
          isActive={currentPage === pageNum}
          rotation={rotation}
          canDelete={numPages > 1}
          onClick={() => handleSelectPage(pageNum)}
          onDelete={() => handleDeletePage(pageNum)}
          onDuplicate={() => handleDuplicatePage(pageNum)}
          onRotate={() => handleRotatePage(pageNum)}
        />
      ))}
    </div>
  )
}

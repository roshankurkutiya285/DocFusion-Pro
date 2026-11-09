import React, { useEffect, useRef } from 'react'
import type { PDFDocumentProxy } from '@/services/pdfService'
import { renderThumbnail } from '@/services/pdfService'
import { IconButton } from '@/components/ui/IconButton'
import { RotateCw, Trash2, Copy, ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { cn } from '@/utils/cn'

interface OrganizePageCardProps {
  pdfDoc: PDFDocumentProxy
  pageIndex: number // 0-indexed
  isSelected: boolean
  isFirst: boolean
  isLast: boolean
  onToggleSelect: (pageIndex: number) => void
  onRotate: (pageIndex: number) => void
  onDelete: (pageIndex: number) => void
  onDuplicate: (pageIndex: number) => void
  onMoveLeft: (pageIndex: number) => void
  onMoveRight: (pageIndex: number) => void
}

export const OrganizePageCard: React.FC<OrganizePageCardProps> = ({
  pdfDoc,
  pageIndex,
  isSelected,
  isFirst,
  isLast,
  onToggleSelect,
  onRotate,
  onDelete,
  onDuplicate,
  onMoveLeft,
  onMoveRight,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pageNumber = pageIndex + 1

  useEffect(() => {
    let isCancelled = false

    const render = async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber)
        if (!isCancelled && canvasRef.current) {
          await renderThumbnail(page, canvasRef.current, 160)
        }
      } catch (err) {
        console.error(`Thumbnail render failed for page ${pageNumber}`, err)
      }
    }

    render()

    return () => {
      isCancelled = true
    }
  }, [pdfDoc, pageNumber])

  return (
    <div
      className={cn(
        'group relative bg-white dark:bg-slate-900 rounded-xl border p-3 shadow-sm transition-all duration-150 flex flex-col items-center select-none',
        isSelected
          ? 'border-brand-500 ring-2 ring-brand-500/40 bg-brand-50/20 dark:bg-brand-950/20 shadow-md'
          : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600'
      )}
    >
      {/* Top Header: Select Checkbox & Page Number */}
      <div className="w-full flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => onToggleSelect(pageIndex)}
          className={cn(
            'w-5 h-5 rounded border flex items-center justify-center transition-colors',
            isSelected
              ? 'bg-brand-600 border-brand-600 text-white'
              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-brand-500'
          )}
        >
          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
        </button>

        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          Page {pageNumber}
        </span>
      </div>

      {/* Thumbnail Preview Area */}
      <div
        onClick={() => onToggleSelect(pageIndex)}
        className="w-full flex items-center justify-center bg-slate-100 dark:bg-slate-950 rounded-lg p-2 min-h-[160px] cursor-pointer overflow-hidden border border-slate-200/60 dark:border-slate-800/60"
      >
        <canvas ref={canvasRef} className="max-w-full max-h-[160px] object-contain shadow-xs rounded-xs" />
      </div>

      {/* Bottom Action Controls */}
      <div className="w-full flex items-center justify-between pt-2.5 mt-1 border-t border-slate-100 dark:border-slate-800">
        {/* Reorder Move Buttons */}
        <div className="flex items-center gap-0.5">
          <IconButton
            size="xs"
            tooltip="Move Left"
            disabled={isFirst}
            onClick={() => onMoveLeft(pageIndex)}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </IconButton>
          <IconButton
            size="xs"
            tooltip="Move Right"
            disabled={isLast}
            onClick={() => onMoveRight(pageIndex)}
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </IconButton>
        </div>

        {/* Rotate, Duplicate, Delete */}
        <div className="flex items-center gap-0.5">
          <IconButton
            size="xs"
            tooltip="Rotate +90°"
            onClick={() => onRotate(pageIndex)}
          >
            <RotateCw className="w-3.5 h-3.5" />
          </IconButton>
          <IconButton
            size="xs"
            tooltip="Duplicate"
            onClick={() => onDuplicate(pageIndex)}
          >
            <Copy className="w-3.5 h-3.5" />
          </IconButton>
          <IconButton
            size="xs"
            variant="danger"
            tooltip="Delete Page"
            onClick={() => onDelete(pageIndex)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </IconButton>
        </div>
      </div>
    </div>
  )
}

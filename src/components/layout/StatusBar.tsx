import React, { useState, useEffect } from 'react'
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  Rows,
  Square,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react'
import { useDocumentStore } from '@/stores/useDocumentStore'
import { IconButton } from '@/components/ui/IconButton'
import { Slider } from '@/components/ui/Slider'
import { formatZoom } from '@/utils/formatters'

export const StatusBar: React.FC = () => {
  const {
    currentPage,
    numPages,
    zoom,
    viewMode,
    isReady,
    setCurrentPage,
    nextPage,
    prevPage,
    zoomIn,
    zoomOut,
    setZoom,
    setFitMode,
    setViewMode,
  } = useDocumentStore()

  const [inputPage, setInputPage] = useState(currentPage.toString())

  useEffect(() => {
    setInputPage(currentPage.toString())
  }, [currentPage])

  const handlePageCommit = () => {
    const p = parseInt(inputPage, 10)
    if (!isNaN(p)) {
      setCurrentPage(p)
    } else {
      setInputPage(currentPage.toString())
    }
  }

  return (
    <footer className="h-8 border-t border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 px-3 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 select-none z-30 shrink-0">
      {/* Left: Page Navigation */}
      <div className="flex items-center gap-1.5">
        <IconButton
          size="xs"
          tooltip="Previous Page"
          shortcut="PageUp"
          disabled={!isReady || currentPage <= 1}
          onClick={prevPage}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </IconButton>

        <div className="flex items-center gap-1 font-mono">
          <input
            type="text"
            value={inputPage}
            disabled={!isReady}
            onChange={(e) => setInputPage(e.target.value)}
            onBlur={handlePageCommit}
            onKeyDown={(e) => e.key === 'Enter' && handlePageCommit()}
            className="w-8 h-5 text-center text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-40"
          />
          <span className="text-slate-400">/</span>
          <span>{numPages > 0 ? numPages : 1}</span>
        </div>

        <IconButton
          size="xs"
          tooltip="Next Page"
          shortcut="PageDown"
          disabled={!isReady || (numPages > 0 && currentPage >= numPages)}
          onClick={nextPage}
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </IconButton>

        <div className="h-3.5 w-px bg-slate-300 dark:bg-slate-800 mx-1 hidden sm:block" />

        <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Local Engine • 100% Client-side</span>
        </div>
      </div>

      {/* Right: View Mode & Zoom Controls */}
      <div className="flex items-center gap-2">
        {/* Single Page vs Continuous Toggle */}
        <div className="flex items-center bg-slate-200 dark:bg-slate-900 p-0.5 rounded">
          <IconButton
            size="xs"
            tooltip="Single Page"
            isActive={viewMode === 'single'}
            onClick={() => setViewMode('single')}
          >
            <Square className="w-3 h-3" />
          </IconButton>
          <IconButton
            size="xs"
            tooltip="Continuous Scroll"
            isActive={viewMode === 'continuous'}
            onClick={() => setViewMode('continuous')}
          >
            <Rows className="w-3 h-3" />
          </IconButton>
        </div>

        <div className="h-3.5 w-px bg-slate-300 dark:bg-slate-800 mx-1" />

        {/* Fit Width / Fit Page */}
        <IconButton
          size="xs"
          tooltip="Fit to Page"
          onClick={() => setFitMode('page')}
          disabled={!isReady}
        >
          <FileText className="w-3.5 h-3.5" />
        </IconButton>

        <IconButton
          size="xs"
          tooltip="Fit to Width"
          onClick={() => setFitMode('width')}
          disabled={!isReady}
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </IconButton>

        <div className="h-3.5 w-px bg-slate-300 dark:bg-slate-800 mx-1" />

        {/* Zoom Slider */}
        <div className="flex items-center gap-1.5">
          <IconButton
            size="xs"
            tooltip="Zoom Out"
            shortcut="Ctrl+-"
            disabled={!isReady}
            onClick={zoomOut}
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </IconButton>

          <Slider
            min={0.25}
            max={3.0}
            step={0.05}
            value={zoom}
            disabled={!isReady}
            onChange={(val) => setZoom(val)}
            className="w-20 sm:w-28"
          />

          <IconButton
            size="xs"
            tooltip="Zoom In"
            shortcut="Ctrl++"
            disabled={!isReady}
            onClick={zoomIn}
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </IconButton>

          <span
            className="w-11 text-right font-mono text-[11px] font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:underline"
            onClick={() => setZoom(1.0)}
            title="Click to reset zoom to 100%"
          >
            {formatZoom(zoom)}
          </span>
        </div>
      </div>
    </footer>
  )
}

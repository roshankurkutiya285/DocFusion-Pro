import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Home,
  Eye,
  Grid,
  Edit3,
  Stamp,
  RefreshCw,
  CheckCircle,
  Cpu,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCw,
  RotateCcw,
  Rows,
  Square,
  FilePlus,
  Scissors,
  Copy,
  Trash2,
  Highlighter,
  Image as ImageIcon,
  Type,
  FileText,
  Layers,
  Zap,
  GitCompare,
  FileCode,
  ShieldAlert,
  Lock,
  History,
  Keyboard,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useDocumentStore } from '@/stores/useDocumentStore'
import { IconButton } from '@/components/ui/IconButton'

interface TabItem {
  id: string
  label: string
  path: string
  icon: React.ElementType
}

const TABS: TabItem[] = [
  { id: 'home', label: 'Home', path: '/', icon: Home },
  { id: 'view', label: 'View', path: '/viewer', icon: Eye },
  { id: 'organize', label: 'Organize', path: '/organize', icon: Grid },
  { id: 'edit', label: 'Edit', path: '/edit', icon: Edit3 },
  { id: 'stamp', label: 'Stamp', path: '/stamp', icon: Stamp },
  { id: 'convert', label: 'Convert', path: '/convert', icon: RefreshCw },
  { id: 'finish', label: 'Finish', path: '/finish', icon: CheckCircle },
  { id: 'advanced', label: 'Advanced', path: '/advanced', icon: Cpu },
]

export const RibbonBar: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const currentPath = location.pathname

  const {
    zoomIn,
    zoomOut,
    rotateClockwise,
    rotateCounterClockwise,
    resetZoom,
    setFitMode,
    fitMode,
    viewMode,
    setViewMode,
    isReady,
  } = useDocumentStore()

  return (
    <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 select-none">
      {/* Top Tab Strip */}
      <div
        role="tablist"
        aria-label="Application Navigation Tabs"
        className="flex items-center px-2 pt-1 gap-1 border-b border-slate-200/80 dark:border-slate-800/80 overflow-x-auto no-scrollbar"
      >
        {TABS.map((tab) => {
          const isActive =
            tab.path === '/'
              ? currentPath === '/'
              : currentPath.startsWith(tab.path)
          const Icon = tab.icon

          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-label={tab.label}
              onClick={() => navigate(tab.path)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t-md transition-all duration-150 shrink-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
                isActive
                  ? 'bg-white dark:bg-slate-950 text-brand-600 dark:text-brand-400 border-t border-x border-slate-200 dark:border-slate-800 shadow-xs -mb-[1px] font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Dynamic Ribbon Command Shelf depending on active category */}
      <div className="h-11 px-3 flex items-center justify-between overflow-x-auto bg-white/70 dark:bg-slate-950/70">
        {/* Left: Category-specific action buttons */}
        <div className="flex items-center gap-2">
          {currentPath.startsWith('/viewer') && (
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1.5">
                Viewer Tools
              </span>
              <IconButton
                size="sm"
                tooltip="Zoom In"
                shortcut="Ctrl++"
                onClick={zoomIn}
                disabled={!isReady}
              >
                <ZoomIn className="w-4 h-4" />
              </IconButton>
              <IconButton
                size="sm"
                tooltip="Zoom Out"
                shortcut="Ctrl+-"
                onClick={zoomOut}
                disabled={!isReady}
              >
                <ZoomOut className="w-4 h-4" />
              </IconButton>
              <IconButton
                size="sm"
                tooltip="Actual Size (100%)"
                shortcut="Ctrl+0"
                onClick={resetZoom}
                disabled={!isReady}
              >
                <span className="text-[11px] font-semibold">1:1</span>
              </IconButton>

              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

              <IconButton
                size="sm"
                tooltip="Fit to Width"
                isActive={fitMode === 'width'}
                onClick={() => setFitMode('width')}
                disabled={!isReady}
              >
                <Maximize2 className="w-4 h-4" />
              </IconButton>
              <IconButton
                size="sm"
                tooltip="Fit to Page"
                isActive={fitMode === 'page'}
                onClick={() => setFitMode('page')}
                disabled={!isReady}
              >
                <Minimize2 className="w-4 h-4" />
              </IconButton>

              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

              <IconButton
                size="sm"
                tooltip="Continuous Scroll"
                isActive={viewMode === 'continuous'}
                onClick={() => setViewMode('continuous')}
                disabled={!isReady}
              >
                <Rows className="w-4 h-4" />
              </IconButton>
              <IconButton
                size="sm"
                tooltip="Single Page View"
                isActive={viewMode === 'single'}
                onClick={() => setViewMode('single')}
                disabled={!isReady}
              >
                <Square className="w-4 h-4" />
              </IconButton>

              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

              <IconButton
                size="sm"
                tooltip="Rotate Counter-Clockwise"
                onClick={rotateCounterClockwise}
                disabled={!isReady}
              >
                <RotateCcw className="w-4 h-4" />
              </IconButton>
              <IconButton
                size="sm"
                tooltip="Rotate Clockwise"
                shortcut="Ctrl+Shift+R"
                onClick={rotateClockwise}
                disabled={!isReady}
              >
                <RotateCw className="w-4 h-4" />
              </IconButton>
            </div>
          )}

          {currentPath.startsWith('/organize') && (
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1.5">
                Page Tools
              </span>
              <IconButton size="sm" tooltip="Insert Blank Page" onClick={() => navigate('/organize')} disabled={!isReady}>
                <FilePlus className="w-4 h-4" />
              </IconButton>
              <IconButton size="sm" tooltip="Split Document" onClick={() => navigate('/organize')} disabled={!isReady}>
                <Scissors className="w-4 h-4" />
              </IconButton>
              <IconButton size="sm" tooltip="Duplicate Selected" onClick={() => navigate('/organize')} disabled={!isReady}>
                <Copy className="w-4 h-4" />
              </IconButton>
              <IconButton size="sm" tooltip="Delete Selected" variant="danger" onClick={() => navigate('/organize')} disabled={!isReady}>
                <Trash2 className="w-4 h-4" />
              </IconButton>
            </div>
          )}

          {currentPath.startsWith('/edit') && (
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1.5">
                Editor Tools
              </span>
              <IconButton size="sm" tooltip="Add Text" onClick={() => navigate('/edit')} disabled={!isReady}>
                <Type className="w-4 h-4" />
              </IconButton>
              <IconButton size="sm" tooltip="Add Image" onClick={() => navigate('/edit')} disabled={!isReady}>
                <ImageIcon className="w-4 h-4" />
              </IconButton>
              <IconButton size="sm" tooltip="Highlight Text" onClick={() => navigate('/edit')} disabled={!isReady}>
                <Highlighter className="w-4 h-4" />
              </IconButton>
            </div>
          )}

          {currentPath.startsWith('/stamp') && (
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1.5">
                Stamp Tools
              </span>
              <IconButton size="sm" tooltip="Watermark" onClick={() => navigate('/stamp')} disabled={!isReady}>
                <Stamp className="w-4 h-4" />
              </IconButton>
              <IconButton size="sm" tooltip="Page Numbers" onClick={() => navigate('/stamp')} disabled={!isReady}>
                <span className="text-xs font-bold font-mono">#1</span>
              </IconButton>
            </div>
          )}

          {currentPath.startsWith('/convert') && (
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1.5">
                Format Conversion
              </span>
              <IconButton size="sm" tooltip="Images to PDF" onClick={() => navigate('/convert')}>
                <ImageIcon className="w-4 h-4" />
              </IconButton>
              <IconButton size="sm" tooltip="PDF to Images" onClick={() => navigate('/convert')}>
                <Layers className="w-4 h-4" />
              </IconButton>
              <IconButton size="sm" tooltip="PDF to Text" onClick={() => navigate('/convert')}>
                <FileText className="w-4 h-4" />
              </IconButton>
            </div>
          )}

          {currentPath.startsWith('/finish') && (
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1.5">
                Finish & Optimization
              </span>
              <IconButton size="sm" tooltip="Compress PDF" onClick={() => navigate('/finish')}>
                <Zap className="w-4 h-4" />
              </IconButton>
              <IconButton size="sm" tooltip="Compare PDFs" onClick={() => navigate('/finish')}>
                <GitCompare className="w-4 h-4" />
              </IconButton>
              <IconButton size="sm" tooltip="Edit Metadata" onClick={() => navigate('/finish')}>
                <FileCode className="w-4 h-4" />
              </IconButton>
              <IconButton size="sm" tooltip="Remove Metadata" onClick={() => navigate('/finish')}>
                <ShieldAlert className="w-4 h-4" />
              </IconButton>
            </div>
          )}

          {currentPath.startsWith('/advanced') && (
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1.5">
                Advanced Tools
              </span>
              <IconButton size="sm" tooltip="Password Security" onClick={() => navigate('/advanced')}>
                <Lock className="w-4 h-4" />
              </IconButton>
              <IconButton size="sm" tooltip="OCR Engine" onClick={() => navigate('/advanced')}>
                <Cpu className="w-4 h-4" />
              </IconButton>
              <IconButton size="sm" tooltip="Undo / Redo History" onClick={() => navigate('/advanced')}>
                <History className="w-4 h-4" />
              </IconButton>
              <IconButton size="sm" tooltip="Keyboard Shortcuts" onClick={() => navigate('/advanced')}>
                <Keyboard className="w-4 h-4" />
              </IconButton>
            </div>
          )}

          {currentPath === '/' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Welcome to DocFusion Pro • Select a document or tool above to begin
              </span>
            </div>
          )}
        </div>

        {/* Right status hint */}
        <div className="flex items-center text-[11px] text-slate-400 dark:text-slate-500 font-mono">
          <span>Ready</span>
        </div>
      </div>
    </div>
  )
}

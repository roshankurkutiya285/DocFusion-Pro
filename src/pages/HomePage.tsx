import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  UploadCloud,
  FileText,
  Clock,
  Trash2,
  Eye,
  Grid,
  Edit3,
  Stamp,
  RefreshCw,
  ShieldCheck,
  Zap,
  FolderOpen,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { useDocumentStore } from '@/stores/useDocumentStore'
import { useAppStore } from '@/stores/useAppStore'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { formatFileSize, formatDate } from '@/utils/formatters'
import { cn } from '@/utils/cn'

export const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const { loadDocument, loadSampleDocument } = useDocumentStore()
  const { recentDocuments, removeRecentDocument, clearRecentDocuments } = useAppStore()

  const handleFileSelect = (file: File) => {
    if (file && file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      loadDocument(file)
      navigate('/viewer')
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileSelect(file)
  }

  const featureCards = [
    {
      title: 'PDF Viewer',
      desc: 'High-speed offline viewer with continuous scroll, thumbnails, and precise zoom controls.',
      icon: Eye,
      path: '/viewer',
      phase: 'Phase 2',
      color: 'from-blue-500 to-indigo-600',
    },
    {
      title: 'Organize Pages',
      desc: 'Merge documents, split pages, reorder visually, rotate, duplicate, or extract pages.',
      icon: Grid,
      path: '/organize',
      phase: 'Phase 3',
      color: 'from-emerald-500 to-teal-600',
    },
    {
      title: 'Edit & Annotate',
      desc: 'Add text, modify content, insert images, freehand draw, highlight, and apply signatures.',
      icon: Edit3,
      path: '/edit',
      phase: 'Phase 4',
      color: 'from-violet-500 to-purple-600',
    },
    {
      title: 'Stamp Tools',
      desc: 'Apply custom watermarks, page numbering, headers, footers, and official date stamps.',
      icon: Stamp,
      path: '/stamp',
      phase: 'Phase 5',
      color: 'from-amber-500 to-orange-600',
    },
    {
      title: 'Format Converter',
      desc: 'Convert Images to PDF, extract PDF pages to high-res images, or extract clean text.',
      icon: RefreshCw,
      path: '/convert',
      phase: 'Phase 6',
      color: 'from-cyan-500 to-blue-600',
    },
    {
      title: 'Finish & Compress',
      desc: 'Reduce file size, compare documents, edit document metadata, and password protect.',
      icon: Zap,
      path: '/finish',
      phase: 'Phase 7-8',
      color: 'from-rose-500 to-pink-600',
    },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={handleInputChange}
        className="hidden"
      />

      <div className="max-w-6xl mx-auto space-y-8">
        {/* Hero Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 group bg-white dark:bg-slate-900/60 shadow-sm',
            isDragOver
              ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20 scale-[0.99]'
              : 'border-slate-300 dark:border-slate-800 hover:border-brand-400 dark:hover:border-brand-600'
          )}
        >
          <div className="flex flex-col items-center max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-950/80 border border-brand-200 dark:border-brand-800/80 flex items-center justify-center text-brand-600 dark:text-brand-400 mb-4 group-hover:scale-110 transition-transform shadow-inner">
              <UploadCloud className="w-8 h-8" />
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Drop your PDF here, or <span className="text-brand-600 dark:text-brand-400">Browse</span>
            </h2>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
              Open any document instantly. Processed 100% locally in your browser with zero server uploads and complete privacy.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="primary"
                size="md"
                leftIcon={<FolderOpen className="w-4 h-4" />}
                onClick={(e) => {
                  e.stopPropagation()
                  fileInputRef.current?.click()
                }}
              >
                Choose PDF File
              </Button>
              <Button
                variant="subtle"
                size="md"
                leftIcon={<Sparkles className="w-4 h-4" />}
                onClick={(e) => {
                  e.stopPropagation()
                  loadSampleDocument()
                  navigate('/viewer')
                }}
              >
                Try Sample PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Feature Modules Quick Launch Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Core Tool Suites
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Modular architecture covering all phases of document processing
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featureCards.map((card) => {
              const Icon = card.icon
              return (
                <Card
                  key={card.title}
                  hoverable
                  onClick={() => navigate(card.path)}
                  className="group relative overflow-hidden"
                >
                  <CardHeader className="flex flex-row items-center gap-3.5 mb-2">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center text-white bg-gradient-to-br shadow-sm shrink-0',
                        card.color
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold truncate">
                          {card.title}
                        </CardTitle>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                          {card.phase}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                      {card.desc}
                    </p>
                    <div className="flex items-center text-xs font-medium text-brand-600 dark:text-brand-400 group-hover:translate-x-1 transition-transform">
                      <span>Launch Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Recent Files Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Recent Documents
              </h3>
            </div>
            {recentDocuments.length > 0 && (
              <Button
                variant="ghost"
                size="xs"
                onClick={clearRecentDocuments}
                leftIcon={<Trash2 className="w-3.5 h-3.5 text-slate-400" />}
              >
                Clear History
              </Button>
            )}
          </div>

          {recentDocuments.length === 0 ? (
            <div className="text-center py-10 bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
              <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                No recent documents yet
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                Opened documents will appear here for fast re-access.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-brand-400 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded bg-brand-50 dark:bg-brand-950/60 flex items-center justify-center text-brand-600 dark:text-brand-400 shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {doc.name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {formatFileSize(doc.size)} • {formatDate(doc.lastOpened)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeRecentDocument(doc.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition-opacity"
                    title="Remove from history"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security & Offline Guarantee Banner */}
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-900 dark:text-emerald-300">
          <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div className="text-xs">
            <span className="font-semibold">Offline Privacy Guaranteed:</span> All PDF
            rendering, organizing, editing, and transformations occur strictly in-memory on your local device. No document data leaves your computer.
          </div>
        </div>
      </div>
    </div>
  )
}

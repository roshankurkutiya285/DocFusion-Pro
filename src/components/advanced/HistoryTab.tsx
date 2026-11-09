import React from 'react'
import {
  Undo,
  Redo,
  Clock,
  Trash2,
  CheckCircle2,
  History,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { useDocumentStore } from '@/stores/useDocumentStore'

export const HistoryTab: React.FC = () => {
  const {
    undoStack,
    redoStack,
    canUndo,
    canRedo,
    undo,
    redo,
    clearHistory,
    fileName,
    fileSize,
    isReady,
  } = useDocumentStore()

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const formatTime = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000)
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-6">
      {/* Header & Quick Undo/Redo Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span>Document Revision Timeline</span>
              <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-600 dark:text-slate-400">
                {undoStack.length} Undo Step{undoStack.length === 1 ? '' : 's'} • {redoStack.length} Redo Step{redoStack.length === 1 ? '' : 's'}
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Effortlessly revert any edit or restore future states with step-by-step history tracking.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Undo className="w-3.5 h-3.5" />}
            disabled={!canUndo}
            onClick={undo}
          >
            Undo (Ctrl+Z)
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Redo className="w-3.5 h-3.5" />}
            disabled={!canRedo}
            onClick={redo}
          >
            Redo (Ctrl+Y)
          </Button>
          {(undoStack.length > 0 || redoStack.length > 0) && (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
              onClick={clearHistory}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Timeline View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Revision Stack
          </h4>

          {undoStack.length === 0 && redoStack.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl bg-white/40 dark:bg-slate-900/40">
              <History className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-40" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                No Edit History Yet
              </p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Modifications made via Organize, Edit, Stamp, or Conversion tools will appear here in chronological order.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Past Actions (Undo Stack) */}
              {undoStack.map((entry, index) => (
                <div
                  key={`undo-${index}-${entry.timestamp}`}
                  className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center text-xs font-bold text-slate-400">
                      #{index + 1}
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {entry.description}
                      </p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>{formatTime(entry.timestamp)}</span>
                        <span>•</span>
                        <span>{formatBytes(entry.buffer.byteLength)}</span>
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    Past Revision
                  </span>
                </div>
              ))}

              {/* CURRENT ACTIVE STATE */}
              {isReady && (
                <div className="flex items-center justify-between p-3 bg-brand-50/80 dark:bg-brand-950/60 rounded-xl border-2 border-brand-500 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-brand-900 dark:text-brand-100">
                        Current Document State ({fileName || 'active'})
                      </p>
                      <p className="text-[10px] text-brand-600 dark:text-brand-400 mt-0.5">
                        Live workspace • {formatBytes(fileSize)}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-brand-600 text-white shadow-xs">
                    Current Active
                  </span>
                </div>
              )}

              {/* Future Actions (Redo Stack) */}
              {redoStack.map((entry, index) => (
                <div
                  key={`redo-${index}-${entry.timestamp}`}
                  className="flex items-center justify-between p-3 bg-slate-50/60 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 opacity-70 hover:opacity-100 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center text-xs font-bold text-slate-400">
                      +{index + 1}
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {entry.description}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Available for Redo
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                    Redo Branch
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Info Card */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3 text-xs">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-2">
                Undo/Redo Keybindings
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-slate-600 dark:text-slate-300">Revert Last Edit</span>
                  <kbd className="px-2 py-0.5 rounded bg-white dark:bg-slate-700 border font-mono text-[11px] shadow-xs">
                    Ctrl + Z
                  </kbd>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-slate-600 dark:text-slate-300">Restore Reverted Edit</span>
                  <kbd className="px-2 py-0.5 rounded bg-white dark:bg-slate-700 border font-mono text-[11px] shadow-xs">
                    Ctrl + Y
                  </kbd>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                The history stack retains up to 25 full snapshots in local memory, enabling non-destructive document modifications.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

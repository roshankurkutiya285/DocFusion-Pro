import React, { useState, useEffect } from 'react'
import {
  Clock,
  Save,
  Trash2,
  FolderOpen,
  Search,
  CheckCircle2,
  RefreshCw,
  HardDrive,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { useAppStore } from '@/stores/useAppStore'
import { useDocumentStore } from '@/stores/useDocumentStore'
import { useNavigate } from 'react-router-dom'
import {
  getAutosaveSession,
  clearAutosaveSession,
  saveAutosaveSession,
  type AutosaveSession,
} from '@/services/autosaveService'

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

const formatTime = (ts: number) => {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} hour(s) ago`
  return new Date(ts).toLocaleDateString()
}

export const RecentAutosaveTab: React.FC = () => {
  const navigate = useNavigate()
  const {
    recentDocuments,
    removeRecentDocument,
    clearRecentDocuments,
    addToast,
  } = useAppStore()

  const { fileData, fileName, loadBuffer, lastAutosaved, getSafeFileData } = useDocumentStore()

  const [search, setSearch] = useState('')
  const [persistedSession, setPersistedSession] = useState<AutosaveSession | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(false)

  // Probe IndexedDB for any stored autosave session
  const checkSession = async () => {
    setIsLoadingSession(true)
    try {
      const session = await getAutosaveSession()
      setPersistedSession(session)
    } finally {
      setIsLoadingSession(false)
    }
  }

  useEffect(() => {
    checkSession()
  }, [])

  // Restore session
  const handleRestoreSession = async () => {
    if (!persistedSession) return
    await loadBuffer(persistedSession.buffer, persistedSession.fileName)
    addToast({
      type: 'success',
      title: 'Session Restored',
      message: `Restored ${persistedSession.fileName} from autosaved backup.`,
    })
    navigate('/')
  }

  // Clear session
  const handleDiscardSession = async () => {
    await clearAutosaveSession()
    setPersistedSession(null)
    addToast({
      type: 'info',
      title: 'Session Discarded',
      message: 'Persisted autosave backup has been cleared.',
    })
  }

  // Trigger manual autosave
  const handleManualAutosave = async () => {
    try {
      const safeBuffer = await getSafeFileData()
      if (!fileName) throw new Error('No filename')

      await saveAutosaveSession({
        buffer: safeBuffer,
        fileName,
        timestamp: Date.now(),
        description: 'Manual autosave checkpoint',
      })
      await checkSession()
      addToast({
        type: 'success',
        title: 'Autosave Complete',
        message: 'Current document session persisted to local storage.',
      })
    } catch {
      addToast({
        type: 'warning',
        title: 'No Document',
        message: 'Load a document first to save a session.',
      })
    }
  }


  const filteredRecents = recentDocuments.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span>Local Cache & Session Recovery</span>
              <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                IndexedDB Active
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Manage recently accessed documents and automatic session backups.
            </p>
          </div>
        </div>

        {fileData && (
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Save className="w-3.5 h-3.5" />}
            onClick={handleManualAutosave}
          >
            Trigger Autosave Now
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Files List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                Recent Files Cache ({recentDocuments.length})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-48">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search recents..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>
              {recentDocuments.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
                  onClick={clearRecentDocuments}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          {filteredRecents.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl bg-white/40 dark:bg-slate-900/40">
              <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-40" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                No Recent Documents
              </p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Documents opened, converted, or edited in DocFusion Pro will be remembered here for instant access.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {filteredRecents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 shrink-0">
                      <FolderOpen className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {doc.name}
                      </p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{formatBytes(doc.size)}</span>
                        {doc.pageCount && <span>• {doc.pageCount} Pages</span>}
                        <span>• Opened {formatTime(doc.lastOpened)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => removeRecentDocument(doc.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded"
                      title="Remove from history"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Col: Autosave Session Recovery */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Autosave Session Recovery
                </span>
                {isLoadingSession && (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
                )}
              </div>

              {persistedSession ? (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold mb-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Saved Session Available</span>
                    </div>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 truncate font-mono">
                      {persistedSession.fileName}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Saved {formatTime(persistedSession.timestamp)} •{' '}
                      {formatBytes(persistedSession.buffer.byteLength)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full justify-center text-xs"
                      onClick={handleRestoreSession}
                    >
                      Restore Saved Session
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-center text-xs text-rose-500"
                      onClick={handleDiscardSession}
                    >
                      Discard Session
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
                    Autosave stores your live document modifications into local browser IndexedDB storage so you never lose work if a tab is closed.
                  </p>
                  {lastAutosaved ? (
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span>Last Autosave: {formatTime(lastAutosaved)}</span>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-400">
                      Autosaves automatically upon each document change.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

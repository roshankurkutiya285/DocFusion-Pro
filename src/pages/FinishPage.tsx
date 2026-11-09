import React, { useState } from 'react'
import {
  Zap,
  GitCompare,
  FileCode,
  ShieldAlert,
  CheckCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { useDocumentStore } from '@/stores/useDocumentStore'
import { CompressPdfTab } from '@/components/finish/CompressPdfTab'
import { ComparePdfsTab } from '@/components/finish/ComparePdfsTab'
import { EditMetadataTab } from '@/components/finish/EditMetadataTab'
import { RemoveMetadataTab } from '@/components/finish/RemoveMetadataTab'

type FinishTab = 'compress' | 'compare' | 'editMeta' | 'removeMeta'

export const FinishPage: React.FC = () => {
  const { fileName, isReady } = useDocumentStore()
  const [activeTab, setActiveTab] = useState<FinishTab>('compress')

  const tabItems: Array<{
    id: FinishTab
    label: string
    desc: string
    icon: React.FC<{ className?: string }>
  }> = [
    {
      id: 'compress',
      label: 'Compress PDF',
      desc: 'Optimize embedded image streams and condense internal object trees to minimize file weight.',
      icon: Zap,
    },
    {
      id: 'compare',
      label: 'Compare PDFs',
      desc: 'Run visual pixel-diff heat maps, side-by-side synchronized views, and text change audits.',
      icon: GitCompare,
    },
    {
      id: 'editMeta',
      label: 'Edit Metadata',
      desc: 'Inspect and edit document title, author, subject, keywords, and application catalog tags.',
      icon: FileCode,
    },
    {
      id: 'removeMeta',
      label: 'Remove Metadata',
      desc: 'Sanitize personal user identities, workstation logins, timestamps, and embedded XMP streams.',
      icon: ShieldAlert,
    },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-50/60 dark:bg-slate-950/60">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Finish & Optimization Suite
              </h2>
              <Badge variant="primary">Phase 7</Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Compress file weight, compare document revisions, and manage or sanitize document metadata completely offline.
            </p>
          </div>
          {isReady && (
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Active:</span>
              <strong className="text-slate-900 dark:text-slate-100 font-semibold truncate max-w-[200px]">
                {fileName}
              </strong>
            </div>
          )}
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {tabItems.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                  isActive
                    ? 'border-brand-500 bg-white dark:bg-slate-900 shadow-desktop text-brand-700 dark:text-brand-300 ring-1 ring-brand-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isActive
                      ? 'bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {tab.label}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5 line-clamp-2">
                    {tab.desc}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Tab Content Panes */}
        <div className="mt-4">
          {activeTab === 'compress' && <CompressPdfTab />}
          {activeTab === 'compare' && <ComparePdfsTab />}
          {activeTab === 'editMeta' && <EditMetadataTab />}
          {activeTab === 'removeMeta' && <RemoveMetadataTab />}
        </div>
      </div>
    </div>
  )
}
export default FinishPage

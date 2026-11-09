import React, { useState } from 'react'
import {
  Lock,
  Eye,
  History,
  Keyboard,
  HardDrive,
  Cpu,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { useDocumentStore } from '@/stores/useDocumentStore'
import { SecurityTab } from '@/components/advanced/SecurityTab'
import { OcrTab } from '@/components/advanced/OcrTab'
import { HistoryTab } from '@/components/advanced/HistoryTab'
import { ShortcutsTab } from '@/components/advanced/ShortcutsTab'
import { RecentAutosaveTab } from '@/components/advanced/RecentAutosaveTab'

type AdvancedTab = 'security' | 'ocr' | 'history' | 'shortcuts' | 'recents'

export const AdvancedPage: React.FC = () => {
  const { fileName, isReady } = useDocumentStore()
  const [activeTab, setActiveTab] = useState<AdvancedTab>('security')

  const tabItems: Array<{
    id: AdvancedTab
    label: string
    desc: string
    icon: React.FC<{ className?: string }>
  }> = [
    {
      id: 'security',
      label: 'Password & Security',
      desc: 'Encrypt with User/Owner passwords, configure permissions, and unlock encrypted PDFs.',
      icon: Lock,
    },
    {
      id: 'ocr',
      label: 'OCR Recognition',
      desc: 'Extract machine-readable text from scanned raster documents in multiple languages.',
      icon: Eye,
    },
    {
      id: 'history',
      label: 'Undo / Redo Stack',
      desc: 'Deep chronological revision timeline with step-by-step history reversions.',
      icon: History,
    },
    {
      id: 'shortcuts',
      label: 'Keyboard Shortcuts',
      desc: 'Comprehensive desktop keyboard controls for power-user navigation and editing.',
      icon: Keyboard,
    },
    {
      id: 'recents',
      label: 'Recents & Autosave',
      desc: 'IndexedDB session persistence, backup recovery, and recent files cache.',
      icon: HardDrive,
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
                <Cpu className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Advanced Engines & Workspace Controls
              </h2>
              <Badge variant="primary">Phase 8</Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Hardware-accelerated character recognition, document cryptography, undo/redo stacks, and autosave sessions.
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {tabItems.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col p-3 rounded-xl border text-left transition-all ${
                  isActive
                    ? 'border-brand-500 bg-white dark:bg-slate-900 shadow-desktop text-brand-700 dark:text-brand-300 ring-1 ring-brand-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mb-2 transition-colors ${
                    isActive
                      ? 'bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate w-full">
                  {tab.label}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-1 line-clamp-2">
                  {tab.desc}
                </p>
              </button>
            )
          })}
        </div>

        {/* Tab Content Panes */}
        <div className="mt-4">
          {activeTab === 'security' && <SecurityTab />}
          {activeTab === 'ocr' && <OcrTab />}
          {activeTab === 'history' && <HistoryTab />}
          {activeTab === 'shortcuts' && <ShortcutsTab />}
          {activeTab === 'recents' && <RecentAutosaveTab />}
        </div>
      </div>
    </div>
  )
}
export default AdvancedPage

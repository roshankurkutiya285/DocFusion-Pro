import React, { useState } from 'react'
import {
  Keyboard,
  Search,
  FileText,
  History,
  Move,
  ZoomIn,
  HelpCircle,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'

export const ShortcutsTab: React.FC = () => {
  const [search, setSearch] = useState('')

  const categories = [
    {
      name: 'Document & File Operations',
      icon: FileText,
      shortcuts: [
        { keys: ['Ctrl', 'O'], desc: 'Open PDF document from disk' },
        { keys: ['Ctrl', 'S'], desc: 'Save & download current document' },
        { keys: ['Ctrl', 'P'], desc: 'Print document' },
        { keys: ['Esc'], desc: 'Close any active modal or dialog' },
      ],
    },
    {
      name: 'History & Revisions',
      icon: History,
      shortcuts: [
        { keys: ['Ctrl', 'Z'], desc: 'Undo last document modification' },
        { keys: ['Ctrl', 'Y'], desc: 'Redo previously reverted action' },
        { keys: ['Ctrl', 'Shift', 'Z'], desc: 'Alternative Redo combination' },
      ],
    },
    {
      name: 'Page Navigation',
      icon: Move,
      shortcuts: [
        { keys: ['←', 'PageUp'], desc: 'Navigate to previous page' },
        { keys: ['→', 'PageDown'], desc: 'Navigate to next page' },
        { keys: ['Home'], desc: 'Jump to first page of document' },
        { keys: ['End'], desc: 'Jump to last page of document' },
      ],
    },
    {
      name: 'Zoom & Viewport',
      icon: ZoomIn,
      shortcuts: [
        { keys: ['Ctrl', '+'], desc: 'Zoom in viewport' },
        { keys: ['Ctrl', '-'], desc: 'Zoom out viewport' },
        { keys: ['Ctrl', '0'], desc: 'Reset zoom to 100% actual size' },
        { keys: ['Ctrl', 'Wheel'], desc: 'Smooth mouse-wheel zoom' },
        { keys: ['Ctrl', 'Shift', 'R'], desc: 'Rotate document 90° clockwise' },
      ],
    },
    {
      name: 'General & Assistance',
      icon: HelpCircle,
      shortcuts: [
        { keys: ['Ctrl', 'K'], desc: 'Open keyboard shortcuts cheatsheet' },
        { keys: ['?'], desc: 'Show shortcuts help' },
      ],
    },
  ]

  const filteredCategories = categories
    .map((cat) => ({
      ...cat,
      shortcuts: cat.shortcuts.filter(
        (s) =>
          s.desc.toLowerCase().includes(search.toLowerCase()) ||
          s.keys.some((k) => k.toLowerCase().includes(search.toLowerCase()))
      ),
    }))
    .filter((cat) => cat.shortcuts.length > 0)

  return (
    <div className="space-y-6">
      {/* Top Banner & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <Keyboard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">
              Desktop Keyboard Shortcuts
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Control viewer navigation, history rollback, and document zoom without leaving the keyboard.
            </p>
          </div>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search shortcuts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
          />
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCategories.map((cat) => {
          const Icon = cat.icon
          return (
            <Card key={cat.name}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <Icon className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                    {cat.name}
                  </h4>
                </div>

                <div className="space-y-1.5">
                  {cat.shortcuts.map((sc) => (
                    <div
                      key={sc.desc}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition text-xs"
                    >
                      <span className="text-slate-700 dark:text-slate-300">
                        {sc.desc}
                      </span>
                      <div className="flex items-center gap-1">
                        {sc.keys.map((k) => (
                          <kbd
                            key={k}
                            className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200 shadow-xs"
                          >
                            {k}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

import React from 'react'
import {
  LayoutGrid,
  Bookmark,
  MessageSquare,
  Search,
  ChevronLeft,
  ChevronRight,
  FileQuestion,
} from 'lucide-react'
import { useAppStore } from '@/stores/useAppStore'
import { useDocumentStore } from '@/stores/useDocumentStore'
import { IconButton } from '@/components/ui/IconButton'
import { ThumbnailPanel } from '@/components/viewer/ThumbnailPanel'
import { SearchPanel } from '@/components/viewer/SearchPanel'
import { BookmarksPanel } from '@/components/viewer/BookmarksPanel'
import { cn } from '@/utils/cn'

export const Sidebar: React.FC = () => {
  const {
    isSidebarOpen,
    toggleSidebar,
    activeSidebarTab,
    setActiveSidebarTab,
  } = useAppStore()

  const { isReady, numPages } = useDocumentStore()

  const tabs = [
    { id: 'thumbnails', label: 'Thumbnails', icon: LayoutGrid },
    { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
    { id: 'annotations', label: 'Annotations', icon: MessageSquare },
    { id: 'search', label: 'Search', icon: Search },
  ] as const

  return (
    <aside
      className={cn(
        'relative flex border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 transition-all duration-200 shrink-0 select-none z-20',
        isSidebarOpen ? 'w-56 sm:w-64' : 'w-11'
      )}
    >
      {/* Icon Rail (Always visible) */}
      <div className="w-11 flex flex-col items-center py-2 border-r border-slate-200/60 dark:border-slate-800/60 shrink-0 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeSidebarTab === tab.id && isSidebarOpen
          return (
            <IconButton
              key={tab.id}
              size="sm"
              tooltip={tab.label}
              tooltipPosition="right"
              isActive={isActive}
              onClick={() => setActiveSidebarTab(tab.id)}
            >
              <Icon className="w-4 h-4" />
            </IconButton>
          )
        })}

        <div className="mt-auto">
          <IconButton
            size="sm"
            tooltip={isSidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
            tooltipPosition="right"
            onClick={toggleSidebar}
          >
            {isSidebarOpen ? (
              <ChevronLeft className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </IconButton>
        </div>
      </div>

      {/* Expanded Content Panel */}
      {isSidebarOpen && (
        <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-950">
          {/* Panel Header */}
          <div className="h-9 px-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 capitalize">
              {activeSidebarTab}
            </span>
            {isReady && numPages > 0 && activeSidebarTab === 'thumbnails' && (
              <span className="text-[10px] text-slate-400 font-mono">
                {numPages} {numPages === 1 ? 'Page' : 'Pages'}
              </span>
            )}
          </div>

          {/* Panel Body */}
          <div className="flex-1 p-2 overflow-y-auto">
            {!isReady ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <FileQuestion className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  No Document Open
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  Open a PDF file to view page thumbnails and structure.
                </p>
              </div>
            ) : (
              <>
                {activeSidebarTab === 'thumbnails' && <ThumbnailPanel />}

                {activeSidebarTab === 'bookmarks' && <BookmarksPanel />}

                {activeSidebarTab === 'annotations' && (
                  <div className="text-center py-6 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded p-3">
                    <p className="font-medium text-slate-600 dark:text-slate-300 mb-1">Document Annotations</p>
                    <p className="text-[11px]">Use the <span className="font-semibold text-brand-600">Edit</span> workspace to draw, add text, shapes, or signatures.</p>
                  </div>
                )}

                {activeSidebarTab === 'search' && <SearchPanel />}
              </>
            )}
          </div>
        </div>
      )}
    </aside>
  )
}

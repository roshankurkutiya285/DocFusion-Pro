import React, { useState, useEffect } from 'react'
import { Bookmark, Plus, Trash2, ArrowRight, BookOpen } from 'lucide-react'
import { useDocumentStore } from '@/stores/useDocumentStore'
import { useNavigate } from 'react-router-dom'

interface CustomBookmark {
  id: string
  title: string
  pageNumber: number
}

export const BookmarksPanel: React.FC = () => {
  const navigate = useNavigate()
  const { pdfDoc, currentPage, setCurrentPage, fileName } = useDocumentStore()

  const [pdfOutline, setPdfOutline] = useState<any[]>([])
  const [userBookmarks, setUserBookmarks] = useState<CustomBookmark[]>([])
  const [newTitle, setNewTitle] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  // Load PDF embedded outline
  useEffect(() => {
    if (!pdfDoc) return
    pdfDoc
      .getOutline()
      .then((outline: any) => {
        setPdfOutline(outline || [])
      })
      .catch(() => {
        setPdfOutline([])
      })
  }, [pdfDoc])

  // Load user bookmarks from localStorage
  useEffect(() => {
    if (!fileName) return
    const key = `docfusion_bookmarks_${fileName}`
    try {
      const saved = localStorage.getItem(key)
      if (saved) setUserBookmarks(JSON.parse(saved))
    } catch {
      // Ignore
    }
  }, [fileName])

  // Save user bookmarks to localStorage
  const saveBookmarks = (items: CustomBookmark[]) => {
    setUserBookmarks(items)
    if (!fileName) return
    localStorage.setItem(`docfusion_bookmarks_${fileName}`, JSON.stringify(items))
  }

  const handleAddBookmark = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return

    const newBookmark: CustomBookmark = {
      id: Math.random().toString(36).substring(2, 9),
      title: newTitle.trim(),
      pageNumber: currentPage,
    }

    saveBookmarks([...userBookmarks, newBookmark])
    setNewTitle('')
    setIsAdding(false)
  }

  const handleDeleteBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    saveBookmarks(userBookmarks.filter((b) => b.id !== id))
  }

  const handleJump = (pageNum: number) => {
    setCurrentPage(pageNum)
    navigate('/viewer')
  }

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Header action: add bookmark */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Bookmarks & Outline
        </span>
        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Bookmark Page {currentPage}</span>
        </button>
      </div>

      {/* Add Bookmark Form */}
      {isAdding && (
        <form onSubmit={handleAddBookmark} className="p-2 bg-brand-50/50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800 rounded-lg space-y-2">
          <input
            type="text"
            autoFocus
            placeholder={`Title for Page ${currentPage}...`}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-brand-500"
          />
          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-2 py-0.5 text-[11px] text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newTitle.trim()}
              className="px-2.5 py-0.5 text-[11px] bg-brand-600 text-white rounded font-medium disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </form>
      )}

      {/* Bookmarks List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {/* User Bookmarks Section */}
        {userBookmarks.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold px-1">
              My Saved Bookmarks
            </span>
            {userBookmarks.map((b) => (
              <div
                key={b.id}
                onClick={() => handleJump(b.pageNumber)}
                className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer group transition-colors ${
                  currentPage === b.pageNumber
                    ? 'border-brand-500 bg-brand-50/40 dark:bg-brand-950/40'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-brand-400'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Bookmark className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                  <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                    {b.title}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-mono text-[10px] text-slate-400">P.{b.pageNumber}</span>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteBookmark(b.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-rose-500 transition-opacity"
                    title="Delete bookmark"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PDF Embedded Outline Section */}
        {pdfOutline.length > 0 && (
          <div className="space-y-1 pt-2">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold px-1">
              Document Table of Contents
            </span>
            {pdfOutline.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs hover:border-brand-400 cursor-pointer group"
                onClick={() => {
                  // Jump to dest if index available
                  if (typeof item.dest === 'number') {
                    handleJump(item.dest + 1)
                  }
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-500 shrink-0" />
                  <span className="truncate text-slate-700 dark:text-slate-300">
                    {item.title}
                  </span>
                </div>
                <ArrowRight className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100" />
              </div>
            ))}
          </div>
        )}

        {userBookmarks.length === 0 && pdfOutline.length === 0 && (
          <div className="text-center py-8 text-slate-400 text-xs">
            <Bookmark className="w-6 h-6 mx-auto mb-2 opacity-50" />
            <p className="font-medium text-slate-500">No Bookmarks Yet</p>
            <p className="text-[11px] mt-1">
              Click "Bookmark Page {currentPage}" above to save important locations in this document.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

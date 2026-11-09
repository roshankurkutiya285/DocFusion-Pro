import React, { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { ArrowLeftRight, Search, Replace } from 'lucide-react'
import type { PDFDocumentProxy } from '@/services/pdfService'
import { extractPageTextItems } from '@/services/pdfService'
import type { AnyAnnotation, TextAnnotation, WhiteoutAnnotation } from '@/types/edit'
import { useAppStore } from '@/stores/useAppStore'

interface FindAndInterchangeModalProps {
  isOpen: boolean
  onClose: () => void
  pdfDoc: PDFDocumentProxy | null
  currentPage: number
  numPages: number
  rotation: number
  fontFamily: 'Helvetica' | 'TimesRoman' | 'Courier'
  color: string
  onApplyEdits: (newAnnotations: AnyAnnotation[], description: string) => void
}

export const FindAndInterchangeModal: React.FC<FindAndInterchangeModalProps> = ({
  isOpen,
  onClose,
  pdfDoc,
  currentPage,
  numPages,
  rotation,
  fontFamily,
  color,
  onApplyEdits,
}) => {
  const { addToast } = useAppStore()

  const [activeTab, setActiveTab] = useState<'replace' | 'interchange'>('replace')
  const [scope, setScope] = useState<'page' | 'all'>('page')
  const [matchCase, setMatchCase] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Find & Replace fields
  const [findText, setFindText] = useState('')
  const [replaceWith, setReplaceWith] = useState('')

  // Interchange fields
  const [termA, setTermA] = useState('')
  const [termB, setTermB] = useState('')

  // Execute Find & Replace
  const handleExecuteReplace = async () => {
    if (!pdfDoc || !findText.trim()) return

    setIsProcessing(true)
    const generated: AnyAnnotation[] = []
    let totalMatches = 0

    try {
      const startPage = scope === 'page' ? currentPage : 1
      const endPage = scope === 'page' ? currentPage : numPages

      for (let p = startPage; p <= endPage; p++) {
        const page = await pdfDoc.getPage(p)
        const textItems = await extractPageTextItems(page, p, rotation)
        const pageIndex = p - 1

        for (const item of textItems) {
          const itemText = matchCase ? item.str : item.str.toLowerCase()
          const query = matchCase ? findText : findText.toLowerCase()

          if (itemText.includes(query)) {
            totalMatches++
            const replacedText = matchCase
              ? item.str.replaceAll(findText, replaceWith)
              : item.str.replace(new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), replaceWith)

            const now = Date.now()
            // 1. Whiteout mask
            const whiteoutAnn: WhiteoutAnnotation = {
              id: `wo_rep_${p}_${item.id}_${now}`,
              pageIndex,
              type: 'whiteout',
              createdAt: now,
              x: Math.max(0, item.x - 2),
              y: Math.max(0, item.y - 1),
              width: item.width + 4,
              height: item.height + 2,
            }
            // 2. Replacement text
            const textAnn: TextAnnotation = {
              id: `txt_rep_${p}_${item.id}_${now + 1}`,
              pageIndex,
              type: 'editText',
              createdAt: now + 1,
              x: item.x,
              y: item.y,
              text: replacedText,
              fontSize: item.fontSize,
              color,
              fontFamily,
            }

            generated.push(whiteoutAnn, textAnn)
          }
        }
      }

      if (totalMatches === 0) {
        addToast({
          title: 'No Matches Found',
          message: `Could not find "${findText}" on ${scope === 'page' ? `Page ${currentPage}` : 'any page'}.`,
          type: 'info',
        })
        return
      }

      onApplyEdits(generated, `Replace "${findText}" with "${replaceWith}" (${totalMatches} matches)`)
      addToast({
        title: 'Text Replaced',
        message: `Successfully replaced ${totalMatches} ${totalMatches === 1 ? 'match' : 'matches'}.`,
        type: 'success',
      })
      onClose()
    } catch (err) {
      console.error('Find and replace failed', err)
      addToast({
        title: 'Replace Failed',
        message: err instanceof Error ? err.message : 'An error occurred during replacement',
        type: 'error',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Execute Interchange / Swap of Two Values
  const handleExecuteInterchange = async () => {
    if (!pdfDoc || !termA.trim() || !termB.trim()) return

    setIsProcessing(true)
    const generated: AnyAnnotation[] = []
    let swappedCount = 0

    try {
      const startPage = scope === 'page' ? currentPage : 1
      const endPage = scope === 'page' ? currentPage : numPages

      for (let p = startPage; p <= endPage; p++) {
        const page = await pdfDoc.getPage(p)
        const textItems = await extractPageTextItems(page, p, rotation)
        const pageIndex = p - 1

        for (const item of textItems) {
          const itemText = matchCase ? item.str : item.str.toLowerCase()
          const queryA = matchCase ? termA : termA.toLowerCase()
          const queryB = matchCase ? termB : termB.toLowerCase()

          let newText: string | null = null

          if (itemText.includes(queryA)) {
            newText = matchCase
              ? item.str.replaceAll(termA, termB)
              : item.str.replace(new RegExp(termA.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), termB)
            swappedCount++
          } else if (itemText.includes(queryB)) {
            newText = matchCase
              ? item.str.replaceAll(termB, termA)
              : item.str.replace(new RegExp(termB.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), termA)
            swappedCount++
          }

          if (newText !== null) {
            const now = Date.now()
            // 1. Whiteout mask
            const whiteoutAnn: WhiteoutAnnotation = {
              id: `wo_swp_${p}_${item.id}_${now}`,
              pageIndex,
              type: 'whiteout',
              createdAt: now,
              x: Math.max(0, item.x - 2),
              y: Math.max(0, item.y - 1),
              width: item.width + 4,
              height: item.height + 2,
            }
            // 2. Interchanged text
            const textAnn: TextAnnotation = {
              id: `txt_swp_${p}_${item.id}_${now + 1}`,
              pageIndex,
              type: 'editText',
              createdAt: now + 1,
              x: item.x,
              y: item.y,
              text: newText,
              fontSize: item.fontSize,
              color,
              fontFamily,
            }

            generated.push(whiteoutAnn, textAnn)
          }
        }
      }

      if (swappedCount === 0) {
        addToast({
          title: 'No Matches Found',
          message: `Neither "${termA}" nor "${termB}" were found on ${scope === 'page' ? `Page ${currentPage}` : 'any page'}.`,
          type: 'info',
        })
        return
      }

      onApplyEdits(generated, `Interchange "${termA}" ⇄ "${termB}" (${swappedCount} items)`)
      addToast({
        title: 'Data Interchanged',
        message: `Successfully swapped ${swappedCount} occurrences of "${termA}" ⇄ "${termB}".`,
        type: 'success',
      })
      onClose()
    } catch (err) {
      console.error('Interchange failed', err)
      addToast({
        title: 'Interchange Failed',
        message: err instanceof Error ? err.message : 'An error occurred during interchange',
        type: 'error',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Find, Replace & Interchange Content"
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('replace')}
            className={`flex-1 py-2 text-xs font-semibold border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'replace'
                ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Replace className="w-3.5 h-3.5" />
            <span>Find & Replace Text</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('interchange')}
            className={`flex-1 py-2 text-xs font-semibold border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'interchange'
                ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Interchange / Swap 2 Values</span>
          </button>
        </div>

        {/* Tab 1: Find & Replace */}
        {activeTab === 'replace' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Find in PDF:
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Existing text or numbers (e.g. INV-2026, $1,250, Pending)..."
                  value={findText}
                  onChange={(e) => setFindText(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Replace With:
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="New replacement content (e.g. INV-2027, $2,500, Approved)..."
                  value={replaceWith}
                  onChange={(e) => setReplaceWith(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <Replace className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Interchange / Swap Two Values */}
        {activeTab === 'interchange' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Every occurrence of <strong>Value A</strong> will be replaced with <strong>Value B</strong>, and every occurrence of <strong>Value B</strong> will be replaced with <strong>Value A</strong>.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Value A:
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe, $1,250, Debit"
                  value={termA}
                  onChange={(e) => setTermA(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Value B (to swap with A):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Jane Smith, $2,500, Credit"
                  value={termB}
                  onChange={(e) => setTermB(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Scope and Options */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="radio"
                name="replaceScope"
                checked={scope === 'page'}
                onChange={() => setScope('page')}
                className="text-brand-600 focus:ring-brand-500"
              />
              <span>Page {currentPage} only</span>
            </label>

            <label className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="radio"
                name="replaceScope"
                checked={scope === 'all'}
                onChange={() => setScope('all')}
                className="text-brand-600 focus:ring-brand-500"
              />
              <span>All {numPages} Pages</span>
            </label>
          </div>

          <label className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={matchCase}
              onChange={(e) => setMatchCase(e.target.checked)}
              className="rounded text-brand-600 focus:ring-brand-500"
            />
            <span>Match case</span>
          </label>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>

          {activeTab === 'replace' ? (
            <Button
              variant="primary"
              size="sm"
              isLoading={isProcessing}
              disabled={!findText.trim()}
              leftIcon={<Replace className="w-4 h-4" />}
              onClick={handleExecuteReplace}
            >
              Replace All Matches
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              isLoading={isProcessing}
              disabled={!termA.trim() || !termB.trim()}
              leftIcon={<ArrowLeftRight className="w-4 h-4" />}
              onClick={handleExecuteInterchange}
            >
              Interchange Both Values
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

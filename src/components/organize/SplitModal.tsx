import React, { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Scissors, FileText, Loader2, Info } from 'lucide-react'
import { splitPdf, downloadPdfBlob } from '@/services/organizeService'
import { useDocumentStore } from '@/stores/useDocumentStore'
import { useAppStore } from '@/stores/useAppStore'

interface SplitModalProps {
  isOpen: boolean
  onClose: () => void
}

export const SplitModal: React.FC<SplitModalProps> = ({ isOpen, onClose }) => {
  const { fileName, numPages, getSafeFileData } = useDocumentStore()
  const { addToast } = useAppStore()

  const [mode, setMode] = useState<'ranges' | 'all'>('ranges')
  const [rangeInput, setRangeInput] = useState(`1-${Math.max(1, Math.floor(numPages / 2))}, ${Math.min(numPages, Math.floor(numPages / 2) + 1)}-${numPages}`)
  const [isProcessing, setIsProcessing] = useState(false)

  // Update default range when numPages changes
  React.useEffect(() => {
    if (numPages > 1) {
      const half = Math.floor(numPages / 2)
      setRangeInput(`1-${half}, ${half + 1}-${numPages}`)
    } else {
      setRangeInput('1-1')
    }
  }, [numPages])

  const parseRanges = (input: string): { from: number; to: number }[] => {
    const parts = input.split(',').map((p) => p.trim()).filter(Boolean)
    const ranges: { from: number; to: number }[] = []

    for (const part of parts) {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-')
        const start = parseInt(startStr.trim(), 10)
        const end = parseInt(endStr.trim(), 10)
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          ranges.push({ from: start, to: end })
        }
      } else {
        const single = parseInt(part, 10)
        if (!isNaN(single)) {
          ranges.push({ from: single, to: single })
        }
      }
    }

    return ranges
  }

  const handleExecuteSplit = async () => {
    setIsProcessing(true)
    try {
      const safeBuffer = await getSafeFileData()
      let rangesToUse: { from: number; to: number }[] = []

      if (mode === 'all') {
        for (let p = 1; p <= numPages; p++) {
          rangesToUse.push({ from: p, to: p })
        }
      } else {
        rangesToUse = parseRanges(rangeInput)
        if (rangesToUse.length === 0) {
          throw new Error('Please enter valid page ranges (e.g. 1-2, 3-5)')
        }
      }

      const parts = await splitPdf(safeBuffer, rangesToUse)
      const baseName = (fileName || 'document').replace('.pdf', '')

      // Download each part
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]
        downloadPdfBlob(part.bytes, `${baseName}_part_${i + 1}.pdf`)
      }

      addToast({
        title: 'Split Completed',
        message: `Generated and downloaded ${parts.length} split PDF files.`,
        type: 'success',
      })
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Split failed'
      addToast({
        title: 'Split Failed',
        message,
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
      title="Split PDF Document"
      description={`Divide "${fileName || 'document.pdf'}" (${numPages} total pages) into separate documents`}
      maxWidth="md"
    >
      <div className="space-y-4 py-2 text-xs">
        {/* Mode Selector */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode('ranges')}
            className={`p-3 rounded-lg border text-left transition-all ${
              mode === 'ranges'
                ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-semibold ring-1 ring-brand-500/50'
                : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <p className="font-semibold text-xs mb-0.5">By Custom Ranges</p>
            <p className="text-[11px] text-slate-500 font-normal">
              Specify page sets like 1-2, 3-5
            </p>
          </button>

          <button
            type="button"
            onClick={() => setMode('all')}
            className={`p-3 rounded-lg border text-left transition-all ${
              mode === 'all'
                ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-semibold ring-1 ring-brand-500/50'
                : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <p className="font-semibold text-xs mb-0.5">Extract Every Page</p>
            <p className="text-[11px] text-slate-500 font-normal">
              Save each of the {numPages} pages separately
            </p>
          </button>
        </div>

        {mode === 'ranges' && (
          <div className="space-y-1.5">
            <label className="font-medium text-slate-700 dark:text-slate-300">
              Page Ranges (separated by comma):
            </label>
            <input
              type="text"
              value={rangeInput}
              onChange={(e) => setRangeInput(e.target.value)}
              placeholder="e.g. 1-2, 3-5"
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <Info className="w-3 h-3" />
              Example: "1-2, 3-5" splits pages 1 to 2 into one file and 3 to 5 into another.
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400">
          <FileText className="w-4 h-4 text-brand-500 shrink-0" />
          <span>
            Total document length: <span className="font-semibold text-slate-800 dark:text-slate-200">{numPages} pages</span>
          </span>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800 mt-3">
        <Button size="sm" variant="ghost" onClick={onClose} disabled={isProcessing}>
          Cancel
        </Button>
        <Button
          size="sm"
          variant="primary"
          disabled={isProcessing}
          onClick={handleExecuteSplit}
          leftIcon={
            isProcessing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Scissors className="w-3.5 h-3.5" />
            )
          }
        >
          Split & Download Files
        </Button>
      </div>
    </Modal>
  )
}

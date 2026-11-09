import React, { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Crop, Loader2 } from 'lucide-react'
import { cropPages, toArrayBuffer } from '@/services/organizeService'
import { useDocumentStore } from '@/stores/useDocumentStore'
import { useAppStore } from '@/stores/useAppStore'

interface CropModalProps {
  isOpen: boolean
  onClose: () => void
  selectedPageIndices: number[]
}

export const CropModal: React.FC<CropModalProps> = ({
  isOpen,
  onClose,
  selectedPageIndices,
}) => {
  const { fileName, currentPage, numPages, loadBuffer, getSafeFileData } = useDocumentStore()
  const { addToast } = useAppStore()

  const [top, setTop] = useState(36)
  const [right, setRight] = useState(36)
  const [bottom, setBottom] = useState(36)
  const [left, setLeft] = useState(36)
  const [target, setTarget] = useState<'selected' | 'all' | 'current'>('selected')
  const [isProcessing, setIsProcessing] = useState(false)

  const handleExecuteCrop = async () => {
    let indices: number[] = []
    if (target === 'all') {
      indices = Array.from({ length: numPages }, (_, i) => i)
    } else if (target === 'current') {
      indices = [Math.max(0, currentPage - 1)]
    } else {
      indices = selectedPageIndices.length > 0 ? selectedPageIndices : [Math.max(0, currentPage - 1)]
    }

    setIsProcessing(true)
    try {
      const safeBuffer = await getSafeFileData()
      const croppedBytes = await cropPages(safeBuffer, indices, {
        top: Number(top),
        right: Number(right),
        bottom: Number(bottom),
        left: Number(left),
      })

      await loadBuffer(toArrayBuffer(croppedBytes), fileName || 'Cropped_Document.pdf')
      addToast({
        title: 'Pages Cropped',
        message: `Successfully cropped ${indices.length} page(s).`,
        type: 'success',
      })
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Crop failed'
      addToast({
        title: 'Crop Failed',
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
      title="Crop Document Pages"
      description="Trim page margins and adjust visible canvas boundaries"
      maxWidth="md"
    >
      <div className="space-y-4 py-2 text-xs">
        {/* Scope selector */}
        <div>
          <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
            Apply Crop To:
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setTarget('selected')}
              disabled={selectedPageIndices.length === 0}
              className={`p-2 rounded-lg border text-center transition-all disabled:opacity-40 ${
                target === 'selected'
                  ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-semibold ring-1 ring-brand-500/50'
                  : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              Selected ({selectedPageIndices.length})
            </button>
            <button
              type="button"
              onClick={() => setTarget('current')}
              className={`p-2 rounded-lg border text-center transition-all ${
                target === 'current'
                  ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-semibold ring-1 ring-brand-500/50'
                  : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              Current Page ({currentPage})
            </button>
            <button
              type="button"
              onClick={() => setTarget('all')}
              className={`p-2 rounded-lg border text-center transition-all ${
                target === 'all'
                  ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-semibold ring-1 ring-brand-500/50'
                  : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              All Pages ({numPages})
            </button>
          </div>
        </div>

        {/* Margins Inputs (in points, 72 pt = 1 inch) */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
          <p className="font-semibold text-slate-800 dark:text-slate-200 text-center mb-3">
            Crop Margins Insets (Points):
          </p>
          <div className="flex flex-col items-center gap-2">
            {/* Top */}
            <div className="flex items-center gap-2">
              <span className="w-12 text-right font-medium text-slate-500">Top:</span>
              <input
                type="number"
                min={0}
                max={300}
                value={top}
                onChange={(e) => setTop(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-20 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-center"
              />
              <span className="text-[10px] text-slate-400">pt</span>
            </div>

            {/* Left & Right */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="w-10 text-right font-medium text-slate-500">Left:</span>
                <input
                  type="number"
                  min={0}
                  max={300}
                  value={left}
                  onChange={(e) => setLeft(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-20 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-center"
                />
                <span className="text-[10px] text-slate-400">pt</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-10 text-right font-medium text-slate-500">Right:</span>
                <input
                  type="number"
                  min={0}
                  max={300}
                  value={right}
                  onChange={(e) => setRight(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-20 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-center"
                />
                <span className="text-[10px] text-slate-400">pt</span>
              </div>
            </div>

            {/* Bottom */}
            <div className="flex items-center gap-2">
              <span className="w-12 text-right font-medium text-slate-500">Bottom:</span>
              <input
                type="number"
                min={0}
                max={300}
                value={bottom}
                onChange={(e) => setBottom(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-20 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-center"
              />
              <span className="text-[10px] text-slate-400">pt</span>
            </div>
          </div>
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
          onClick={handleExecuteCrop}
          leftIcon={
            isProcessing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Crop className="w-3.5 h-3.5" />
            )
          }
        >
          Apply Crop
        </Button>
      </div>
    </Modal>
  )
}

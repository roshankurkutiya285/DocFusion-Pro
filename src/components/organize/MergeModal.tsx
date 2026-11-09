import React, { useState, useRef } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { Plus, Trash2, ArrowUp, ArrowDown, FileText, Merge, Loader2 } from 'lucide-react'
import { mergePdfs, downloadPdfBlob, toArrayBuffer } from '@/services/organizeService'
import { useDocumentStore } from '@/stores/useDocumentStore'
import { useAppStore } from '@/stores/useAppStore'
import { formatFileSize } from '@/utils/formatters'

interface MergeModalProps {
  isOpen: boolean
  onClose: () => void
}

interface MergeFileItem {
  id: string
  name: string
  size: number
  buffer: ArrayBuffer
}

export const MergeModal: React.FC<MergeModalProps> = ({ isOpen, onClose }) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<MergeFileItem[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const { fileName, loadBuffer, getSafeFileData } = useDocumentStore()
  const { addToast } = useAppStore()

  // Pre-populate with currently open document if available
  React.useEffect(() => {
    if (isOpen && fileName && items.length === 0) {
      getSafeFileData().then((safeBuffer) => {
        setItems([
          {
            id: Math.random().toString(36).substring(2, 9),
            name: fileName,
            size: safeBuffer.byteLength,
            buffer: safeBuffer,
          },
        ])
      }).catch(() => {})
    }
  }, [isOpen, fileName, items.length, getSafeFileData])

  const handleAddFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const newItems: MergeFileItem[] = []
    for (const f of files) {
      const buffer = await f.arrayBuffer()
      newItems.push({
        id: Math.random().toString(36).substring(2, 9),
        name: f.name,
        size: f.size,
        buffer,
      })
    }

    setItems((prev) => [...prev, ...newItems])
    e.target.value = ''
  }

  const handleRemove = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const handleMoveUp = (index: number) => {
    if (index <= 0) return
    setItems((prev) => {
      const copy = [...prev]
      const temp = copy[index - 1]
      copy[index - 1] = copy[index]
      copy[index] = temp
      return copy
    })
  }

  const handleMoveDown = (index: number) => {
    if (index >= items.length - 1) return
    setItems((prev) => {
      const copy = [...prev]
      const temp = copy[index + 1]
      copy[index + 1] = copy[index]
      copy[index] = temp
      return copy
    })
  }

  const handleExecuteMerge = async (openAfter = true) => {
    if (items.length < 2) {
      addToast({
        title: 'Merge PDFs',
        message: 'Please add at least 2 PDF files to merge.',
        type: 'warning',
      })
      return
    }

    setIsProcessing(true)
    try {
      const mergedBytes = await mergePdfs(items.map((i) => i.buffer))
      const mergedName = `Merged_${items[0].name.replace('.pdf', '')}_plus_${items.length - 1}.pdf`

      if (openAfter) {
        await loadBuffer(toArrayBuffer(mergedBytes), mergedName)
        addToast({
          title: 'Merge Successful',
          message: `${items.length} PDFs merged and loaded into workspace.`,
          type: 'success',
        })
      } else {
        downloadPdfBlob(mergedBytes, mergedName)
        addToast({
          title: 'Merge Successful',
          message: `${items.length} PDFs merged and downloaded.`,
          type: 'success',
        })
      }
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Merge failed'
      addToast({
        title: 'Merge Failed',
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
      title="Merge PDF Files"
      description="Combine multiple PDF documents into a single document"
      maxWidth="lg"
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="application/pdf,.pdf"
        onChange={handleAddFiles}
        className="hidden"
      />

      <div className="space-y-4 py-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Files in Merge Queue ({items.length})
          </span>
          <Button
            size="xs"
            variant="outline"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => fileInputRef.current?.click()}
          >
            Add PDF Files
          </Button>
        </div>

        {items.length === 0 ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center cursor-pointer hover:border-brand-500 bg-slate-50/50 dark:bg-slate-900/50 transition-colors"
          >
            <Merge className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
              No files added yet
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Click to select PDF files from your device to merge
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[10px] flex items-center justify-center font-bold shrink-0">
                    {index + 1}
                  </span>
                  <FileText className="w-4 h-4 text-brand-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                      {item.name}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {formatFileSize(item.size)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <IconButton
                    size="xs"
                    tooltip="Move Up"
                    disabled={index === 0}
                    onClick={() => handleMoveUp(index)}
                  >
                    <ArrowUp className="w-3 h-3" />
                  </IconButton>
                  <IconButton
                    size="xs"
                    tooltip="Move Down"
                    disabled={index === items.length - 1}
                    onClick={() => handleMoveDown(index)}
                  >
                    <ArrowDown className="w-3 h-3" />
                  </IconButton>
                  <IconButton
                    size="xs"
                    variant="danger"
                    tooltip="Remove"
                    onClick={() => handleRemove(item.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </IconButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800 mt-3">
        <Button size="sm" variant="ghost" onClick={onClose} disabled={isProcessing}>
          Cancel
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={items.length < 2 || isProcessing}
          onClick={() => handleExecuteMerge(false)}
        >
          Merge & Download
        </Button>
        <Button
          size="sm"
          variant="primary"
          disabled={items.length < 2 || isProcessing}
          onClick={() => handleExecuteMerge(true)}
          leftIcon={
            isProcessing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Merge className="w-3.5 h-3.5" />
            )
          }
        >
          Merge & Open in Viewer
        </Button>
      </div>
    </Modal>
  )
}

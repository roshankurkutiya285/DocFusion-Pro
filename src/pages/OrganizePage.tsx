import React, { useState } from 'react'
import {
  Merge,
  Split,
  RotateCw,
  Trash2,
  Copy,
  FilePlus,
  Crop,
  Download,
  FolderOpen,
  Sparkles,
  CheckSquare,
  Square,
  Save,
} from 'lucide-react'
import { useDocumentStore } from '@/stores/useDocumentStore'
import { useAppStore } from '@/stores/useAppStore'
import { Button } from '@/components/ui/Button'
import { OrganizePageCard } from '@/components/organize/OrganizePageCard'
import { MergeModal } from '@/components/organize/MergeModal'
import { SplitModal } from '@/components/organize/SplitModal'
import { CropModal } from '@/components/organize/CropModal'
import {
  reorderPages,
  rotatePages,
  deletePages,
  duplicatePages,
  insertBlankPage,
  extractPages,
  downloadPdfBlob,
  toArrayBuffer,
} from '@/services/organizeService'

export const OrganizePage: React.FC = () => {
  const {
    fileName,
    pdfDoc,
    numPages,
    isReady,
    commitBuffer,
    loadDocument,
    loadSampleDocument,
    getSafeFileData,
  } = useDocumentStore()
  const { addToast } = useAppStore()

  const [selectedIndices, setSelectedIndices] = useState<number[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [activeModal, setActiveModal] = useState<'merge' | 'split' | 'crop' | 'none'>('none')

  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      loadDocument(file)
      setSelectedIndices([])
    }
    e.target.value = ''
  }

  // Selection helpers
  const handleToggleSelect = (index: number) => {
    setSelectedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    )
  }

  const handleSelectAll = () => {
    setSelectedIndices(Array.from({ length: numPages }, (_, i) => i))
  }

  const handleDeselectAll = () => {
    setSelectedIndices([])
  }

  // 1. Reorder Pages (Move Left)
  const handleMoveLeft = async (index: number) => {
    if (index <= 0) return
    setIsProcessing(true)
    try {
      const safeBuffer = await getSafeFileData()
      const order = Array.from({ length: numPages }, (_, i) => i)
      const temp = order[index - 1]
      order[index - 1] = order[index]
      order[index] = temp

      const newBytes = await reorderPages(safeBuffer, order)
      await commitBuffer(toArrayBuffer(newBytes), fileName || 'document.pdf', `Move page ${index + 1} left`)
      setSelectedIndices([])
      addToast({
        title: 'Pages Reordered',
        message: `Page ${index + 1} moved to position ${index}.`,
        type: 'success',
      })
    } catch (err) {
      addToast({
        title: 'Reorder Failed',
        message: err instanceof Error ? err.message : 'Failed to reorder',
        type: 'error',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // 1. Reorder Pages (Move Right)
  const handleMoveRight = async (index: number) => {
    if (index >= numPages - 1) return
    setIsProcessing(true)
    try {
      const safeBuffer = await getSafeFileData()
      const order = Array.from({ length: numPages }, (_, i) => i)
      const temp = order[index + 1]
      order[index + 1] = order[index]
      order[index] = temp

      const newBytes = await reorderPages(safeBuffer, order)
      await commitBuffer(toArrayBuffer(newBytes), fileName || 'document.pdf', `Move page ${index + 1} right`)
      setSelectedIndices([])
      addToast({
        title: 'Pages Reordered',
        message: `Page ${index + 1} moved to position ${index + 2}.`,
        type: 'success',
      })
    } catch (err) {
      addToast({
        title: 'Reorder Failed',
        message: err instanceof Error ? err.message : 'Failed to reorder',
        type: 'error',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // 2. Rotate Pages
  const handleRotate = async (targetIndices?: number[]) => {
    const indices = targetIndices ?? (selectedIndices.length > 0 ? selectedIndices : Array.from({ length: numPages }, (_, i) => i))
    setIsProcessing(true)
    try {
      const safeBuffer = await getSafeFileData()
      const newBytes = await rotatePages(safeBuffer, indices, 90)
      await commitBuffer(toArrayBuffer(newBytes), fileName || 'document.pdf', `Rotate ${indices.length} page(s)`)
      addToast({
        title: 'Pages Rotated',
        message: `Rotated ${indices.length} page(s) +90°.`,
        type: 'success',
      })
    } catch (err) {
      addToast({
        title: 'Rotate Failed',
        message: err instanceof Error ? err.message : 'Failed to rotate',
        type: 'error',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // 3. Delete Pages
  const handleDelete = async (targetIndices?: number[]) => {
    const indices = targetIndices ?? selectedIndices
    if (indices.length === 0) {
      addToast({
        title: 'No Pages Selected',
        message: 'Please select at least one page to delete.',
        type: 'warning',
      })
      return
    }

    if (indices.length >= numPages) {
      addToast({
        title: 'Cannot Delete All Pages',
        message: 'A PDF must contain at least one page.',
        type: 'warning',
      })
      return
    }

    setIsProcessing(true)
    try {
      const safeBuffer = await getSafeFileData()
      const newBytes = await deletePages(safeBuffer, indices)
      await commitBuffer(toArrayBuffer(newBytes), fileName || 'document.pdf', `Delete ${indices.length} page(s)`)
      setSelectedIndices([])
      addToast({
        title: 'Pages Deleted',
        message: `Removed ${indices.length} page(s) from document.`,
        type: 'success',
      })
    } catch (err) {
      addToast({
        title: 'Delete Failed',
        message: err instanceof Error ? err.message : 'Failed to delete',
        type: 'error',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // 4. Duplicate Pages
  const handleDuplicate = async (targetIndices?: number[]) => {
    const indices = targetIndices ?? (selectedIndices.length > 0 ? selectedIndices : [0])
    setIsProcessing(true)
    try {
      const safeBuffer = await getSafeFileData()
      const newBytes = await duplicatePages(safeBuffer, indices)
      await commitBuffer(toArrayBuffer(newBytes), fileName || 'document.pdf', `Duplicate ${indices.length} page(s)`)
      setSelectedIndices([])
      addToast({
        title: 'Pages Duplicated',
        message: `Duplicated ${indices.length} page(s).`,
        type: 'success',
      })
    } catch (err) {
      addToast({
        title: 'Duplicate Failed',
        message: err instanceof Error ? err.message : 'Failed to duplicate',
        type: 'error',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // 5. Insert Blank Page
  const handleInsertBlank = async () => {
    // Insert after last selected page or at the end
    const insertIndex = selectedIndices.length > 0 ? Math.max(...selectedIndices) + 1 : numPages
    setIsProcessing(true)
    try {
      const safeBuffer = await getSafeFileData()
      const newBytes = await insertBlankPage(safeBuffer, insertIndex)
      await commitBuffer(toArrayBuffer(newBytes), fileName || 'document.pdf', 'Insert blank page')
      setSelectedIndices([])
      addToast({
        title: 'Blank Page Inserted',
        message: `New blank page inserted at position ${insertIndex + 1}.`,
        type: 'success',
      })
    } catch (err) {
      addToast({
        title: 'Insert Failed',
        message: err instanceof Error ? err.message : 'Failed to insert blank page',
        type: 'error',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // 6. Extract Pages
  const handleExtract = async () => {
    if (selectedIndices.length === 0) {
      addToast({
        title: 'No Pages Selected',
        message: 'Select one or more pages to extract.',
        type: 'warning',
      })
      return
    }

    setIsProcessing(true)
    try {
      const safeBuffer = await getSafeFileData()
      const extractedBytes = await extractPages(safeBuffer, selectedIndices)
      const baseName = (fileName || 'document').replace('.pdf', '')
      const extractName = `${baseName}_extracted_${selectedIndices.map((i) => i + 1).join('_')}.pdf`
      downloadPdfBlob(extractedBytes, extractName)
      addToast({
        title: 'Pages Extracted',
        message: `Extracted ${selectedIndices.length} page(s) downloaded.`,
        type: 'success',
      })
    } catch (err) {
      addToast({
        title: 'Extract Failed',
        message: err instanceof Error ? err.message : 'Failed to extract',
        type: 'error',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // 7. Save / Export Current State
  const handleSaveDocument = async () => {
    try {
      const safeBuffer = await getSafeFileData()
      downloadPdfBlob(new Uint8Array(safeBuffer), fileName || 'Organized_Document.pdf')
      addToast({
        title: 'Document Saved',
        message: `${fileName || 'document.pdf'} exported to downloads.`,
        type: 'success',
      })
    } catch (err) {
      addToast({
        title: 'Save Failed',
        message: err instanceof Error ? err.message : 'Failed to export document',
        type: 'error',
      })
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-100 dark:bg-slate-950">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Top Organize Action Ribbon */}
      <div className="h-12 px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 select-none overflow-x-auto">
        {/* Left: 9 Organize Feature Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            size="xs"
            variant="outline"
            leftIcon={<Merge className="w-3.5 h-3.5 text-brand-500" />}
            onClick={() => setActiveModal('merge')}
          >
            Merge PDFs
          </Button>

          <Button
            size="xs"
            variant="outline"
            disabled={!isReady}
            leftIcon={<Split className="w-3.5 h-3.5 text-emerald-500" />}
            onClick={() => setActiveModal('split')}
          >
            Split PDF
          </Button>

          <Button
            size="xs"
            variant="outline"
            disabled={!isReady || isProcessing}
            leftIcon={<RotateCw className="w-3.5 h-3.5 text-blue-500" />}
            onClick={() => handleRotate()}
          >
            Rotate {selectedIndices.length > 0 ? `(${selectedIndices.length})` : 'All'}
          </Button>

          <Button
            size="xs"
            variant="outline"
            disabled={!isReady || isProcessing}
            leftIcon={<FilePlus className="w-3.5 h-3.5 text-amber-500" />}
            onClick={handleInsertBlank}
          >
            Insert Blank
          </Button>

          <Button
            size="xs"
            variant="outline"
            disabled={!isReady || selectedIndices.length === 0 || isProcessing}
            leftIcon={<Copy className="w-3.5 h-3.5 text-purple-500" />}
            onClick={() => handleDuplicate()}
          >
            Duplicate ({selectedIndices.length})
          </Button>

          <Button
            size="xs"
            variant="outline"
            disabled={!isReady || selectedIndices.length === 0 || isProcessing}
            leftIcon={<Download className="w-3.5 h-3.5 text-indigo-500" />}
            onClick={handleExtract}
          >
            Extract ({selectedIndices.length})
          </Button>

          <Button
            size="xs"
            variant="outline"
            disabled={!isReady}
            leftIcon={<Crop className="w-3.5 h-3.5 text-cyan-500" />}
            onClick={() => setActiveModal('crop')}
          >
            Crop Pages
          </Button>

          <Button
            size="xs"
            variant="danger"
            disabled={!isReady || isProcessing}
            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            onClick={() => {
              if (selectedIndices.length === 0) {
                addToast({
                  title: 'Select Pages to Delete',
                  message: 'Check the box on any page card to select it, or click the trash icon directly on a card.',
                  type: 'info',
                })
              } else {
                handleDelete()
              }
            }}
          >
            Delete {selectedIndices.length > 0 ? `(${selectedIndices.length})` : ''}
          </Button>
        </div>

        {/* Right: Select All & Save Export */}
        <div className="flex items-center gap-2 shrink-0">
          {isReady && (
            <>
              {selectedIndices.length === numPages ? (
                <Button
                  size="xs"
                  variant="ghost"
                  leftIcon={<Square className="w-3.5 h-3.5" />}
                  onClick={handleDeselectAll}
                >
                  Deselect All
                </Button>
              ) : (
                <Button
                  size="xs"
                  variant="ghost"
                  leftIcon={<CheckSquare className="w-3.5 h-3.5" />}
                  onClick={handleSelectAll}
                >
                  Select All
                </Button>
              )}

              <Button
                size="xs"
                variant="primary"
                leftIcon={<Save className="w-3.5 h-3.5" />}
                onClick={handleSaveDocument}
              >
                Save & Export
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Grid Workspace */}
      <div className="flex-1 overflow-y-auto p-6">
        {!isReady || !pdfDoc ? (
          <div className="h-full flex items-center justify-center">
            <div className="max-w-md w-full bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-desktop border border-slate-200 dark:border-slate-800 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-200 dark:border-emerald-800/80 shadow-inner">
                <Merge className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1.5">
                Visual Page Organizer
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                Merge documents, split by ranges, drag or click to reorder, rotate individual pages, duplicate, crop, and extract.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<FolderOpen className="w-4 h-4" />}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full sm:w-auto"
                >
                  Open PDF to Organize
                </Button>
                <Button
                  variant="subtle"
                  size="sm"
                  leftIcon={<Sparkles className="w-4 h-4" />}
                  onClick={() => loadSampleDocument()}
                  className="w-full sm:w-auto"
                >
                  Try Sample PDF
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto space-y-4">
            {/* Status bar */}
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>
                Document: <strong className="text-slate-700 dark:text-slate-300">{fileName}</strong> • {numPages} total pages
              </span>
              <span>
                {selectedIndices.length} page(s) selected
              </span>
            </div>

            {/* Visual Pages Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {Array.from({ length: numPages }, (_, idx) => (
                <OrganizePageCard
                  key={`${idx}-${numPages}`}
                  pdfDoc={pdfDoc}
                  pageIndex={idx}
                  isSelected={selectedIndices.includes(idx)}
                  isFirst={idx === 0}
                  isLast={idx === numPages - 1}
                  onToggleSelect={handleToggleSelect}
                  onRotate={(p) => handleRotate([p])}
                  onDelete={(p) => handleDelete([p])}
                  onDuplicate={(p) => handleDuplicate([p])}
                  onMoveLeft={handleMoveLeft}
                  onMoveRight={handleMoveRight}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals for Merge, Split, Crop */}
      <MergeModal
        isOpen={activeModal === 'merge'}
        onClose={() => setActiveModal('none')}
      />
      <SplitModal
        isOpen={activeModal === 'split'}
        onClose={() => setActiveModal('none')}
      />
      <CropModal
        isOpen={activeModal === 'crop'}
        onClose={() => setActiveModal('none')}
        selectedPageIndices={selectedIndices}
      />
    </div>
  )
}

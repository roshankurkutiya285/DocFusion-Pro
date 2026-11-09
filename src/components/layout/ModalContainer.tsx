import React from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useAppStore } from '@/stores/useAppStore'
import { useDocumentStore } from '@/stores/useDocumentStore'
import { Layers, Download, Shield } from 'lucide-react'

import { downloadPdfBlob } from '@/services/organizeService'

export const ModalContainer: React.FC = () => {
  const { activeModal, closeModal, addToast } = useAppStore()
  const { fileName, isReady, getSafeFileData } = useDocumentStore()

  const shortcutsList = [
    { key: 'Ctrl + O', desc: 'Open PDF Document' },
    { key: 'Ctrl + S', desc: 'Export / Save PDF' },
    { key: 'Ctrl + F', desc: 'Find / Search Text in Document' },
    { key: 'Ctrl + Z', desc: 'Undo Last Action' },
    { key: 'Ctrl + Y', desc: 'Redo Action' },
    { key: 'Ctrl + +', desc: 'Zoom In' },
    { key: 'Ctrl + -', desc: 'Zoom Out' },
    { key: 'Ctrl + 0', desc: 'Reset Zoom (100%)' },
    { key: 'Ctrl + R', desc: 'Rotate Document Clockwise' },
    { key: 'PageUp / ←', desc: 'Previous Page' },
    { key: 'PageDown / →', desc: 'Next Page' },
    { key: 'Ctrl + /', desc: 'Open Keyboard Shortcuts' },
    { key: 'Esc', desc: 'Close Active Modal / Dialog' },
  ]

  const handleExport = async () => {
    try {
      const safeBuffer = await getSafeFileData()
      const name = fileName || 'DocFusion_Export.pdf'
      downloadPdfBlob(new Uint8Array(safeBuffer), name)
      addToast({
        title: 'PDF Exported',
        message: `${name} has been successfully downloaded.`,
        type: 'success',
      })
      closeModal()
    } catch {
      addToast({
        title: 'No Document',
        message: 'No document buffer available to export.',
        type: 'warning',
      })
    }
  }

  return (
    <>
      {/* Shortcuts Modal */}
      <Modal
        isOpen={activeModal === 'shortcuts'}
        onClose={closeModal}
        title="Keyboard Shortcuts"
        description="Navigate and manage DocFusion Pro like a power user"
        maxWidth="lg"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 py-2">
          {shortcutsList.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200/60 dark:border-slate-700/60"
            >
              <span className="text-xs text-slate-700 dark:text-slate-300">
                {item.desc}
              </span>
              <kbd className="px-1.5 py-0.5 text-[11px] font-mono font-medium bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded shadow-xs">
                {item.key}
              </kbd>
            </div>
          ))}
        </div>
        <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
          <Button size="sm" variant="secondary" onClick={closeModal}>
            Done
          </Button>
        </div>
      </Modal>

      {/* Export Modal */}
      <Modal
        isOpen={activeModal === 'export'}
        onClose={closeModal}
        title="Save & Export Document"
        description="Choose export options for your document"
      >
        <div className="space-y-4 py-2">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-3">
            <Download className="w-6 h-6 text-brand-500 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {fileName || 'document.pdf'}
              </p>
              <p className="text-[11px] text-slate-500">
                Ready for standard PDF export
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-md text-emerald-800 dark:text-emerald-300 text-xs">
            <Shield className="w-4 h-4 shrink-0" />
            <span>Files are processed 100% locally on your machine.</span>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800 mt-3">
          <Button size="sm" variant="ghost" onClick={closeModal}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="primary"
            disabled={!isReady}
            onClick={handleExport}
          >
            Download PDF
          </Button>
        </div>
      </Modal>

      {/* About Modal */}
      <Modal
        isOpen={activeModal === 'about'}
        onClose={closeModal}
        title="About DocFusion Pro"
        description="Professional All-in-One Desktop-Grade PDF Suite"
      >
        <div className="flex flex-col items-center text-center py-4 space-y-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-md">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              DocFusion Pro
            </h3>
            <p className="text-xs text-brand-600 dark:text-brand-400 font-medium">
              Version 1.0.0 • Production Build
            </p>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
            High-performance offline-first PDF workstation equipped with viewing,
            organizing, editing, stamping, converting, and optimization engines.
          </p>
        </div>
        <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button size="sm" variant="primary" onClick={closeModal}>
            Close
          </Button>
        </div>
      </Modal>
    </>
  )
}

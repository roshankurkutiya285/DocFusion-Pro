import React, { useRef } from 'react'
import { Eye, Sparkles, FolderOpen } from 'lucide-react'
import { useDocumentStore } from '@/stores/useDocumentStore'
import { Button } from '@/components/ui/Button'
import { PdfViewer } from '@/components/viewer/PdfViewer'

export const ViewerPage: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const {
    isReady,
    pdfDoc,
    isLoading,
    loadDocument,
    loadSampleDocument,
  } = useDocumentStore()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      loadDocument(file)
    }
    e.target.value = ''
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-200/70 dark:bg-slate-900/80">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      {!isReady || !pdfDoc ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-desktop border border-slate-200 dark:border-slate-800 text-center">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-950/70 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto mb-4 border border-brand-200 dark:border-brand-800/80 shadow-inner">
              <Eye className="w-7 h-7" />
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1.5">
              High-Speed Offline PDF Viewer
            </h3>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              Experience instant document rendering with continuous vertical scrolling, thumbnail previews, high-DPI canvas fidelity, and smooth zooming.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <Button
                variant="primary"
                size="sm"
                isLoading={isLoading}
                leftIcon={<FolderOpen className="w-4 h-4" />}
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto"
              >
                Open PDF Document
              </Button>

              <Button
                variant="subtle"
                size="sm"
                isLoading={isLoading}
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
        <PdfViewer />
      )}
    </div>
  )
}

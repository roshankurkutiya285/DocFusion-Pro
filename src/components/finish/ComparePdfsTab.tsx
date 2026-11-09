import React, { useState, useRef, useEffect } from 'react'
import {
  GitCompare,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Columns,
  Eye,
  FileText,
  ArrowLeftRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useDocumentStore } from '@/stores/useDocumentStore'
import { useAppStore } from '@/stores/useAppStore'
import {
  comparePdfPage,
  type PageCompareResult,
} from '@/services/finishService'
import { loadPdfDocument } from '@/services/pdfService'

export const ComparePdfsTab: React.FC = () => {
  const { fileName, getSafeFileData } = useDocumentStore()
  const { addToast } = useAppStore()

  // Document A (Original)
  const [docABuffer, setDocABuffer] = useState<ArrayBuffer | null>(null)
  const [docAName, setDocAName] = useState<string>(fileName || 'Document-A.pdf')
  const [docAPages, setDocAPages] = useState<number>(0)

  useEffect(() => {
    if (!docABuffer) {
      getSafeFileData()
        .then((buf) => {
          setDocABuffer(buf)
          if (fileName) setDocAName(fileName)
        })
        .catch(() => {})
    }
  }, [getSafeFileData, docABuffer, fileName])

  // Document B (Modified)
  const [docBBuffer, setDocBBuffer] = useState<ArrayBuffer | null>(null)
  const [docBName, setDocBName] = useState<string>('')
  const [docBPages, setDocBPages] = useState<number>(0)

  // Comparison State
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [compareMode, setCompareMode] = useState<'side-by-side' | 'visual-diff' | 'text-diff'>('visual-diff')
  const [isComparing, setIsComparing] = useState(false)
  const [result, setResult] = useState<PageCompareResult | null>(null)

  const fileInputARef = useRef<HTMLInputElement>(null)
  const fileInputBRef = useRef<HTMLInputElement>(null)

  // Max pages between the two documents
  const maxPages = Math.max(docAPages, docBPages, 1)

  // Probe pages whenever buffers change
  useEffect(() => {
    if (docABuffer) {
      loadPdfDocument(docABuffer)
        .then((doc) => setDocAPages(doc.numPages))
        .catch(() => setDocAPages(1))
    }
  }, [docABuffer])

  useEffect(() => {
    if (docBBuffer) {
      loadPdfDocument(docBBuffer)
        .then((doc) => setDocBPages(doc.numPages))
        .catch(() => setDocBPages(1))
    }
  }, [docBBuffer])

  // Run page comparison whenever page changes or documents are ready
  const runComparison = React.useCallback(async (pageNum = currentPage) => {
    if (!docABuffer || !docBBuffer) return
    setIsComparing(true)
    try {
      const res = await comparePdfPage(docABuffer, docBBuffer, pageNum, 1.5)
      setResult(res)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to compare page versions.'
      addToast({
        type: 'error',
        title: 'Comparison Error',
        message,
      })
    } finally {
      setIsComparing(false)
    }
  }, [docABuffer, docBBuffer, currentPage, addToast])

  // Trigger comparison when both docs are present
  useEffect(() => {
    if (docABuffer && docBBuffer) {
      runComparison(currentPage)
    }
  }, [docABuffer, docBBuffer, currentPage, runComparison])

  // Handle uploading Doc A
  const handleUploadA = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setDocABuffer(ev.target?.result as ArrayBuffer)
      setDocAName(file.name)
      setCurrentPage(1)
      setResult(null)
    }
    reader.readAsArrayBuffer(file)
  }

  // Handle uploading Doc B
  const handleUploadB = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setDocBBuffer(ev.target?.result as ArrayBuffer)
      setDocBName(file.name)
      setCurrentPage(1)
      setResult(null)
    }
    reader.readAsArrayBuffer(file)
  }

  // Swap Document A and B
  const handleSwapDocs = () => {
    const tempBuf = docABuffer
    const tempName = docAName
    const tempPages = docAPages

    setDocABuffer(docBBuffer)
    setDocAName(docBName)
    setDocAPages(docBPages)

    setDocBBuffer(tempBuf)
    setDocBName(tempName)
    setDocBPages(tempPages)
    setResult(null)
  }

  return (
    <div className="space-y-6">
      <input
        ref={fileInputARef}
        type="file"
        accept="application/pdf"
        onChange={handleUploadA}
        className="hidden"
      />
      <input
        ref={fileInputBRef}
        type="file"
        accept="application/pdf"
        onChange={handleUploadB}
        className="hidden"
      />

      {/* Top Document Loaders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Document A */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold shrink-0 text-sm">
              A
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Original Revision
              </span>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                {docABuffer ? docAName : 'No Document Selected'}
              </p>
              {docAPages > 0 && (
                <p className="text-[10px] text-slate-400">{docAPages} Pages</p>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputARef.current?.click()}
          >
            {docABuffer ? 'Change A' : 'Select A'}
          </Button>
        </div>

        {/* Document B */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold shrink-0 text-sm">
              B
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Modified Revision
              </span>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                {docBBuffer ? docBName : 'Select Document to Compare'}
              </p>
              {docBPages > 0 && (
                <p className="text-[10px] text-slate-400">{docBPages} Pages</p>
              )}
            </div>
          </div>
          <Button
            variant={docBBuffer ? 'outline' : 'primary'}
            size="sm"
            onClick={() => fileInputBRef.current?.click()}
          >
            {docBBuffer ? 'Change B' : 'Select B'}
          </Button>
        </div>
      </div>

      {(!docABuffer || !docBBuffer) && (
        <div className="p-12 text-center border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-2xl bg-white/40 dark:bg-slate-900/40">
          <GitCompare className="w-10 h-10 text-slate-400 mx-auto mb-3 opacity-50" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
            Compare Two PDF Revisions
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4">
            Select both Document A and Document B above to inspect visual pixel modifications, text alterations, and layout differences side-by-side.
          </p>
        </div>
      )}

      {docABuffer && docBBuffer && (
        <div className="space-y-4">
          {/* Navigation & Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-xs">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
              {[
                { id: 'visual-diff' as const, label: 'Visual Diff', icon: Eye },
                { id: 'side-by-side' as const, label: 'Side-by-Side', icon: Columns },
                { id: 'text-diff' as const, label: 'Text Changes', icon: FileText },
              ].map((m) => {
                const Icon = m.icon
                const isActive = compareMode === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setCompareMode(m.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition ${
                      isActive
                        ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{m.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Page Navigator */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={currentPage <= 1 || isComparing}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Page {currentPage} of {maxPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={currentPage >= maxPages || isComparing}
                onClick={() => setCurrentPage((p) => Math.min(maxPages, p + 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Difference Badge & Swap */}
            <div className="flex items-center gap-3">
              {result && (
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                    result.differencePercentage > 0.05
                      ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300'
                      : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                  }`}
                >
                  {result.differencePercentage > 0.05 ? (
                    <>
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{result.differencePercentage.toFixed(2)}% Difference</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Identical Pages</span>
                    </>
                  )}
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                leftIcon={<ArrowLeftRight className="w-3.5 h-3.5" />}
                onClick={handleSwapDocs}
              >
                Swap A / B
              </Button>
            </div>
          </div>

          {/* Comparison Viewport */}
          {isComparing ? (
            <div className="h-96 flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <RefreshCw className="w-8 h-8 text-brand-500 animate-spin mb-3" />
              <p className="text-xs text-slate-500">Comparing page {currentPage}...</p>
            </div>
          ) : result ? (
            <div>
              {/* 1. VISUAL DIFF OVERLAY */}
              {compareMode === 'visual-diff' && (
                <div className="bg-slate-900 rounded-xl p-6 flex flex-col items-center justify-center border border-slate-800 shadow-inner">
                  <div className="mb-3 flex items-center gap-4 text-xs text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
                      <strong>Red highlight</strong>: Modified or added elements
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-slate-500 inline-block" />
                      Muted: Identical content
                    </span>
                  </div>
                  <div className="max-h-[640px] overflow-auto rounded-lg shadow-2xl bg-white/10 p-2 border border-slate-700/50">
                    <img
                      src={result.diffCanvasUrl}
                      alt={`Diff page ${currentPage}`}
                      className="max-h-[580px] object-contain rounded"
                    />
                  </div>
                </div>
              )}

              {/* 2. SIDE-BY-SIDE */}
              {compareMode === 'side-by-side' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left: Doc A */}
                  <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center">
                    <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span>Doc A: {docAName} (Page {currentPage})</span>
                    </div>
                    <div className="max-h-[540px] overflow-auto w-full flex items-center justify-center bg-slate-100 dark:bg-slate-950 p-2 rounded-lg">
                      {result.canvasAUrl ? (
                        <img
                          src={result.canvasAUrl}
                          alt="Doc A Page"
                          className="max-h-[500px] object-contain rounded shadow"
                        />
                      ) : (
                        <p className="text-xs text-slate-400">Page does not exist in Doc A</p>
                      )}
                    </div>
                  </div>

                  {/* Right: Doc B */}
                  <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center">
                    <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span>Doc B: {docBName} (Page {currentPage})</span>
                    </div>
                    <div className="max-h-[540px] overflow-auto w-full flex items-center justify-center bg-slate-100 dark:bg-slate-950 p-2 rounded-lg">
                      {result.canvasBUrl ? (
                        <img
                          src={result.canvasBUrl}
                          alt="Doc B Page"
                          className="max-h-[500px] object-contain rounded shadow"
                        />
                      ) : (
                        <p className="text-xs text-slate-400">Page does not exist in Doc B</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 3. TEXT DIFF */}
              {compareMode === 'text-diff' && (
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      +{result.textDifferences.added.length} Words Added in B
                    </span>
                    <span className="text-rose-600 dark:text-rose-400 font-bold">
                      -{result.textDifferences.removed.length} Words Removed from A
                    </span>
                    <span className="text-slate-400 font-medium">
                      {result.textDifferences.unchanged.length} Words Unchanged
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-500">Document A Text:</span>
                      <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg max-h-80 overflow-y-auto font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                        {result.textA || '(No text found on this page)'}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-500">Document B Text:</span>
                      <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg max-h-80 overflow-y-auto font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                        {result.textB || '(No text found on this page)'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

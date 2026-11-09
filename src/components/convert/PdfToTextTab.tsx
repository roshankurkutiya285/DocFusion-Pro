import React, { useState, useRef, useMemo } from 'react'
import {
  FileText,
  UploadCloud,
  Download,
  Copy,
  Check,
  Search,
  RefreshCw,
  Code2,
  FileCode,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { useDocumentStore } from '@/stores/useDocumentStore'
import { useAppStore } from '@/stores/useAppStore'
import {
  pdfToText,
  type PdfTextResult,
  type PdfToTextOptions,
} from '@/services/convertService'
import { loadPdfDocument } from '@/services/pdfService'

export const PdfToTextTab: React.FC = () => {
  const { fileData, fileName, numPages, getSafeFileData } = useDocumentStore()
  const { addToast } = useAppStore()

  // Local file override if user wants to convert a different PDF
  const [customBuffer, setCustomBuffer] = useState<ArrayBuffer | null>(null)
  const [customFileName, setCustomFileName] = useState<string>('')
  const [customNumPages, setCustomNumPages] = useState<number>(0)

  // Settings
  const [format, setFormat] = useState<'plain' | 'markdown' | 'json'>('plain')
  const [rangeMode, setRangeMode] = useState<'all' | 'odd' | 'even' | 'custom'>('all')
  const [customRangeStr, setCustomRangeStr] = useState<string>('')
  const [includePageHeaders, setIncludePageHeaders] = useState(true)
  const [normalizeWhitespace, setNormalizeWhitespace] = useState(true)

  // Extraction State
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractProgress, setExtractProgress] = useState<{ current: number; total: number } | null>(null)
  const [result, setResult] = useState<PdfTextResult | null>(null)
  const [isCopied, setIsCopied] = useState(false)
  const [activeViewMode, setActiveViewMode] = useState<'combined' | 'by-page'>('combined')
  const [selectedPageNum, setSelectedPageNum] = useState<number>(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [wrapLines, setWrapLines] = useState(true)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Active buffer & file name
  const activeBuffer = customBuffer || fileData
  const activeName = customFileName || fileName || 'document.pdf'
  const activePages = customBuffer ? customNumPages : numPages

  // Handle uploaded PDF
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      addToast({
        type: 'error',
        title: 'Invalid File',
        message: 'Please select a valid PDF file.',
      })
      return
    }

    const reader = new FileReader()
    reader.onload = async (event) => {
      const buffer = event.target?.result as ArrayBuffer
      setCustomBuffer(buffer)
      setCustomFileName(file.name)
      setResult(null)
      try {
        const doc = await loadPdfDocument(buffer)
        setCustomNumPages(doc.numPages)
      } catch {
        setCustomNumPages(1)
      }
      addToast({
        type: 'info',
        title: 'PDF Loaded',
        message: `Loaded ${file.name} for text extraction.`,
      })
    }
    reader.readAsArrayBuffer(file)
  }

  // Parse page range into 0-indexed indices
  const getSelectedIndices = (): number[] => {
    const total = activePages || 1
    if (rangeMode === 'all') {
      return Array.from({ length: total }, (_, i) => i)
    }
    if (rangeMode === 'odd') {
      return Array.from({ length: total }, (_, i) => i).filter((i) => i % 2 === 0)
    }
    if (rangeMode === 'even') {
      return Array.from({ length: total }, (_, i) => i).filter((i) => i % 2 === 1)
    }

    // custom range
    const indices: Set<number> = new Set()
    const parts = customRangeStr.split(',').map((p) => p.trim())
    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map((n) => parseInt(n.trim(), 10))
        if (!isNaN(start) && !isNaN(end)) {
          const min = Math.max(1, Math.min(start, end))
          const max = Math.min(total, Math.max(start, end))
          for (let p = min; p <= max; p++) {
            indices.add(p - 1)
          }
        }
      } else {
        const page = parseInt(part, 10)
        if (!isNaN(page) && page >= 1 && page <= total) {
          indices.add(page - 1)
        }
      }
    }
    return Array.from(indices).sort((a, b) => a - b)
  }

  // Execute Extraction
  const handleExtract = async () => {
    let bufferToUse = customBuffer
    if (!bufferToUse) {
      try {
        bufferToUse = await getSafeFileData()
      } catch {
        addToast({
          type: 'error',
          title: 'No PDF loaded',
          message: 'Please load a PDF to extract text.',
        })
        return
      }
    }

    const targetIndices = getSelectedIndices()
    if (targetIndices.length === 0) {
      addToast({
        type: 'warning',
        title: 'No pages selected',
        message: 'Please specify a valid page range.',
      })
      return
    }

    setIsExtracting(true)
    setExtractProgress({ current: 0, total: targetIndices.length })
    try {
      const options: PdfToTextOptions = {
        format,
        includePageNumbers: includePageHeaders,
        normalizeWhitespace,
        pageIndices: targetIndices,
      }

      const res = await pdfToText(bufferToUse, options, (cur, tot) => {
        setExtractProgress({ current: cur, total: tot })
      })

      setResult(res)
      if (res.pages.length > 0) {
        setSelectedPageNum(res.pages[0].pageNumber)
      }

      addToast({
        type: 'success',
        title: 'Extraction Complete',
        message: `Extracted ${res.totalWords.toLocaleString()} words across ${res.pageCount} page(s).`,
      })
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Extraction Failed',
        message: err.message || 'Failed to extract text streams.',
      })
    } finally {
      setIsExtracting(false)
      setExtractProgress(null)
    }
  }

  // Copy text to clipboard
  const handleCopy = async () => {
    if (!result) return
    const textToCopy =
      activeViewMode === 'by-page'
        ? result.pages.find((p) => p.pageNumber === selectedPageNum)?.text || ''
        : result.fullText

    await navigator.clipboard.writeText(textToCopy)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
    addToast({
      type: 'success',
      title: 'Copied to Clipboard',
      message: 'Text copied to your system clipboard.',
    })
  }

  // Download text file
  const handleDownload = () => {
    if (!result) return
    const ext = format === 'markdown' ? 'md' : format === 'json' ? 'json' : 'txt'
    const mime =
      format === 'markdown'
        ? 'text/markdown'
        : format === 'json'
        ? 'application/json'
        : 'text/plain'

    const blob = new Blob([result.fullText], { type: `${mime};charset=utf-8` })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeName.replace(/\.pdf$/i, '')}-extracted.${ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Text content to display in viewer
  const displayedText = useMemo(() => {
    if (!result) return ''
    if (activeViewMode === 'by-page') {
      const page = result.pages.find((p) => p.pageNumber === selectedPageNum)
      return page ? page.text : ''
    }
    return result.fullText
  }, [result, activeViewMode, selectedPageNum])

  // Count search query matches
  const searchMatchesCount = useMemo(() => {
    if (!searchQuery.trim() || !displayedText) return 0
    try {
      const regex = new RegExp(searchQuery.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi')
      const matches = displayedText.match(regex)
      return matches ? matches.length : 0
    } catch {
      return 0
    }
  }, [searchQuery, displayedText])

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handlePdfUpload}
        className="hidden"
      />

      {/* Top Banner / Document Source */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span>{activeName}</span>
              {activePages > 0 && (
                <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-600 dark:text-slate-400">
                  {activePages} Pages
                </span>
              )}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {activeBuffer
                ? 'Document loaded. Configure text formatting and extraction below.'
                : 'No document loaded. Upload a PDF file to extract clean text.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<UploadCloud className="w-3.5 h-3.5" />}
            onClick={() => fileInputRef.current?.click()}
          >
            {activeBuffer ? 'Switch PDF' : 'Upload PDF'}
          </Button>
        </div>
      </div>

      {activeBuffer && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Settings Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Extraction Options
                  </h4>
                </div>

                {/* Format */}
                <div>
                  <label className="font-medium text-xs text-slate-700 dark:text-slate-300 block mb-1">
                    Output Format:
                  </label>
                  <div className="grid grid-cols-3 gap-1 text-xs">
                    {[
                      { id: 'plain', label: 'TXT', icon: FileText },
                      { id: 'markdown', label: 'MD', icon: FileCode },
                      { id: 'json', label: 'JSON', icon: Code2 },
                    ].map((fmt) => {
                      const Icon = fmt.icon
                      return (
                        <button
                          key={fmt.id}
                          type="button"
                          onClick={() => setFormat(fmt.id as any)}
                          className={`p-1.5 rounded-lg border text-center font-semibold flex flex-col items-center gap-0.5 ${
                            format === fmt.id
                              ? 'border-brand-500 bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span className="text-[10px]">{fmt.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Page Scope */}
                <div>
                  <label className="font-medium text-xs text-slate-700 dark:text-slate-300 block mb-1">
                    Page Scope:
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    {[
                      { id: 'all', label: 'All Pages' },
                      { id: 'odd', label: 'Odd Pages' },
                      { id: 'even', label: 'Even Pages' },
                      { id: 'custom', label: 'Custom' },
                    ].map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setRangeMode(r.id as any)}
                        className={`p-1.5 rounded-lg border text-center font-medium ${
                          rangeMode === r.id
                            ? 'border-brand-500 bg-brand-50 dark:bg-brand-950 font-bold text-brand-700 dark:text-brand-300'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>

                  {rangeMode === 'custom' && (
                    <div className="mt-2">
                      <input
                        type="text"
                        value={customRangeStr}
                        onChange={(e) => setCustomRangeStr(e.target.value)}
                        placeholder="e.g. 1, 3-5, 8"
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200"
                      />
                    </div>
                  )}
                </div>

                {/* Clean-up checkboxes */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="incHeaders"
                      checked={includePageHeaders}
                      onChange={(e) => setIncludePageHeaders(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-brand-600 accent-brand-600 cursor-pointer"
                    />
                    <label
                      htmlFor="incHeaders"
                      className="text-xs text-slate-600 dark:text-slate-300 cursor-pointer"
                    >
                      Include Page Header Breaks
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="normSpaces"
                      checked={normalizeWhitespace}
                      onChange={(e) => setNormalizeWhitespace(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-brand-600 accent-brand-600 cursor-pointer"
                    />
                    <label
                      htmlFor="normSpaces"
                      className="text-xs text-slate-600 dark:text-slate-300 cursor-pointer"
                    >
                      Normalize Whitespace
                    </label>
                  </div>
                </div>

                {/* Extract Button */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full justify-center"
                    leftIcon={
                      isExtracting ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )
                    }
                    disabled={isExtracting}
                    onClick={handleExtract}
                  >
                    {isExtracting
                      ? `Extracting (${extractProgress?.current || 0}/${extractProgress?.total || 0})...`
                      : 'Extract Text'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results Area */}
          <div className="lg:col-span-3 space-y-4">
            {/* Action Bar & Stats */}
            {result && (
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {result.totalWords.toLocaleString()}
                    </span>{' '}
                    <span className="text-slate-400">words</span>
                  </div>
                  <div className="h-3 w-px bg-slate-300 dark:bg-slate-700" />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {result.totalChars.toLocaleString()}
                    </span>{' '}
                    <span className="text-slate-400">chars</span>
                  </div>
                  <div className="h-3 w-px bg-slate-300 dark:bg-slate-700" />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {result.totalLines.toLocaleString()}
                    </span>{' '}
                    <span className="text-slate-400">lines</span>
                  </div>
                  <div className="h-3 w-px bg-slate-300 dark:bg-slate-700" />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {result.pageCount}
                    </span>{' '}
                    <span className="text-slate-400">pages</span>
                  </div>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setActiveViewMode('combined')}
                      className={`px-2.5 py-1 rounded-md font-medium transition ${
                        activeViewMode === 'combined'
                          ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Combined
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveViewMode('by-page')}
                      className={`px-2.5 py-1 rounded-md font-medium transition ${
                        activeViewMode === 'by-page'
                          ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      By Page
                    </button>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={
                      isCopied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )
                    }
                    onClick={handleCopy}
                  >
                    {isCopied ? 'Copied' : 'Copy'}
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                    onClick={handleDownload}
                  >
                    Download .{format === 'markdown' ? 'md' : format === 'json' ? 'json' : 'txt'}
                  </Button>
                </div>
              </div>
            )}

            {/* Viewer Card */}
            {!result ? (
              <div className="p-12 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl bg-white/40 dark:bg-slate-900/40">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Ready to Extract Text
                </p>
                <p className="text-xs text-slate-400 mb-4">
                  Extract pure text streams, markdown formatting, or structural JSON from your PDF.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExtract}
                  disabled={isExtracting}
                >
                  Start Extraction
                </Button>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                {/* Search & Tool Ribbon */}
                <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                  {/* Search Bar */}
                  <div className="relative flex-1 max-w-xs">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search text in document..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-16 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                    />
                    {searchQuery.trim() && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400">
                        {searchMatchesCount} {searchMatchesCount === 1 ? 'match' : 'matches'}
                      </span>
                    )}
                  </div>

                  {/* Page selector when viewing by-page */}
                  {activeViewMode === 'by-page' && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 font-medium">Page:</span>
                      <div className="flex items-center gap-1">
                        {result.pages.map((p) => (
                          <button
                            key={p.pageNumber}
                            type="button"
                            onClick={() => setSelectedPageNum(p.pageNumber)}
                            className={`w-6 h-6 rounded flex items-center justify-center font-bold text-[11px] ${
                              selectedPageNum === p.pageNumber
                                ? 'bg-brand-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                            }`}
                          >
                            {p.pageNumber}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Line wrap switch */}
                  <div className="flex items-center gap-1.5 ml-auto">
                    <input
                      type="checkbox"
                      id="wrapToggle"
                      checked={wrapLines}
                      onChange={(e) => setWrapLines(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-brand-600 cursor-pointer"
                    />
                    <label htmlFor="wrapToggle" className="text-slate-500 cursor-pointer">
                      Wrap Lines
                    </label>
                  </div>
                </div>

                {/* Text Content */}
                <div className="p-4 max-h-[500px] overflow-auto bg-slate-50/50 dark:bg-slate-950/40">
                  <pre
                    className={`font-mono text-xs leading-relaxed text-slate-800 dark:text-slate-200 ${
                      wrapLines ? 'whitespace-pre-wrap' : 'whitespace-pre overflow-x-auto'
                    }`}
                  >
                    {displayedText || (
                      <span className="text-slate-400 italic">
                        (No readable text found on this page)
                      </span>
                    )}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

import React, { useState, useRef } from 'react'
import {
  Eye,
  UploadCloud,
  Download,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Languages,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { useDocumentStore } from '@/stores/useDocumentStore'
import { useAppStore } from '@/stores/useAppStore'
import {
  ocrPdfPage,
  type OcrResult,
  type OcrProgressInfo,
} from '@/services/ocrService'
import { loadPdfDocument } from '@/services/pdfService'

export const OcrTab: React.FC = () => {
  const { fileData, fileName, numPages, getSafeFileData } = useDocumentStore()
  const { addToast } = useAppStore()

  // Local file override if user wants to OCR another PDF
  const [customBuffer, setCustomBuffer] = useState<ArrayBuffer | null>(null)
  const [customFileName, setCustomFileName] = useState<string>('')
  const [customNumPages, setCustomNumPages] = useState<number>(0)

  // OCR settings
  const [language, setLanguage] = useState<string>('eng')
  const [selectedPage, setSelectedPage] = useState<number>(1)

  // OCR execution state
  const [isProcessing, setIsProcessing] = useState(false)
  const [progressInfo, setProgressInfo] = useState<OcrProgressInfo | null>(null)
  const [result, setResult] = useState<OcrResult | null>(null)
  const [isCopied, setIsCopied] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const activeBuffer = customBuffer || fileData
  const activeName = customFileName || fileName || 'document.pdf'
  const activePages = customBuffer ? customNumPages : numPages

  // Handle uploaded file
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (ev) => {
      const buffer = ev.target?.result as ArrayBuffer
      setCustomBuffer(buffer)
      setCustomFileName(file.name)
      setSelectedPage(1)
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
        message: `Loaded ${file.name} for OCR processing.`,
      })
    }
    reader.readAsArrayBuffer(file)
  }

  // Run OCR
  const handleRunOcr = async () => {
    let bufferToUse = customBuffer
    if (!bufferToUse) {
      try {
        bufferToUse = await getSafeFileData()
      } catch {
        addToast({
          type: 'error',
          title: 'No PDF loaded',
          message: 'Please load a PDF to process OCR.',
        })
        return
      }
    }

    setIsProcessing(true)
    setProgressInfo({ status: 'Starting OCR...', progress: 0.05 })
    try {
      const res = await ocrPdfPage(
        bufferToUse,
        selectedPage,
        language,
        (info) => setProgressInfo(info)
      )
      setResult(res)
      addToast({
        type: 'success',
        title: 'OCR Finished',
        message: `Recognized ${res.wordCount} words on Page ${selectedPage} (${res.confidence}% confidence).`,
      })
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'OCR Failed',
        message: err.message || 'Error occurred while recognizing text.',
      })
    } finally {
      setIsProcessing(false)
      setProgressInfo(null)
    }
  }

  // Copy text to clipboard
  const handleCopy = async () => {
    if (!result) return
    await navigator.clipboard.writeText(result.text)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
    addToast({
      type: 'success',
      title: 'Copied',
      message: 'OCR text copied to clipboard.',
    })
  }

  // Download text file
  const handleDownload = () => {
    if (!result) return
    const blob = new Blob([result.text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeName.replace(/\.pdf$/i, '')}-page-${selectedPage}-ocr.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

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
          <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
            <Eye className="w-5 h-5" />
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
                ? 'Extract searchable and selectable text from scanned raster documents.'
                : 'No document loaded. Upload a PDF file to run character recognition.'}
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
              <CardContent className="p-4 space-y-4 text-xs">
                <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <Languages className="w-4 h-4 text-teal-500" />
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    OCR Language & Scope
                  </h4>
                </div>

                {/* Language Picker */}
                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Recognition Language:
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200"
                  >
                    <option value="eng">English (Latin)</option>
                    <option value="spa">Spanish (Español)</option>
                    <option value="fra">French (Français)</option>
                    <option value="deu">German (Deutsch)</option>
                    <option value="ita">Italian (Italiano)</option>
                    <option value="por">Portuguese (Português)</option>
                    <option value="chi_sim">Chinese Simplified (简体中文)</option>
                    <option value="jpn">Japanese (日本語)</option>
                  </select>
                </div>

                {/* Page Selector */}
                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Target Page:
                  </label>
                  <select
                    value={selectedPage}
                    onChange={(e) => setSelectedPage(parseInt(e.target.value, 10))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200"
                  >
                    {Array.from({ length: activePages || 1 }, (_, i) => i + 1).map((p) => (
                      <option key={p} value={p}>
                        Page {p}
                      </option>
                    ))}
                  </select>
                </div>

                {/* OCR Action */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full justify-center bg-teal-600 hover:bg-teal-700 text-white"
                    leftIcon={
                      isProcessing ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )
                    }
                    disabled={isProcessing}
                    onClick={handleRunOcr}
                  >
                    {isProcessing ? 'Processing OCR...' : 'Run Character Recognition'}
                  </Button>
                </div>

                {/* Progress bar */}
                {isProcessing && progressInfo && (
                  <div className="space-y-1">
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-teal-500 h-full transition-all duration-200"
                        style={{
                          width: `${Math.round(progressInfo.progress * 100)}%`,
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 text-center capitalize">
                      {progressInfo.status} ({Math.round(progressInfo.progress * 100)}%)
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Results Viewer */}
          <div className="lg:col-span-3 space-y-4">
            {!result ? (
              <div className="p-12 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl bg-white/40 dark:bg-slate-900/40">
                <Sparkles className="w-8 h-8 text-teal-500 mx-auto mb-2 opacity-40" />
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ready to Recognize Characters
                </h4>
                <p className="text-xs text-slate-400 mb-4 max-w-sm mx-auto">
                  Select your language and page number on the left, then click Run Character Recognition.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRunOcr}
                  disabled={isProcessing}
                >
                  Start OCR
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Stats & Actions Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Page {result.pageNumber} OCR Results
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
                      {result.confidence}% Confidence
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      {result.wordCount} words • {result.charCount} characters
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      onClick={handleCopy}
                    >
                      {isCopied ? 'Copied' : 'Copy Text'}
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<Download className="w-3.5 h-3.5" />}
                      onClick={handleDownload}
                    >
                      Download .txt
                    </Button>
                  </div>
                </div>

                {/* Side-by-Side: Scan vs Recognized Text */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left: Rendered Page Preview */}
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 shadow-sm flex flex-col items-center">
                    <span className="text-xs font-bold text-slate-500 mb-2 w-full">
                      Document Page Image:
                    </span>
                    <div className="max-h-[500px] overflow-auto bg-slate-100 dark:bg-slate-950 p-2 rounded-lg w-full flex items-center justify-center">
                      <img
                        src={result.previewCanvasUrl}
                        alt="OCR scanned page"
                        className="max-h-[460px] object-contain rounded shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Right: Recognized Text Editor/Preview */}
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 shadow-sm flex flex-col">
                    <span className="text-xs font-bold text-slate-500 mb-2">
                      Extracted Text Content:
                    </span>
                    <div className="flex-1 max-h-[500px] overflow-auto p-3 bg-slate-50 dark:bg-slate-950 rounded-lg font-mono text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {result.text || '(No text characters recognized)'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

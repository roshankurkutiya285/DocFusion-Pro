import React, { useState, useRef } from 'react'
import {
  FileText,
  UploadCloud,
  Download,
  Copy,
  Check,
  Archive,
  RefreshCw,
  Sliders,
  Maximize2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { useDocumentStore } from '@/stores/useDocumentStore'
import { useAppStore } from '@/stores/useAppStore'
import {
  pdfToImages,
  exportImagesAsZip,
  type PdfImageResult,
  type PdfToImagesOptions,
} from '@/services/convertService'
import { loadPdfDocument } from '@/services/pdfService'

export const PdfToImagesTab: React.FC = () => {
  const { fileData, fileName, numPages, getSafeFileData } = useDocumentStore()
  const { addToast } = useAppStore()

  // Local file override if user wants to convert a different PDF
  const [customBuffer, setCustomBuffer] = useState<ArrayBuffer | null>(null)
  const [customFileName, setCustomFileName] = useState<string>('')
  const [customNumPages, setCustomNumPages] = useState<number>(0)

  // Settings
  const [format, setFormat] = useState<'png' | 'jpeg' | 'webp'>('png')
  const [quality, setQuality] = useState<number>(0.9)
  const [scale, setScale] = useState<number>(1.5)
  const [rangeMode, setRangeMode] = useState<'all' | 'odd' | 'even' | 'custom'>('all')
  const [customRangeStr, setCustomRangeStr] = useState<string>('')

  // State
  const [isRendering, setIsRendering] = useState(false)
  const [renderProgress, setRenderProgress] = useState<{ current: number; total: number } | null>(null)
  const [isZipping, setIsZipping] = useState(false)
  const [zipProgress, setZipProgress] = useState<number>(0)
  const [renderedImages, setRenderedImages] = useState<PdfImageResult[]>([])
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [previewImage, setPreviewImage] = useState<PdfImageResult | null>(null)

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
      setRenderedImages([])
      try {
        // Quick probe to get page count
        const doc = await loadPdfDocument(buffer)
        setCustomNumPages(doc.numPages)
      } catch {
        setCustomNumPages(1)
      }
      addToast({
        type: 'info',
        title: 'PDF Loaded',
        message: `Loaded ${file.name} for conversion.`,
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

  // Execute PDF to Images rendering
  const handleRender = async () => {
    let bufferToUse = customBuffer
    if (!bufferToUse) {
      try {
        bufferToUse = await getSafeFileData()
      } catch {
        addToast({
          type: 'error',
          title: 'No PDF loaded',
          message: 'Please load a PDF to render.',
        })
        return
      }
    }

    const targetIndices = getSelectedIndices()
    if (targetIndices.length === 0) {
      addToast({
        type: 'warning',
        title: 'No pages selected',
        message: 'Please specify a valid page range to convert.',
      })
      return
    }

    setIsRendering(true)
    setRenderProgress({ current: 0, total: targetIndices.length })
    try {
      const options: PdfToImagesOptions = {
        format,
        quality,
        scale,
        pageIndices: targetIndices,
      }

      const results = await pdfToImages(bufferToUse, options, (cur, tot) => {
        setRenderProgress({ current: cur, total: tot })
      })

      setRenderedImages(results)
      addToast({
        type: 'success',
        title: 'Render Complete',
        message: `Successfully rendered ${results.length} page(s) at ${scale}x scale.`,
      })
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Render Failed',
        message: err.message || 'Failed to render PDF pages.',
      })
    } finally {
      setIsRendering(false)
      setRenderProgress(null)
    }
  }

  // Download individual image
  const handleDownloadSingle = (img: PdfImageResult) => {
    const url = URL.createObjectURL(img.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeName.replace(/\.pdf$/i, '')}-${img.fileName}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Copy image to clipboard
  const handleCopyImage = async (img: PdfImageResult, index: number) => {
    try {
      // Browsers typically require PNG for clipboard image copying
      let pngBlob = img.blob
      if (img.blob.type !== 'image/png') {
        // convert via canvas
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        const tempImg = new Image()
        tempImg.src = img.dataUrl
        await new Promise((res) => (tempImg.onload = res))
        ctx?.drawImage(tempImg, 0, 0)
        pngBlob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/png'))
      }

      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': pngBlob,
        }),
      ])
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
      addToast({
        type: 'success',
        title: 'Copied to Clipboard',
        message: `Page ${img.pageNumber} image copied.`,
      })
    } catch {
      addToast({
        type: 'warning',
        title: 'Clipboard restricted',
        message: 'Direct image copy is not supported in this browser. Please use Download.',
      })
    }
  }

  // Download all as ZIP
  const handleDownloadZip = async () => {
    if (renderedImages.length === 0) return
    setIsZipping(true)
    setZipProgress(0)
    try {
      const zipBlob = await exportImagesAsZip(renderedImages, (pct) => setZipProgress(pct))
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${activeName.replace(/\.pdf$/i, '')}-images.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      addToast({
        type: 'success',
        title: 'ZIP Downloaded',
        message: `Exported ${renderedImages.length} images into a ZIP archive.`,
      })
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'ZIP Export Failed',
        message: err.message || 'Failed to generate ZIP archive.',
      })
    } finally {
      setIsZipping(false)
    }
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
          <div className="w-10 h-10 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
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
                ? 'Source PDF ready. Configure rendering parameters below.'
                : 'No PDF loaded yet. Upload a document to extract pages as images.'}
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
                  <Sliders className="w-4 h-4 text-slate-500" />
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Image Settings
                  </h4>
                </div>

                {/* Format */}
                <div>
                  <label className="font-medium text-xs text-slate-700 dark:text-slate-300 block mb-1">
                    Format:
                  </label>
                  <div className="grid grid-cols-3 gap-1 text-xs">
                    {(['png', 'jpeg', 'webp'] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFormat(f)}
                        className={`p-1.5 rounded-lg border uppercase text-center font-semibold ${
                          format === f
                            ? 'border-brand-500 bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quality Slider (for JPEG / WEBP) */}
                {format !== 'png' && (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        Quality:
                      </span>
                      <span className="font-mono text-slate-500">
                        {Math.round(quality * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={1.0}
                      step={0.05}
                      value={quality}
                      onChange={(e) => setQuality(parseFloat(e.target.value))}
                      className="w-full accent-brand-600 cursor-pointer"
                    />
                  </div>
                )}

                {/* Resolution / DPI */}
                <div>
                  <label className="font-medium text-xs text-slate-700 dark:text-slate-300 block mb-1">
                    Resolution / Scale:
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    {[
                      { val: 1.0, label: '1.0x (72 DPI)' },
                      { val: 1.5, label: '1.5x (108 DPI)' },
                      { val: 2.0, label: '2.0x (HD 144 DPI)' },
                      { val: 3.0, label: '3.0x (Ultra 216 DPI)' },
                    ].map((s) => (
                      <button
                        key={s.val}
                        type="button"
                        onClick={() => setScale(s.val)}
                        className={`p-1.5 rounded-lg border text-center font-medium ${
                          scale === s.val
                            ? 'border-brand-500 bg-brand-50 dark:bg-brand-950 font-bold text-brand-700 dark:text-brand-300'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Page Range */}
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

                {/* Render Button */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full justify-center"
                    leftIcon={
                      isRendering ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )
                    }
                    disabled={isRendering}
                    onClick={handleRender}
                  >
                    {isRendering
                      ? `Rendering (${renderProgress?.current || 0}/${renderProgress?.total || 0})...`
                      : 'Render Pages to Images'}
                  </Button>
                </div>

                {/* Rendering progress bar */}
                {isRendering && renderProgress && (
                  <div className="space-y-1">
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-brand-600 h-full transition-all duration-200"
                        style={{
                          width: `${Math.round(
                            (renderProgress.current / renderProgress.total) * 100
                          )}%`,
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 text-center">
                      Processing page {renderProgress.current} of {renderProgress.total}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Results Gallery */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                  Rendered Images ({renderedImages.length})
                </span>
                {renderedImages.length > 0 && (
                  <span className="text-xs text-slate-400">
                    Ready for single or batch zip download
                  </span>
                )}
              </div>

              {renderedImages.length > 0 && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={
                    isZipping ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Archive className="w-3.5 h-3.5" />
                    )
                  }
                  disabled={isZipping}
                  onClick={handleDownloadZip}
                >
                  {isZipping ? `Zipping (${zipProgress}%)...` : 'Download All as ZIP'}
                </Button>
              )}
            </div>

            {renderedImages.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl bg-white/40 dark:bg-slate-900/40">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  No images rendered yet
                </p>
                <p className="text-xs text-slate-400 mb-4">
                  Select your desired image format, resolution, and page range on the left, then click Render.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRender}
                  disabled={isRendering}
                >
                  Start Rendering
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto pr-1">
                {renderedImages.map((img, index) => (
                  <div
                    key={img.pageNumber}
                    className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="relative aspect-[3/4] bg-slate-100 dark:bg-slate-800/80 overflow-hidden flex items-center justify-center p-2">
                      <img
                        src={img.dataUrl}
                        alt={`Page ${img.pageNumber}`}
                        className="max-w-full max-h-full object-contain shadow-sm rounded"
                      />

                      {/* Hover action overlay */}
                      <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                        <button
                          type="button"
                          onClick={() => setPreviewImage(img)}
                          className="p-2 bg-white/90 hover:bg-white text-slate-800 rounded-lg shadow-md transition"
                          title="Preview Fullscreen"
                        >
                          <Maximize2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyImage(img, index)}
                          className="p-2 bg-white/90 hover:bg-white text-slate-800 rounded-lg shadow-md transition"
                          title="Copy Image"
                        >
                          {copiedIndex === index ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadSingle(img)}
                          className="p-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg shadow-md transition"
                          title="Download Image"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          Page {img.pageNumber}
                        </span>
                        <p className="text-[10px] text-slate-400">
                          {img.width} × {img.height} px • {(img.blob.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[11px]"
                        leftIcon={<Download className="w-3 h-3" />}
                        onClick={() => handleDownloadSingle(img)}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fullscreen Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
            <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                Page {previewImage.pageNumber} Preview ({previewImage.width} × {previewImage.height} px)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                  onClick={() => handleDownloadSingle(previewImage)}
                >
                  Download
                </Button>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-100 dark:bg-slate-950">
              <img
                src={previewImage.dataUrl}
                alt={`Full preview page ${previewImage.pageNumber}`}
                className="max-w-full max-h-[75vh] object-contain rounded shadow"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

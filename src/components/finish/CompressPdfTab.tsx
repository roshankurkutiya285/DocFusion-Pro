import React, { useState, useRef } from 'react'
import {
  Zap,
  UploadCloud,
  Download,
  Eye,
  RefreshCw,
  Sliders,
  TrendingDown,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { useDocumentStore } from '@/stores/useDocumentStore'
import { useAppStore } from '@/stores/useAppStore'
import { useNavigate } from 'react-router-dom'
import {
  compressPdf,
  type CompressionPreset,
  type CompressResult,
} from '@/services/finishService'
import { loadPdfDocument } from '@/services/pdfService'

export const CompressPdfTab: React.FC = () => {
  const navigate = useNavigate()
  const { fileData, fileName, numPages, loadBuffer, getSafeFileData } = useDocumentStore()
  const { addToast } = useAppStore()

  // Local file override if user wants to compress a different file
  const [customBuffer, setCustomBuffer] = useState<ArrayBuffer | null>(null)
  const [customFileName, setCustomFileName] = useState<string>('')
  const [customNumPages, setCustomNumPages] = useState<number>(0)

  // Settings
  const [preset, setPreset] = useState<CompressionPreset>('recommended')
  const [customScale, setCustomScale] = useState<number>(1.2)
  const [customQuality, setCustomQuality] = useState<number>(0.75)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // State
  const [isCompressing, setIsCompressing] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const [result, setResult] = useState<CompressResult | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const activeBuffer = customBuffer || fileData
  const activeName = customFileName || fileName || 'document.pdf'
  const activePages = customBuffer ? customNumPages : numPages

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  // Handle uploaded PDF
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      addToast({
        type: 'error',
        title: 'Invalid File',
        message: 'Please upload a valid PDF document.',
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
        message: `Loaded ${file.name} for compression.`,
      })
    }
    reader.readAsArrayBuffer(file)
  }

  // Execute Compression
  const handleCompress = async () => {
    let bufferToUse = customBuffer
    if (!bufferToUse) {
      try {
        bufferToUse = await getSafeFileData()
      } catch {
        addToast({
          type: 'error',
          title: 'No PDF selected',
          message: 'Please load a PDF to compress.',
        })
        return
      }
    }

    setIsCompressing(true)
    setProgress({ current: 0, total: activePages || 1 })
    try {
      const res = await compressPdf(
        bufferToUse,
        {
          preset,
          scale: showAdvanced ? customScale : undefined,
          quality: showAdvanced ? customQuality : undefined,
        },
        (cur, tot) => {
          setProgress({ current: cur, total: tot })
        }
      )

      setResult(res)
      addToast({
        type: 'success',
        title: 'Compression Complete',
        message: `Reduced size by ${res.ratioPercentage}% (${formatBytes(res.savedBytes)} saved).`,
      })
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Compression Failed',
        message: err.message || 'An error occurred during compression.',
      })
    } finally {
      setIsCompressing(false)
      setProgress(null)
    }
  }

  // Download compressed PDF
  const handleDownload = () => {
    if (!result) return
    const blob = new Blob([result.compressedBuffer], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeName.replace(/\.pdf$/i, '')}-compressed.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Open compressed PDF in viewer
  const handleOpenInViewer = async () => {
    if (!result) return
    const compName = `${activeName.replace(/\.pdf$/i, '')}-compressed.pdf`
    await loadBuffer(result.compressedBuffer, compName)
    addToast({
      type: 'success',
      title: 'Opened in Viewer',
      message: 'The compressed PDF has been loaded into your active workspace.',
    })
    navigate('/')
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
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span>{activeName}</span>
              {activeBuffer && (
                <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-600 dark:text-slate-400">
                  {formatBytes(activeBuffer.byteLength)} • {activePages} Pages
                </span>
              )}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {activeBuffer
                ? 'Document ready for compression. Select a preset level below.'
                : 'No document loaded. Upload a PDF file to reduce its size.'}
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Preset Selection & Advanced Tuning */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Compression Level
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  id: 'recommended' as const,
                  title: 'Recommended',
                  badge: 'Balanced',
                  badgeColor: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300',
                  desc: 'High size reduction with crisp typography and clean images. Optimal for email and web sharing.',
                },
                {
                  id: 'extreme' as const,
                  title: 'Extreme Compression',
                  badge: 'Smallest Size',
                  badgeColor: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300',
                  desc: 'Maximum byte reduction. Downsamples raster resolution to fit strict attachment limits.',
                },
                {
                  id: 'low' as const,
                  title: 'Low Compression',
                  badge: 'High Quality',
                  badgeColor: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300',
                  desc: 'Preserves high photographic detail while tightening stream overhead.',
                },
                {
                  id: 'lossless' as const,
                  title: 'Lossless Stream Optimization',
                  badge: '100% Quality',
                  badgeColor: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300',
                  desc: 'Compresses PDF internal object streams without altering pixel data or quality.',
                },
              ].map((p) => {
                const isSelected = preset === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setPreset(p.id)
                      setResult(null)
                    }}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-brand-500 bg-white dark:bg-slate-900 shadow-desktop text-brand-700 dark:text-brand-300 ring-1 ring-brand-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {p.title}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.badgeColor}`}>
                        {p.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {p.desc}
                    </p>
                  </button>
                )
              })}
            </div>

            {/* Advanced Tuning Accordion */}
            {preset !== 'lossless' && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5 hover:text-brand-600 transition"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>{showAdvanced ? 'Hide Custom Sliders' : 'Custom Quality & Resolution Tuning'}</span>
                </button>

                {showAdvanced && (
                  <Card className="mt-2">
                    <CardContent className="p-4 space-y-4">
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            JPEG Quality:
                          </span>
                          <span className="font-mono text-slate-500">
                            {Math.round(customQuality * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.4}
                          max={0.95}
                          step={0.05}
                          value={customQuality}
                          onChange={(e) => setCustomQuality(parseFloat(e.target.value))}
                          className="w-full accent-brand-600 cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            Render Scale / Resolution:
                          </span>
                          <span className="font-mono text-slate-500">
                            {customScale.toFixed(2)}x
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.5}
                          max={1.5}
                          step={0.1}
                          value={customScale}
                          onChange={(e) => setCustomScale(parseFloat(e.target.value))}
                          className="w-full accent-brand-600 cursor-pointer"
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Compress Action Button */}
            <div className="pt-2">
              <Button
                variant="primary"
                size="md"
                leftIcon={
                  isCompressing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )
                }
                disabled={isCompressing}
                onClick={handleCompress}
              >
                {isCompressing
                  ? `Optimizing (${progress?.current || 0}/${progress?.total || 0} pages)...`
                  : 'Compress Document'}
              </Button>
            </div>

            {/* Progress Bar */}
            {isCompressing && progress && (
              <div className="space-y-1">
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-200"
                    style={{
                      width: `${Math.round((progress.current / progress.total) * 100)}%`,
                    }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 text-center">
                  Processing page {progress.current} of {progress.total}
                </p>
              </div>
            )}
          </div>

          {/* Right Col: Compression Metrics & Results */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
                  Optimization Summary
                </h4>

                {!result ? (
                  <div className="p-8 text-center text-slate-400 text-xs space-y-2">
                    <TrendingDown className="w-8 h-8 mx-auto opacity-30 text-emerald-500" />
                    <p>Select your desired compression preset and click Compress Document.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Size Badges */}
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                          Original Size
                        </span>
                        <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                          {formatBytes(result.originalSize)}
                        </span>
                      </div>
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl border border-emerald-200 dark:border-emerald-800">
                        <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block mb-0.5">
                          Optimized Size
                        </span>
                        <span className="font-bold text-sm text-emerald-700 dark:text-emerald-300">
                          {formatBytes(result.compressedSize)}
                        </span>
                      </div>
                    </div>

                    {/* Percentage Banner */}
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                      <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                        -{result.ratioPercentage}%
                      </span>
                      <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 mt-0.5">
                        Saved {formatBytes(result.savedBytes)} of space
                      </p>
                    </div>

                    {/* Proportional Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Optimized ({100 - result.ratioPercentage}%)</span>
                        <span>Saved ({result.ratioPercentage}%)</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden flex">
                        <div
                          className="bg-emerald-500 h-full"
                          style={{ width: `${Math.max(5, 100 - result.ratioPercentage)}%` }}
                        />
                        <div
                          className="bg-emerald-200 dark:bg-emerald-900 h-full"
                          style={{ width: `${result.ratioPercentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Download & View Actions */}
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                      <Button
                        variant="primary"
                        size="sm"
                        className="w-full justify-center text-xs"
                        leftIcon={<Download className="w-3.5 h-3.5" />}
                        onClick={handleDownload}
                      >
                        Download Compressed PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-center text-xs"
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                        onClick={handleOpenInViewer}
                      >
                        Open in DocFusion Viewer
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

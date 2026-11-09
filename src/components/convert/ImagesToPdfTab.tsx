import React, { useState, useRef } from 'react'
import {
  UploadCloud,
  Trash2,
  ArrowUp,
  ArrowDown,
  FileCheck,
  Download,
  Eye,
  Plus,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import {
  imagesToPdf,
  type ImageConvertItem,
  type ImagesToPdfOptions,
} from '@/services/convertService'
import { useDocumentStore } from '@/stores/useDocumentStore'
import { useAppStore } from '@/stores/useAppStore'
import { useNavigate } from 'react-router-dom'

export const ImagesToPdfTab: React.FC = () => {
  const navigate = useNavigate()
  const { loadBuffer } = useDocumentStore()
  const { addToast } = useAppStore()

  const [images, setImages] = useState<ImageConvertItem[]>([])
  const [pageSize, setPageSize] = useState<'a4' | 'letter' | 'legal' | 'fit-image'>('a4')
  const [orientation, setOrientation] = useState<'portrait' | 'landscape' | 'auto'>('auto')
  const [margin, setMargin] = useState<number>(18)
  const [fit, setFit] = useState<'contain' | 'cover' | 'stretch'>('contain')

  const [isConverting, setIsConverting] = useState(false)
  const [convertedBuffer, setConvertedBuffer] = useState<ArrayBuffer | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle uploaded files
  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return

    const newItems: ImageConvertItem[] = []
    let loadedCount = 0
    const validFiles = Array.from(files).filter((f) => f.type.startsWith('image/'))

    if (validFiles.length === 0) {
      addToast({
        type: 'error',
        title: 'Unsupported file type',
        message: 'Please upload valid image files (PNG, JPEG, WEBP, BMP, GIF).',
      })
      return
    }

    validFiles.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        const img = new Image()
        img.onload = () => {
          newItems.push({
            id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            file,
            name: file.name,
            dataUrl,
            width: img.naturalWidth || img.width,
            height: img.naturalHeight || img.height,
            size: file.size,
          })

          loadedCount++
          if (loadedCount === validFiles.length) {
            setImages((prev) => [...prev, ...newItems])
            setConvertedBuffer(null)
            addToast({
              type: 'info',
              title: 'Images added',
              message: `Added ${newItems.length} image(s) to the conversion queue.`,
            })
          }
        }
        img.src = dataUrl
      }
      reader.readAsDataURL(file)
    })
  }

  // Move item up in queue
  const handleMoveUp = (index: number) => {
    if (index === 0) return
    setImages((prev) => {
      const next = [...prev]
      const temp = next[index]
      next[index] = next[index - 1]
      next[index - 1] = temp
      return next
    })
    setConvertedBuffer(null)
  }

  // Move item down in queue
  const handleMoveDown = (index: number) => {
    if (index === images.length - 1) return
    setImages((prev) => {
      const next = [...prev]
      const temp = next[index]
      next[index] = next[index + 1]
      next[index + 1] = temp
      return next
    })
    setConvertedBuffer(null)
  }

  // Remove single image
  const handleRemove = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id))
    setConvertedBuffer(null)
  }

  // Clear all images
  const handleClear = () => {
    setImages([])
    setConvertedBuffer(null)
  }

  // Perform conversion
  const handleConvert = async () => {
    if (images.length === 0) return
    setIsConverting(true)
    try {
      const options: ImagesToPdfOptions = {
        pageSize,
        orientation,
        margin,
        fit,
      }
      const buffer = await imagesToPdf(images, options)
      setConvertedBuffer(buffer)
      addToast({
        type: 'success',
        title: 'PDF Created Successfully',
        message: `Converted ${images.length} image(s) into a ${(buffer.byteLength / 1024).toFixed(1)} KB PDF document.`,
      })
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Conversion Failed',
        message: err.message || 'An error occurred while building the PDF.',
      })
    } finally {
      setIsConverting(false)
    }
  }

  // Download converted PDF
  const handleDownload = () => {
    if (!convertedBuffer) return
    const blob = new Blob([convertedBuffer], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `images-converted-${new Date().toISOString().slice(0, 10)}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Open in viewer
  const handleOpenInViewer = async () => {
    if (!convertedBuffer) return
    const fileName = `images-converted-${new Date().toISOString().slice(0, 10)}.pdf`
    await loadBuffer(convertedBuffer, fileName)
    addToast({
      type: 'success',
      title: 'Opened in Viewer',
      message: 'The converted PDF has been loaded into your active workspace.',
    })
    navigate('/')
  }

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-6">
      {/* Upload Dropzone */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/bmp,image/gif"
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ''
        }}
        className="hidden"
      />

      {images.length === 0 ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            handleFiles(e.dataTransfer.files)
          }}
          className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-400 rounded-2xl p-10 text-center cursor-pointer transition-colors bg-white/50 dark:bg-slate-900/50 backdrop-blur"
        >
          <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto mb-4 border border-brand-200 dark:border-brand-800 shadow-sm">
            <UploadCloud className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
            Drop Images Here or Click to Browse
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
            Supports PNG, JPG, WEBP, BMP, and GIF. Images will be combined into a multi-page PDF in order.
          </p>
          <Button variant="primary" size="sm">
            Select Images
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Images Queue */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                  Image Queue ({images.length})
                </span>
                <span className="text-xs text-slate-400">
                  Total:{' '}
                  {formatBytes(images.reduce((acc, img) => acc + img.size, 0))}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Add More
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
                  onClick={handleClear}
                >
                  Clear All
                </Button>
              </div>
            </div>

            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {images.map((img, index) => (
                <div
                  key={img.id}
                  className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow transition-shadow"
                >
                  <span className="text-xs font-bold text-slate-400 w-6 text-center">
                    {index + 1}
                  </span>
                  <div className="w-14 h-14 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                    <img
                      src={img.dataUrl}
                      alt={img.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {img.name}
                    </p>
                    <p className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>{img.width} × {img.height} px</span>
                      <span>•</span>
                      <span>{formatBytes(img.size)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveUp(index)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed rounded"
                      title="Move Up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={index === images.length - 1}
                      onClick={() => handleMoveDown(index)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed rounded"
                      title="Move Down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(img.id)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Col: Settings & Convert Action */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
                  Document Settings
                </h4>

                {/* Page Size */}
                <div>
                  <label className="font-medium text-xs text-slate-700 dark:text-slate-300 block mb-1">
                    Page Size:
                  </label>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(e.target.value as any)
                      setConvertedBuffer(null)
                    }}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200"
                  >
                    <option value="a4">A4 (210 × 297 mm)</option>
                    <option value="letter">US Letter (8.5 × 11 in)</option>
                    <option value="legal">Legal (8.5 × 14 in)</option>
                    <option value="fit-image">Fit to Image Dimensions</option>
                  </select>
                </div>

                {/* Orientation */}
                {pageSize !== 'fit-image' && (
                  <div>
                    <label className="font-medium text-xs text-slate-700 dark:text-slate-300 block mb-1">
                      Orientation:
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 text-xs">
                      {[
                        { id: 'auto', label: 'Auto' },
                        { id: 'portrait', label: 'Portrait' },
                        { id: 'landscape', label: 'Landscape' },
                      ].map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => {
                            setOrientation(o.id as any)
                            setConvertedBuffer(null)
                          }}
                          className={`p-1.5 rounded-lg border text-center font-medium ${
                            orientation === o.id
                              ? 'border-brand-500 bg-brand-50 dark:bg-brand-950 font-bold text-brand-700 dark:text-brand-300'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Margins */}
                <div>
                  <label className="font-medium text-xs text-slate-700 dark:text-slate-300 block mb-1">
                    Margin:
                  </label>
                  <div className="grid grid-cols-4 gap-1.5 text-xs">
                    {[
                      { val: 0, label: 'None' },
                      { val: 18, label: 'Small' },
                      { val: 36, label: 'Normal' },
                      { val: 54, label: 'Large' },
                    ].map((m) => (
                      <button
                        key={m.val}
                        type="button"
                        onClick={() => {
                          setMargin(m.val)
                          setConvertedBuffer(null)
                        }}
                        className={`p-1.5 rounded-lg border text-center font-medium ${
                          margin === m.val
                            ? 'border-brand-500 bg-brand-50 dark:bg-brand-950 font-bold text-brand-700 dark:text-brand-300'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fit */}
                <div>
                  <label className="font-medium text-xs text-slate-700 dark:text-slate-300 block mb-1">
                    Image Fit:
                  </label>
                  <select
                    value={fit}
                    onChange={(e) => {
                      setFit(e.target.value as any)
                      setConvertedBuffer(null)
                    }}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200"
                  >
                    <option value="contain">Contain (Keep aspect ratio)</option>
                    <option value="cover">Cover (Fill entire page)</option>
                    <option value="stretch">Stretch (Distort to bounds)</option>
                  </select>
                </div>

                {/* Convert Button */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full justify-center"
                    leftIcon={
                      isConverting ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <FileCheck className="w-4 h-4" />
                      )
                    }
                    disabled={isConverting || images.length === 0}
                    onClick={handleConvert}
                  >
                    {isConverting ? 'Generating PDF...' : 'Convert to PDF'}
                  </Button>
                </div>

                {/* Converted actions */}
                {convertedBuffer && (
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                      <FileCheck className="w-4 h-4 shrink-0" />
                      <span>Ready for download or viewing!</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-center text-xs"
                      leftIcon={<Download className="w-3.5 h-3.5" />}
                      onClick={handleDownload}
                    >
                      Download PDF
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full justify-center text-xs"
                      leftIcon={<Eye className="w-3.5 h-3.5" />}
                      onClick={handleOpenInViewer}
                    >
                      Open in DocFusion Viewer
                    </Button>
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

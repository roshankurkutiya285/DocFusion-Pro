import React, { useRef, useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { PenTool, Type, Upload, RotateCcw, Check } from 'lucide-react'

interface SignatureModalProps {
  isOpen: boolean
  onClose: () => void
  onSaveSignature: (dataUrl: string) => void
}

export const SignatureModal: React.FC<SignatureModalProps> = ({
  isOpen,
  onClose,
  onSaveSignature,
}) => {
  const [tab, setTab] = useState<'draw' | 'type' | 'upload'>('draw')
  const [typedName, setTypedName] = useState('')
  const [selectedFont, setSelectedFont] = useState<'cursive' | 'serif' | 'sans-serif'>('cursive')
  const [inkColor, setInkColor] = useState('#0f172a')
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)

  // Drawing Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const lastPoint = useRef<{ x: number; y: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Initialize or clear draw canvas
  const handleClearDraw = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  useEffect(() => {
    if (isOpen && tab === 'draw') {
      setTimeout(handleClearDraw, 50)
    }
  }, [isOpen, tab])

  // Mouse / Touch drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    isDrawing.current = true
    lastPoint.current = {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    }
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || !lastPoint.current || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    const currentX = (clientX - rect.left) * (canvas.width / rect.width)
    const currentY = (clientY - rect.top) * (canvas.height / rect.height)

    ctx.strokeStyle = inkColor
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    ctx.beginPath()
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y)
    ctx.lineTo(currentX, currentY)
    ctx.stroke()

    lastPoint.current = { x: currentX, y: currentY }
  }

  const stopDrawing = () => {
    isDrawing.current = false
    lastPoint.current = null
  }

  // Handle image upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setUploadedUrl(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Generate and save signature PNG data URL
  const handleConfirmSignature = () => {
    if (tab === 'draw') {
      const canvas = canvasRef.current
      if (canvas) {
        onSaveSignature(canvas.toDataURL('image/png'))
        onClose()
      }
    } else if (tab === 'type') {
      if (!typedName.trim()) return
      // Render typed text to temporary canvas
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = 400
      tempCanvas.height = 120
      const ctx = tempCanvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = inkColor
        ctx.font = selectedFont === 'cursive' ? 'italic 44px "Brush Script MT", cursive' : '36px serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(typedName, 200, 60)
        onSaveSignature(tempCanvas.toDataURL('image/png'))
        onClose()
      }
    } else if (tab === 'upload') {
      if (uploadedUrl) {
        onSaveSignature(uploadedUrl)
        onClose()
      }
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Digital Signature"
      description="Draw, type, or upload an authentic digital signature for your document"
      maxWidth="md"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="space-y-4 py-2">
        {/* Method Tab Selector */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 text-xs">
          <button
            type="button"
            onClick={() => setTab('draw')}
            className={`flex items-center gap-1.5 px-3 py-2 font-medium border-b-2 -mb-px transition-colors ${
              tab === 'draw'
                ? 'border-brand-500 text-brand-600 dark:text-brand-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Draw</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('type')}
            className={`flex items-center gap-1.5 px-3 py-2 font-medium border-b-2 -mb-px transition-colors ${
              tab === 'type'
                ? 'border-brand-500 text-brand-600 dark:text-brand-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Type</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('upload')}
            className={`flex items-center gap-1.5 px-3 py-2 font-medium border-b-2 -mb-px transition-colors ${
              tab === 'upload'
                ? 'border-brand-500 text-brand-600 dark:text-brand-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload</span>
          </button>
        </div>

        {/* Tab 1: Draw Canvas */}
        {tab === 'draw' && (
          <div className="space-y-2">
            <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 overflow-hidden shadow-inner flex items-center justify-center">
              <canvas
                ref={canvasRef}
                width={500}
                height={160}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-40 cursor-crosshair touch-none"
              />
              <div className="absolute bottom-2 left-4 text-[10px] text-slate-400 pointer-events-none select-none">
                Sign above this line
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              {/* Color pickers */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 text-[11px] mr-1">Ink:</span>
                {[
                  { label: 'Black', color: '#0f172a' },
                  { label: 'Navy', color: '#1e3a8a' },
                  { label: 'Royal', color: '#2563eb' },
                ].map((c) => (
                  <button
                    key={c.color}
                    type="button"
                    onClick={() => setInkColor(c.color)}
                    style={{ backgroundColor: c.color }}
                    className={`w-5 h-5 rounded-full border transition-transform ${
                      inkColor === c.color ? 'scale-110 ring-2 ring-brand-500' : 'border-white/50'
                    }`}
                    title={c.label}
                  />
                ))}
              </div>

              <Button
                size="xs"
                variant="ghost"
                leftIcon={<RotateCcw className="w-3 h-3" />}
                onClick={handleClearDraw}
              >
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* Tab 2: Type Signature */}
        {tab === 'type' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                Enter Full Name:
              </label>
              <input
                type="text"
                placeholder="e.g. Johnathan Doe"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Live Preview */}
            <div className="h-32 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center p-4">
              {typedName ? (
                <span
                  style={{
                    color: inkColor,
                    fontFamily: selectedFont === 'cursive' ? '"Brush Script MT", cursive' : 'serif',
                  }}
                  className="text-4xl italic select-none"
                >
                  {typedName}
                </span>
              ) : (
                <span className="text-xs text-slate-400">Signature preview appears here</span>
              )}
            </div>

            {/* Font selector */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 text-[11px]">Style:</span>
              <button
                type="button"
                onClick={() => setSelectedFont('cursive')}
                className={`px-3 py-1 rounded text-xs italic ${
                  selectedFont === 'cursive' ? 'bg-brand-500 text-white font-bold' : 'bg-slate-100 dark:bg-slate-800'
                }`}
              >
                Cursive Script
              </button>
              <button
                type="button"
                onClick={() => setSelectedFont('serif')}
                className={`px-3 py-1 rounded text-xs font-serif ${
                  selectedFont === 'serif' ? 'bg-brand-500 text-white font-bold' : 'bg-slate-100 dark:bg-slate-800'
                }`}
              >
                Formal Serif
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Upload Image */}
        {tab === 'upload' && (
          <div className="space-y-3">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center cursor-pointer hover:border-brand-500 bg-slate-50/50 dark:bg-slate-900/50 transition-colors"
            >
              {uploadedUrl ? (
                <div className="flex flex-col items-center">
                  <img src={uploadedUrl} alt="Signature Preview" className="max-h-24 object-contain mb-2" />
                  <p className="text-xs text-brand-600 font-medium">Click to change image</p>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Upload Signature Image
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    PNG with transparent background recommended
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800 mt-3">
        <Button size="sm" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          size="sm"
          variant="primary"
          leftIcon={<Check className="w-3.5 h-3.5" />}
          onClick={handleConfirmSignature}
        >
          Use Signature
        </Button>
      </div>
    </Modal>
  )
}

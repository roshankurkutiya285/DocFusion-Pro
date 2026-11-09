import React, { useState, useRef } from 'react'
import {
  Stamp,
  Hash,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyEnd,
  Calendar,
  Save,
  Download,
  FolderOpen,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { useDocumentStore } from '@/stores/useDocumentStore'
import { useAppStore } from '@/stores/useAppStore'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { Slider } from '@/components/ui/Slider'
import { PdfPageView } from '@/components/viewer/PdfPageView'
import {
  applyStamps,
  formatDateStamp,
  type StampPosition,
  type AllStampOptions,
} from '@/services/stampService'
import { toArrayBuffer, downloadPdfBlob } from '@/services/organizeService'

export const StampPage: React.FC = () => {
  const {
    fileName,
    pdfDoc,
    numPages,
    isReady,
    currentPage,
    zoom,
    rotation,
    nextPage,
    prevPage,
    commitBuffer,
    loadDocument,
    loadSampleDocument,
    getSafeFileData,
  } = useDocumentStore()
  const { addToast } = useAppStore()

  const [activeTab, setActiveTab] = useState<'watermark' | 'pageNumbers' | 'header' | 'footer' | 'dateStamp'>('watermark')
  const [isProcessing, setIsProcessing] = useState(false)

  // 1. Watermark state
  const [wmEnabled, setWmEnabled] = useState(true)
  const [wmType, setWmType] = useState<'text' | 'image'>('text')
  const [wmText, setWmText] = useState('CONFIDENTIAL')
  const [wmFontSize, setWmFontSize] = useState(54)
  const [wmColor, setWmColor] = useState('#dc2626')
  const [wmOpacity, setWmOpacity] = useState(0.25)
  const [wmRotation, setWmRotation] = useState(45)
  const [wmApplyTo, setWmApplyTo] = useState<'all' | 'odd' | 'even' | 'range'>('all')
  const [wmImage, setWmImage] = useState<string | null>(null)

  // 2. Page Numbers state
  const [pnEnabled, setPnEnabled] = useState(false)
  const [pnFormat, setPnFormat] = useState<'X' | 'Page X' | 'Page X of Y' | 'X / Y' | 'bates'>('Page X of Y')
  const [pnPosition, setPnPosition] = useState<StampPosition>('bottom-center')
  const [pnFontSize, setPnFontSize] = useState(10)
  const [pnColor, setPnColor] = useState('#475569')
  const [pnStartAt, setPnStartAt] = useState(1)
  const [pnStartPage, setPnStartPage] = useState(1)

  // 3. Header state
  const [hdrEnabled, setHdrEnabled] = useState(false)
  const [hdrText, setHdrText] = useState('DocFusion Pro Verified Document')
  const [hdrAlignment, setHdrAlignment] = useState<'left' | 'center' | 'right'>('center')
  const [hdrFontSize, setHdrFontSize] = useState(9)
  const [hdrColor, setHdrColor] = useState('#64748b')
  const [hdrExcludeFirst, setHdrExcludeFirst] = useState(false)

  // 4. Footer state
  const [ftrEnabled, setFtrEnabled] = useState(false)
  const [ftrText, setFtrText] = useState('Copyright © 2026 • Confidential & Proprietary')
  const [ftrAlignment, setFtrAlignment] = useState<'left' | 'center' | 'right'>('center')
  const [ftrFontSize, setFtrFontSize] = useState(9)
  const [ftrColor, setFtrColor] = useState('#64748b')
  const [ftrExcludeFirst, setFtrExcludeFirst] = useState(false)

  // 5. Date Stamp state
  const [dsEnabled, setDsEnabled] = useState(false)
  const [dsFormat, setDsFormat] = useState<'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD Mon YYYY' | 'custom'>('YYYY-MM-DD')
  const [dsPrefix, setDsPrefix] = useState('RECEIVED: ')
  const [dsPosition, setDsPosition] = useState<StampPosition>('top-right')
  const [dsIncludeTime, setDsIncludeTime] = useState(true)
  const [dsFontSize, setDsFontSize] = useState(10)
  const [dsColor, setDsColor] = useState('#0f172a')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const wmImageInputRef = useRef<HTMLInputElement>(null)

  const handleWatermarkImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setWmImage(event.target?.result as string)
        setWmType('image')
      }
      reader.readAsDataURL(file)
    }
  }

  // Position selector options
  const positionOptions: { id: StampPosition; label: string }[] = [
    { id: 'top-left', label: 'Top Left' },
    { id: 'top-center', label: 'Top Center' },
    { id: 'top-right', label: 'Top Right' },
    { id: 'bottom-left', label: 'Bottom Left' },
    { id: 'bottom-center', label: 'Bottom Center' },
    { id: 'bottom-right', label: 'Bottom Right' },
  ]

  // Construct combined stamp config
  const getStampConfig = (): AllStampOptions => ({
    watermark: {
      enabled: wmEnabled,
      type: wmType,
      text: wmText,
      imageDataUrl: wmImage || undefined,
      fontSize: wmFontSize,
      color: wmColor,
      opacity: wmOpacity,
      rotation: wmRotation,
      applyTo: wmApplyTo,
    },
    pageNumbers: {
      enabled: pnEnabled,
      format: pnFormat,
      position: pnPosition,
      fontSize: pnFontSize,
      color: pnColor,
      startAt: pnStartAt,
      startPage: pnStartPage,
    },
    header: {
      enabled: hdrEnabled,
      text: hdrText,
      alignment: hdrAlignment,
      fontSize: hdrFontSize,
      color: hdrColor,
      excludeFirstPage: hdrExcludeFirst,
    },
    footer: {
      enabled: ftrEnabled,
      text: ftrText,
      alignment: ftrAlignment,
      fontSize: ftrFontSize,
      color: ftrColor,
      excludeFirstPage: ftrExcludeFirst,
    },
    dateStamp: {
      enabled: dsEnabled,
      format: dsFormat,
      prefix: dsPrefix,
      includeTime: dsIncludeTime,
      position: dsPosition,
      fontSize: dsFontSize,
      color: dsColor,
    },
  })

  // Apply stamps directly into the PDF document
  const handleApplyStamps = async (downloadAfter = false) => {
    setIsProcessing(true)
    try {
      const safeBuffer = await getSafeFileData()
      const config = getStampConfig()
      const updatedBytes = await applyStamps(safeBuffer, config)
      const buffer = toArrayBuffer(updatedBytes)
      const outName = fileName || 'Stamped_Document.pdf'

      if (downloadAfter) {
        downloadPdfBlob(updatedBytes, outName)
        addToast({
          title: 'PDF Exported',
          message: 'Document saved with stamps permanently applied.',
          type: 'success',
        })
      } else {
        await commitBuffer(buffer, outName, 'Apply stamps and watermarks')
        addToast({
          title: 'Stamps Applied',
          message: 'All watermark, page numbering, header/footer, and date stamps applied.',
          type: 'success',
        })
      }
    } catch (err) {
      addToast({
        title: 'Error Applying Stamps',
        message: err instanceof Error ? err.message : 'Failed to apply stamps',
        type: 'error',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-100 dark:bg-slate-950">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) loadDocument(file)
          e.target.value = ''
        }}
        className="hidden"
      />
      <input
        ref={wmImageInputRef}
        type="file"
        accept="image/png,image/jpeg"
        onChange={handleWatermarkImageUpload}
        className="hidden"
      />

      {/* Top Header & Save Actions */}
      <div className="h-11 px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-1.5">
          <IconButton
            size="xs"
            tooltip="Previous Page"
            disabled={!isReady || currentPage <= 1}
            onClick={prevPage}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </IconButton>

          <span className="font-mono text-xs font-semibold px-1.5">
            Page {currentPage} of {numPages > 0 ? numPages : 1}
          </span>

          <IconButton
            size="xs"
            tooltip="Next Page"
            disabled={!isReady || currentPage >= numPages}
            onClick={nextPage}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </IconButton>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="xs"
            variant="outline"
            disabled={!isReady || isProcessing}
            leftIcon={<Download className="w-3 h-3" />}
            onClick={() => handleApplyStamps(true)}
          >
            Export Stamped PDF
          </Button>

          <Button
            size="xs"
            variant="primary"
            disabled={!isReady || isProcessing}
            leftIcon={
              isProcessing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Save className="w-3 h-3" />
              )
            }
            onClick={() => handleApplyStamps(false)}
          >
            Apply Stamps & Save
          </Button>
        </div>
      </div>

      {/* Main Container: Split View (Settings Controls Left, Live Document Preview Right) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Stamp Settings Controls Panel */}
        <div className="w-80 sm:w-96 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 flex flex-col shrink-0 overflow-hidden">
          {/* Tabs Strip */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto text-xs shrink-0">
            {[
              { id: 'watermark', label: 'Watermark', icon: Stamp, enabled: wmEnabled },
              { id: 'pageNumbers', label: 'Pages', icon: Hash, enabled: pnEnabled },
              { id: 'header', label: 'Header', icon: AlignVerticalJustifyStart, enabled: hdrEnabled },
              { id: 'footer', label: 'Footer', icon: AlignVerticalJustifyEnd, enabled: ftrEnabled },
              { id: 'dateStamp', label: 'Date', icon: Calendar, enabled: dsEnabled },
            ].map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-2.5 font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-brand-500 text-brand-600 dark:text-brand-400 font-semibold bg-brand-50/20 dark:bg-brand-950/20'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.enabled && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Tab Content Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {/* 1. Watermark Settings */}
            {activeTab === 'watermark' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Enable Watermark
                  </span>
                  <input
                    type="checkbox"
                    checked={wmEnabled}
                    onChange={(e) => setWmEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600 accent-brand-600 cursor-pointer"
                  />
                </div>

                {wmEnabled && (
                  <>
                    <div>
                      <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                        Watermark Type:
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setWmType('text')}
                          className={`p-2 rounded border text-center ${
                            wmType === 'text'
                              ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/60 font-semibold text-brand-700'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600'
                          }`}
                        >
                          Text Watermark
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!wmImage) wmImageInputRef.current?.click()
                            else setWmType('image')
                          }}
                          className={`p-2 rounded border text-center ${
                            wmType === 'image'
                              ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/60 font-semibold text-brand-700'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600'
                          }`}
                        >
                          Image / Logo
                        </button>
                      </div>
                    </div>

                    {wmType === 'text' ? (
                      <>
                        <div>
                          <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                            Watermark Text:
                          </label>
                          <input
                            type="text"
                            value={wmText}
                            onChange={(e) => setWmText(e.target.value)}
                            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200"
                          />
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {['CONFIDENTIAL', 'DRAFT', 'COPY', 'APPROVED', 'DO NOT DISTRIBUTE'].map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => setWmText(preset)}
                                className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400 hover:text-slate-900"
                              >
                                {preset}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-slate-600 dark:text-slate-400 mb-1">
                            <span>Font Size:</span>
                            <span className="font-mono">{wmFontSize}pt</span>
                          </div>
                          <Slider
                            min={24}
                            max={96}
                            step={2}
                            value={wmFontSize}
                            onChange={(v) => setWmFontSize(v)}
                          />
                        </div>
                      </>
                    ) : (
                      <div>
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => wmImageInputRef.current?.click()}
                        >
                          {wmImage ? 'Change Image Logo' : 'Select Image Logo'}
                        </Button>
                      </div>
                    )}

                    <div>
                      <div className="flex justify-between text-slate-600 dark:text-slate-400 mb-1">
                        <span>Rotation Angle:</span>
                        <span className="font-mono">{wmRotation}°</span>
                      </div>
                      <Slider
                        min={0}
                        max={90}
                        step={5}
                        value={wmRotation}
                        onChange={(v) => setWmRotation(v)}
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-600 dark:text-slate-400 mb-1">
                        <span>Opacity:</span>
                        <span className="font-mono">{Math.round(wmOpacity * 100)}%</span>
                      </div>
                      <Slider
                        min={0.05}
                        max={0.8}
                        step={0.05}
                        value={wmOpacity}
                        onChange={(v) => setWmOpacity(v)}
                      />
                    </div>

                    <div>
                      <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                        Color:
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={wmColor}
                          onChange={(e) => setWmColor(e.target.value)}
                          className="w-8 h-8 rounded border border-slate-300 cursor-pointer"
                        />
                        <span className="font-mono text-slate-600 dark:text-slate-400 uppercase">
                          {wmColor}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                        Apply To:
                      </label>
                      <select
                        value={wmApplyTo}
                        onChange={(e) => setWmApplyTo(e.target.value as any)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200"
                      >
                        <option value="all">All Pages</option>
                        <option value="odd">Odd Pages Only</option>
                        <option value="even">Even Pages Only</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 2. Page Numbers Settings */}
            {activeTab === 'pageNumbers' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Enable Page Numbers
                  </span>
                  <input
                    type="checkbox"
                    checked={pnEnabled}
                    onChange={(e) => setPnEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600 accent-brand-600 cursor-pointer"
                  />
                </div>

                {pnEnabled && (
                  <>
                    <div>
                      <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                        Numbering Format:
                      </label>
                      <select
                        value={pnFormat}
                        onChange={(e) => setPnFormat(e.target.value as any)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200"
                      >
                        <option value="Page X of Y">Page X of Y (e.g. Page 1 of 5)</option>
                        <option value="Page X">Page X (e.g. Page 1)</option>
                        <option value="X / Y">X / Y (e.g. 1 / 5)</option>
                        <option value="X">Number Only (e.g. 1)</option>
                        <option value="bates">Bates Numbering (e.g. BATES-000001)</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                        Position:
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {positionOptions.map((pos) => (
                          <button
                            key={pos.id}
                            type="button"
                            onClick={() => setPnPosition(pos.id)}
                            className={`p-2 rounded border text-[11px] text-center ${
                              pnPosition === pos.id
                                ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/60 font-semibold text-brand-700'
                                : 'border-slate-200 dark:border-slate-700 text-slate-600'
                            }`}
                          >
                            {pos.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                          Start At Number:
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={pnStartAt}
                          onChange={(e) => setPnStartAt(parseInt(e.target.value, 10) || 1)}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1"
                        />
                      </div>
                      <div>
                        <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                          Start On Page:
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={pnStartPage}
                          onChange={(e) => setPnStartPage(parseInt(e.target.value, 10) || 1)}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                          Font Size:
                        </label>
                        <input
                          type="number"
                          min={6}
                          max={36}
                          value={pnFontSize}
                          onChange={(e) => setPnFontSize(parseInt(e.target.value, 10) || 10)}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1"
                        />
                      </div>
                      <div>
                        <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                          Color:
                        </label>
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <input
                            type="color"
                            value={pnColor}
                            onChange={(e) => setPnColor(e.target.value)}
                            className="w-7 h-7 rounded border border-slate-300 cursor-pointer"
                          />
                          <span className="font-mono text-[11px] text-slate-500">{pnColor}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 3. Header Settings */}
            {activeTab === 'header' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Enable Running Header
                  </span>
                  <input
                    type="checkbox"
                    checked={hdrEnabled}
                    onChange={(e) => setHdrEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600 accent-brand-600 cursor-pointer"
                  />
                </div>

                {hdrEnabled && (
                  <>
                    <div>
                      <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                        Header Text:
                      </label>
                      <input
                        type="text"
                        value={hdrText}
                        onChange={(e) => setHdrText(e.target.value)}
                        placeholder="Document header title..."
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5"
                      />
                    </div>

                    <div>
                      <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                        Alignment:
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {['left', 'center', 'right'].map((align) => (
                          <button
                            key={align}
                            type="button"
                            onClick={() => setHdrAlignment(align as any)}
                            className={`p-1.5 rounded border capitalize ${
                              hdrAlignment === align
                                ? 'border-brand-500 bg-brand-50 dark:bg-brand-950 font-bold text-brand-700'
                                : 'border-slate-200 dark:border-slate-700 text-slate-600'
                            }`}
                          >
                            {align}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="hdrExclude"
                        checked={hdrExcludeFirst}
                        onChange={(e) => setHdrExcludeFirst(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-brand-600"
                      />
                      <label htmlFor="hdrExclude" className="text-slate-600 dark:text-slate-300 cursor-pointer">
                        Exclude First Page (Cover page)
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                          Font Size:
                        </label>
                        <input
                          type="number"
                          min={6}
                          max={24}
                          value={hdrFontSize}
                          onChange={(e) => setHdrFontSize(parseInt(e.target.value, 10) || 9)}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1"
                        />
                      </div>
                      <div>
                        <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                          Color:
                        </label>
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <input
                            type="color"
                            value={hdrColor}
                            onChange={(e) => setHdrColor(e.target.value)}
                            className="w-7 h-7 rounded border border-slate-300 cursor-pointer"
                          />
                          <span className="font-mono text-[11px] text-slate-500">{hdrColor}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 4. Footer Settings */}
            {activeTab === 'footer' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Enable Running Footer
                  </span>
                  <input
                    type="checkbox"
                    checked={ftrEnabled}
                    onChange={(e) => setFtrEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600 accent-brand-600 cursor-pointer"
                  />
                </div>

                {ftrEnabled && (
                  <>
                    <div>
                      <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                        Footer Text:
                      </label>
                      <input
                        type="text"
                        value={ftrText}
                        onChange={(e) => setFtrText(e.target.value)}
                        placeholder="Copyright notice / disclaimer..."
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5"
                      />
                    </div>

                    <div>
                      <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                        Alignment:
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {['left', 'center', 'right'].map((align) => (
                          <button
                            key={align}
                            type="button"
                            onClick={() => setFtrAlignment(align as any)}
                            className={`p-1.5 rounded border capitalize ${
                              ftrAlignment === align
                                ? 'border-brand-500 bg-brand-50 dark:bg-brand-950 font-bold text-brand-700'
                                : 'border-slate-200 dark:border-slate-700 text-slate-600'
                            }`}
                          >
                            {align}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="ftrExclude"
                        checked={ftrExcludeFirst}
                        onChange={(e) => setFtrExcludeFirst(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-brand-600"
                      />
                      <label htmlFor="ftrExclude" className="text-slate-600 dark:text-slate-300 cursor-pointer">
                        Exclude First Page
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                          Font Size:
                        </label>
                        <input
                          type="number"
                          min={6}
                          max={24}
                          value={ftrFontSize}
                          onChange={(e) => setFtrFontSize(parseInt(e.target.value, 10) || 9)}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1"
                        />
                      </div>
                      <div>
                        <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                          Color:
                        </label>
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <input
                            type="color"
                            value={ftrColor}
                            onChange={(e) => setFtrColor(e.target.value)}
                            className="w-7 h-7 rounded border border-slate-300 cursor-pointer"
                          />
                          <span className="font-mono text-[11px] text-slate-500">{ftrColor}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 5. Date Stamp Settings */}
            {activeTab === 'dateStamp' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Enable Date Stamp
                  </span>
                  <input
                    type="checkbox"
                    checked={dsEnabled}
                    onChange={(e) => setDsEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600 accent-brand-600 cursor-pointer"
                  />
                </div>

                {dsEnabled && (
                  <>
                    <div>
                      <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                        Stamp Prefix:
                      </label>
                      <input
                        type="text"
                        value={dsPrefix}
                        onChange={(e) => setDsPrefix(e.target.value)}
                        placeholder="e.g. APPROVED ON "
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5"
                      />
                    </div>

                    <div>
                      <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                        Date Format:
                      </label>
                      <select
                        value={dsFormat}
                        onChange={(e) => setDsFormat(e.target.value as any)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5"
                      >
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="DD Mon YYYY">DD Mon YYYY (e.g. 07 Nov 2026)</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="dsTime"
                        checked={dsIncludeTime}
                        onChange={(e) => setDsIncludeTime(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-brand-600"
                      />
                      <label htmlFor="dsTime" className="text-slate-600 dark:text-slate-300 cursor-pointer">
                        Include Timestamp (HH:MM)
                      </label>
                    </div>

                    <div>
                      <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                        Position:
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {positionOptions.map((pos) => (
                          <button
                            key={pos.id}
                            type="button"
                            onClick={() => setDsPosition(pos.id)}
                            className={`p-2 rounded border text-[11px] text-center ${
                              dsPosition === pos.id
                                ? 'border-brand-500 bg-brand-50 dark:bg-brand-950 font-bold text-brand-700'
                                : 'border-slate-200 dark:border-slate-700 text-slate-600'
                            }`}
                          >
                            {pos.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                          Font Size:
                        </label>
                        <input
                          type="number"
                          min={6}
                          max={24}
                          value={dsFontSize}
                          onChange={(e) => setDsFontSize(parseInt(e.target.value, 10) || 10)}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1"
                        />
                      </div>
                      <div>
                        <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                          Color:
                        </label>
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <input
                            type="color"
                            value={dsColor}
                            onChange={(e) => setDsColor(e.target.value)}
                            className="w-7 h-7 rounded border border-slate-300 cursor-pointer"
                          />
                          <span className="font-mono text-[11px] text-slate-500">{dsColor}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300">
                      Sample output:{' '}
                      <strong className="text-brand-600 dark:text-brand-400">
                        {formatDateStamp({
                          enabled: true,
                          format: dsFormat,
                          prefix: dsPrefix,
                          includeTime: dsIncludeTime,
                          position: dsPosition,
                        })}
                      </strong>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Live Visual Preview */}
        <div className="flex-1 overflow-auto p-8 flex items-center justify-center bg-slate-200/80 dark:bg-slate-900/90 relative">
          {!isReady || !pdfDoc ? (
            <div className="max-w-md w-full bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-desktop border border-slate-200 dark:border-slate-800 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-200 dark:border-amber-800/80 shadow-inner">
                <Stamp className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1.5">
                Stamp & Watermark Studio
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                Add diagonal text watermarks, official image stamps, dynamic page numbering (including Bates numbers), headers, footers, and date stamps.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<FolderOpen className="w-4 h-4" />}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full sm:w-auto"
                >
                  Open PDF to Stamp
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
          ) : (
            <div className="relative inline-block shadow-2xl rounded-sm">
              {/* PDF Page Canvas */}
              <PdfPageView
                pdfDoc={pdfDoc}
                pageNumber={currentPage}
                scale={zoom}
                rotation={rotation}
              />

              {/* Live Overlay: Simulated Stamps Preview */}
              <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
                {/* 1. Live Watermark Preview */}
                {wmEnabled && wmText && wmType === 'text' && (
                  <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    style={{
                      transform: `rotate(-${wmRotation}deg)`,
                      opacity: wmOpacity,
                    }}
                  >
                    <span
                      style={{
                        fontSize: `${wmFontSize * zoom}px`,
                        color: wmColor,
                        fontWeight: 'bold',
                        letterSpacing: '0.1em',
                      }}
                    >
                      {wmText}
                    </span>
                  </div>
                )}

                {/* 2. Live Header Preview */}
                {hdrEnabled && hdrText && (!hdrExcludeFirst || currentPage > 1) && (
                  <div
                    className={`absolute top-4 left-6 right-6 flex pointer-events-none ${
                      hdrAlignment === 'center'
                        ? 'justify-center'
                        : hdrAlignment === 'right'
                        ? 'justify-end'
                        : 'justify-start'
                    }`}
                  >
                    <span
                      style={{
                        fontSize: `${hdrFontSize * zoom}px`,
                        color: hdrColor,
                      }}
                      className="font-medium"
                    >
                      {hdrText}
                    </span>
                  </div>
                )}

                {/* 3. Live Footer Preview */}
                {ftrEnabled && ftrText && (!ftrExcludeFirst || currentPage > 1) && (
                  <div
                    className={`absolute bottom-4 left-6 right-6 flex pointer-events-none ${
                      ftrAlignment === 'center'
                        ? 'justify-center'
                        : ftrAlignment === 'right'
                        ? 'justify-end'
                        : 'justify-start'
                    }`}
                  >
                    <span
                      style={{
                        fontSize: `${ftrFontSize * zoom}px`,
                        color: ftrColor,
                      }}
                      className="font-medium"
                    >
                      {ftrText}
                    </span>
                  </div>
                )}

                {/* 4. Live Page Numbers Preview */}
                {pnEnabled && currentPage >= pnStartPage && (
                  <div
                    className={`absolute pointer-events-none ${
                      pnPosition.startsWith('top') ? 'top-6' : 'bottom-6'
                    } ${
                      pnPosition.endsWith('left')
                        ? 'left-6'
                        : pnPosition.endsWith('right')
                        ? 'right-6'
                        : 'left-0 right-0 text-center'
                    }`}
                  >
                    <span
                      style={{
                        fontSize: `${pnFontSize * zoom}px`,
                        color: pnColor,
                      }}
                      className="font-mono"
                    >
                      {pnFormat === 'Page X of Y'
                        ? `Page ${pnStartAt + (currentPage - pnStartPage)} of ${numPages}`
                        : pnFormat === 'X / Y'
                        ? `${pnStartAt + (currentPage - pnStartPage)} / ${numPages}`
                        : pnFormat === 'bates'
                        ? `BATES-${String(pnStartAt + (currentPage - pnStartPage)).padStart(6, '0')}`
                        : `Page ${pnStartAt + (currentPage - pnStartPage)}`}
                    </span>
                  </div>
                )}

                {/* 5. Live Date Stamp Preview */}
                {dsEnabled && (
                  <div
                    className={`absolute pointer-events-none ${
                      dsPosition.startsWith('top') ? 'top-6' : 'bottom-6'
                    } ${
                      dsPosition.endsWith('left')
                        ? 'left-6'
                        : dsPosition.endsWith('right')
                        ? 'right-6'
                        : 'left-0 right-0 text-center'
                    }`}
                  >
                    <span
                      style={{
                        fontSize: `${dsFontSize * zoom}px`,
                        color: dsColor,
                      }}
                      className="font-semibold px-2 py-0.5 rounded border border-dashed border-slate-400/40 bg-white/40 dark:bg-black/40 backdrop-blur-xs"
                    >
                      {formatDateStamp({
                        enabled: true,
                        format: dsFormat,
                        prefix: dsPrefix,
                        includeTime: dsIncludeTime,
                        position: dsPosition,
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

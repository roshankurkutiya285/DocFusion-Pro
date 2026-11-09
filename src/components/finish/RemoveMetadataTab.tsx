import React, { useState, useEffect, useRef } from 'react'
import {
  ShieldAlert,
  ShieldCheck,
  UploadCloud,
  Download,
  Eye,
  RefreshCw,
  Check,
  AlertTriangle,
  Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { useDocumentStore } from '@/stores/useDocumentStore'
import { useAppStore } from '@/stores/useAppStore'
import { useNavigate } from 'react-router-dom'
import {
  getPdfMetadata,
  sanitizePdfMetadata,
  type PdfMetadata,
} from '@/services/finishService'

export const RemoveMetadataTab: React.FC = () => {
  const navigate = useNavigate()
  const { fileData, fileName, loadBuffer, getSafeFileData } = useDocumentStore()
  const { addToast } = useAppStore()

  // Local file override if user wants to sanitize another PDF
  const [customBuffer, setCustomBuffer] = useState<ArrayBuffer | null>(null)
  const [customFileName, setCustomFileName] = useState<string>('')

  const activeBuffer = customBuffer || fileData
  const activeName = customFileName || fileName || 'document.pdf'

  const [metadata, setMetadata] = useState<PdfMetadata | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSanitizing, setIsSanitizing] = useState(false)
  const [sanitizedBuffer, setSanitizedBuffer] = useState<ArrayBuffer | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Audit metadata whenever active buffer changes
  useEffect(() => {
    if (activeBuffer) {
      setIsLoading(true)
      getPdfMetadata(activeBuffer)
        .then((meta) => {
          setMetadata(meta)
          setSanitizedBuffer(null)
        })
        .catch(() => setMetadata(null))
        .finally(() => setIsLoading(false))
    }
  }, [activeBuffer])

  // Handle uploaded PDF
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      setCustomBuffer(ev.target?.result as ArrayBuffer)
      setCustomFileName(file.name)
      setSanitizedBuffer(null)
      addToast({
        type: 'info',
        title: 'PDF Loaded',
        message: `Loaded ${file.name} for privacy sanitization.`,
      })
    }
    reader.readAsArrayBuffer(file)
  }

  // Execute Sanitization
  const handleSanitize = async () => {
    let bufferToUse = customBuffer
    if (!bufferToUse) {
      try {
        bufferToUse = await getSafeFileData()
      } catch {
        addToast({
          type: 'error',
          title: 'No PDF loaded',
          message: 'Please load a PDF to sanitize metadata.',
        })
        return
      }
    }

    setIsSanitizing(true)
    try {
      const cleanBuffer = await sanitizePdfMetadata(bufferToUse)
      setSanitizedBuffer(cleanBuffer)

      // Also update store if this is the active document
      if (!customBuffer) {
        await loadBuffer(cleanBuffer, fileName || 'document.pdf')
      }

      addToast({
        type: 'success',
        title: 'Metadata Removed',
        message: 'All author identities, software signatures, and XMP streams have been erased.',
      })
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Sanitization Failed',
        message: err.message || 'Failed to sanitize document metadata.',
      })
    } finally {
      setIsSanitizing(false)
    }
  }

  // Download clean PDF
  const handleDownload = () => {
    if (!sanitizedBuffer) return
    const blob = new Blob([sanitizedBuffer], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeName.replace(/\.pdf$/i, '')}-sanitized.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Check if any personal metadata exists
  const hasMetadata =
    metadata &&
    (metadata.title ||
      metadata.author ||
      metadata.subject ||
      metadata.keywords.length > 0 ||
      metadata.creator ||
      metadata.producer ||
      metadata.creationDate ||
      metadata.modificationDate)

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
          <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
              {activeName}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {activeBuffer
                ? 'Document loaded. Inspect detected metadata risks and sanitize below.'
                : 'No document loaded. Upload a PDF file to sanitize hidden metadata.'}
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
          {/* Left 2 Cols: Privacy Audit & Detection */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Privacy & Metadata Audit
                    </h4>
                  </div>
                  {isLoading && (
                    <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin" />
                  )}
                </div>

                <div className="space-y-3">
                  {[
                    { label: 'Author / Identity', val: metadata?.author, risk: 'Personal name or workstation login' },
                    { label: 'Originating Software (Creator)', val: metadata?.creator, risk: 'Internal software stack identifier' },
                    { label: 'PDF Engine (Producer)', val: metadata?.producer, risk: 'Operating system and conversion engine version' },
                    { label: 'Document Title', val: metadata?.title, risk: 'Internal project titles' },
                    { label: 'Subject / Topic', val: metadata?.subject, risk: 'Classified subject headers' },
                    { label: 'Keywords & Tags', val: metadata?.keywords.join(', '), risk: 'Hidden search indexing tags' },
                    { label: 'Creation Timestamp', val: metadata?.creationDate, risk: 'Precise document creation timing' },
                    { label: 'Modification Timestamp', val: metadata?.modificationDate, risk: 'Revision dates' },
                  ].map((field) => (
                    <div
                      key={field.label}
                      className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                          {field.label}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Risk: {field.risk}
                        </span>
                      </div>
                      <div className="text-right">
                        {field.val ? (
                          <span className="inline-block px-2 py-0.5 rounded font-mono text-[11px] bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold max-w-xs truncate">
                            {field.val}
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded font-mono text-[11px] bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-medium">
                            Clean (None)
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Sanitization Action */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    {hasMetadata ? (
                      <span className="text-amber-600 dark:text-amber-400 font-semibold">
                        Identified personal metadata items that can be sanitized.
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        No standard metadata items detected.
                      </span>
                    )}
                  </div>
                  <Button
                    variant="primary"
                    size="md"
                    className="bg-rose-600 hover:bg-rose-700 text-white"
                    leftIcon={
                      isSanitizing ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <ShieldAlert className="w-4 h-4" />
                      )
                    }
                    disabled={isSanitizing}
                    onClick={handleSanitize}
                  >
                    {isSanitizing ? 'Sanitizing...' : 'Sanitize & Erase All Metadata'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Col: Sanitization Summary & Download */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4 text-xs">
                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800 pb-2">
                  <Lock className="w-4 h-4 text-emerald-500" />
                  <span>Sanitization Scope</span>
                </div>

                <div className="space-y-2 text-slate-600 dark:text-slate-400">
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Erases Author, Company, and Workstation names.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Strips originating software and OS version headers.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Removes Title, Subject, and embedded Keyword tags.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Resets creation and modification timestamps to epoch baseline.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Deletes XML/XMP Metadata packet from document catalog.</span>
                  </div>
                </div>

                {sanitizedBuffer && (
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span>Document Clean & Sanitized!</span>
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full justify-center text-xs"
                      leftIcon={<Download className="w-3.5 h-3.5" />}
                      onClick={handleDownload}
                    >
                      Download Sanitized PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-center text-xs"
                      leftIcon={<Eye className="w-3.5 h-3.5" />}
                      onClick={() => navigate('/')}
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

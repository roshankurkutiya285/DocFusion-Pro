import React, { useState, useEffect, useRef } from 'react'
import {
  FileCode,
  UploadCloud,
  Save,
  Download,
  Eye,
  RefreshCw,
  Clock,
  Tag,
  User,
  BookOpen,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { useDocumentStore } from '@/stores/useDocumentStore'
import { useAppStore } from '@/stores/useAppStore'
import { useNavigate } from 'react-router-dom'
import {
  getPdfMetadata,
  updatePdfMetadata,
  type PdfMetadata,
} from '@/services/finishService'

export const EditMetadataTab: React.FC = () => {
  const navigate = useNavigate()
  const { fileData, fileName, loadBuffer, getSafeFileData } = useDocumentStore()
  const { addToast } = useAppStore()

  // Local file override if user wants to edit another PDF
  const [customBuffer, setCustomBuffer] = useState<ArrayBuffer | null>(null)
  const [customFileName, setCustomFileName] = useState<string>('')

  const activeBuffer = customBuffer || fileData
  const activeName = customFileName || fileName || 'document.pdf'

  // Metadata form state
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [subject, setSubject] = useState('')
  const [keywordsStr, setKeywordsStr] = useState('')
  const [creator, setCreator] = useState('')
  const [producer, setProducer] = useState('')
  const [creationDate, setCreationDate] = useState('')
  const [modificationDate, setModificationDate] = useState('')

  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [updatedBuffer, setUpdatedBuffer] = useState<ArrayBuffer | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load metadata whenever active buffer changes
  useEffect(() => {
    if (activeBuffer) {
      setIsLoading(true)
      getPdfMetadata(activeBuffer)
        .then((meta) => {
          setTitle(meta.title)
          setAuthor(meta.author)
          setSubject(meta.subject)
          setKeywordsStr(meta.keywords.join(', '))
          setCreator(meta.creator)
          setProducer(meta.producer)
          setCreationDate(meta.creationDate)
          setModificationDate(meta.modificationDate)
          setUpdatedBuffer(null)
        })
        .catch((err) => {
          addToast({
            type: 'error',
            title: 'Failed to read metadata',
            message: err.message,
          })
        })
        .finally(() => setIsLoading(false))
    }
  }, [activeBuffer, addToast])

  // Handle uploaded PDF
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      setCustomBuffer(ev.target?.result as ArrayBuffer)
      setCustomFileName(file.name)
      setUpdatedBuffer(null)
      addToast({
        type: 'info',
        title: 'PDF Loaded',
        message: `Loaded ${file.name} to inspect metadata.`,
      })
    }
    reader.readAsArrayBuffer(file)
  }

  // Save metadata
  const handleSave = async (downloadAfter = false) => {
    let bufferToUse = customBuffer
    if (!bufferToUse) {
      try {
        bufferToUse = await getSafeFileData()
      } catch {
        addToast({
          type: 'error',
          title: 'No PDF loaded',
          message: 'Please load a PDF to edit metadata.',
        })
        return
      }
    }

    setIsSaving(true)
    try {
      const keywords = keywordsStr
        .split(/[,;]\s*/)
        .map((k) => k.trim())
        .filter(Boolean)

      const newMeta: Partial<PdfMetadata> = {
        title,
        author,
        subject,
        keywords,
        creator,
        producer,
        creationDate,
        modificationDate: modificationDate || new Date().toISOString().slice(0, 10),
      }

      const newBuffer = await updatePdfMetadata(bufferToUse, newMeta)
      setUpdatedBuffer(newBuffer)

      // Also update store if this is the active document
      if (!customBuffer) {
        await loadBuffer(newBuffer, fileName || 'document.pdf')
      }

      addToast({
        type: 'success',
        title: 'Metadata Updated',
        message: 'Document properties successfully saved into the PDF.',
      })

      if (downloadAfter) {
        const blob = new Blob([newBuffer], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${activeName.replace(/\.pdf$/i, '')}-meta.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Failed to update metadata.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Download updated PDF
  const handleDownload = () => {
    if (!updatedBuffer) {
      handleSave(true)
      return
    }
    const blob = new Blob([updatedBuffer], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeName.replace(/\.pdf$/i, '')}-meta.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Set modification date to today
  const handleSetToday = () => {
    setModificationDate(new Date().toISOString().slice(0, 10))
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
          <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <FileCode className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
              {activeName}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {activeBuffer
                ? 'Inspect and edit document identity, authorship, and catalog tags.'
                : 'No document loaded. Upload a PDF file to edit its metadata.'}
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
          {/* Metadata Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Document Properties & Catalog Tags
                  </h4>
                  {isLoading && (
                    <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin" />
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Title */}
                  <div className="sm:col-span-2">
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Document Title:
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Annual Financial Report 2026"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  {/* Author */}
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Author:</span>
                    </label>
                    <input
                      type="text"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      placeholder="e.g. John Doe / Corporation"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                      <span>Subject:</span>
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. Quarterly earnings & balance sheet"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  {/* Keywords */}
                  <div className="sm:col-span-2">
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-slate-400" />
                      <span>Keywords (Comma separated):</span>
                    </label>
                    <input
                      type="text"
                      value={keywordsStr}
                      onChange={(e) => setKeywordsStr(e.target.value)}
                      placeholder="e.g. finance, quarterly, audit, 2026"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  {/* Creator */}
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Creator Application:
                    </label>
                    <input
                      type="text"
                      value={creator}
                      onChange={(e) => setCreator(e.target.value)}
                      placeholder="e.g. DocFusion Pro / InDesign"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  {/* Producer */}
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      PDF Producer:
                    </label>
                    <input
                      type="text"
                      value={producer}
                      onChange={(e) => setProducer(e.target.value)}
                      placeholder="e.g. DocFusion Engine 2.0"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  {/* Creation Date */}
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Creation Date:</span>
                    </label>
                    <input
                      type="date"
                      value={creationDate}
                      onChange={(e) => setCreationDate(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  {/* Modification Date */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Modification Date:</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleSetToday}
                        className="text-[11px] text-brand-600 hover:underline font-medium"
                      >
                        Set Today
                      </button>
                    </div>
                    <input
                      type="date"
                      value={modificationDate}
                      onChange={(e) => setModificationDate(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>

                {/* Save actions */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3">
                  <Button
                    variant="primary"
                    size="md"
                    leftIcon={
                      isSaving ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )
                    }
                    disabled={isSaving}
                    onClick={() => handleSave(false)}
                  >
                    Save Changes
                  </Button>
                  <Button
                    variant="outline"
                    size="md"
                    leftIcon={<Download className="w-4 h-4" />}
                    onClick={handleDownload}
                  >
                    Save & Download PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Info Card */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-3 text-xs">
                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold">
                  <Info className="w-4 h-4 text-brand-500" />
                  <span>About PDF Metadata</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                  PDF metadata provides search engines, archival tools, and operating systems with structured index information regarding authorship, creation dates, and topics.
                </p>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5 text-[11px]">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">
                    Privacy Recommendation:
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">
                    If sharing documents externally with clients or publishing publicly, review author and creator fields to prevent unintentional leakage of user names or internal software.
                  </p>
                </div>

                {updatedBuffer && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-center text-xs"
                      leftIcon={<Eye className="w-3.5 h-3.5" />}
                      onClick={() => navigate('/')}
                    >
                      View in DocFusion Viewer
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

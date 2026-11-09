import React, { useState, useRef } from 'react'
import {
  Lock,
  Unlock,
  UploadCloud,
  Download,
  Eye as EyeIcon,
  EyeOff,
  ShieldAlert,
  RefreshCw,
  Key,
  CheckCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { useDocumentStore } from '@/stores/useDocumentStore'
import { useAppStore } from '@/stores/useAppStore'
import { useNavigate } from 'react-router-dom'
import {
  encryptPdf,
  unlockPdf,
  checkIsPasswordProtected,
  type EncryptOptions,
} from '@/services/securityService'

export const SecurityTab: React.FC = () => {
  const navigate = useNavigate()
  const { fileData, fileName, loadBuffer, getSafeFileData } = useDocumentStore()
  const { addToast } = useAppStore()

  const [activeSubTab, setActiveSubTab] = useState<'encrypt' | 'decrypt'>('encrypt')

  // Document states
  const [customBuffer, setCustomBuffer] = useState<ArrayBuffer | null>(null)
  const [customFileName, setCustomFileName] = useState<string>('')
  const [isProtected, setIsProtected] = useState<boolean>(false)

  // Encrypt inputs
  const [userPassword, setUserPassword] = useState('')
  const [ownerPassword, setOwnerPassword] = useState('')
  const [showUserPass, setShowUserPass] = useState(false)
  const [showOwnerPass, setShowOwnerPass] = useState(false)
  const [allowPrinting, setAllowPrinting] = useState(true)
  const [allowCopying, setAllowCopying] = useState(false)
  const [allowModifying, setAllowModifying] = useState(false)
  const [allowForms, setAllowForms] = useState(true)

  // Decrypt inputs
  const [unlockPassword, setUnlockPassword] = useState('')
  const [showUnlockPass, setShowUnlockPass] = useState(false)

  // Operation state
  const [isProcessing, setIsProcessing] = useState(false)
  const [outputBuffer, setOutputBuffer] = useState<ArrayBuffer | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const activeBuffer = customBuffer || fileData
  const activeName = customFileName || fileName || 'document.pdf'

  // Handle uploaded file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (ev) => {
      const buffer = ev.target?.result as ArrayBuffer
      setCustomBuffer(buffer)
      setCustomFileName(file.name)
      setOutputBuffer(null)

      const protectedStatus = await checkIsPasswordProtected(buffer)
      setIsProtected(protectedStatus)
      if (protectedStatus) {
        setActiveSubTab('decrypt')
        addToast({
          type: 'warning',
          title: 'Encrypted PDF Detected',
          message: `${file.name} is password protected. Enter password to unlock.`,
        })
      } else {
        addToast({
          type: 'info',
          title: 'PDF Loaded',
          message: `Loaded ${file.name} for encryption/security.`,
        })
      }
    }
    reader.readAsArrayBuffer(file)
  }

  // Handle Encrypt
  const handleEncrypt = async () => {
    let bufferToUse = customBuffer
    if (!bufferToUse) {
      try {
        bufferToUse = await getSafeFileData()
      } catch {
        addToast({
          type: 'error',
          title: 'No PDF loaded',
          message: 'Please load a PDF to encrypt.',
        })
        return
      }
    }

    if (!userPassword && !ownerPassword) {
      addToast({
        type: 'error',
        title: 'Password Required',
        message: 'Please provide at least a user or owner password.',
      })
      return
    }

    setIsProcessing(true)
    try {
      const options: EncryptOptions = {
        userPassword,
        ownerPassword: ownerPassword || userPassword,
        permissions: {
          printing: allowPrinting ? 'highResolution' : 'lowResolution',
          copying: allowCopying,
          modifying: allowModifying,
          fillingForms: allowForms,
        },
      }

      const encrypted = await encryptPdf(bufferToUse, options)
      setOutputBuffer(encrypted)
      addToast({
        type: 'success',
        title: 'Encryption Complete',
        message: 'PDF successfully secured with standard PDF encryption.',
      })
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Encryption Failed',
        message: err.message || 'Failed to encrypt document.',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle Unlock
  const handleUnlock = async () => {
    let bufferToUse = customBuffer
    if (!bufferToUse) {
      try {
        bufferToUse = await getSafeFileData()
      } catch {
        addToast({
          type: 'error',
          title: 'No PDF loaded',
          message: 'Please load a PDF to unlock.',
        })
        return
      }
    }

    if (!unlockPassword) {
      addToast({
        type: 'error',
        title: 'Password Required',
        message: 'Please enter the password to decrypt this document.',
      })
      return
    }

    setIsProcessing(true)
    try {
      const decrypted = await unlockPdf(bufferToUse, unlockPassword)
      setOutputBuffer(decrypted)
      addToast({
        type: 'success',
        title: 'Document Unlocked',
        message: 'Password security removed. Document is now fully decrypted.',
      })
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Unlock Failed',
        message: err.message || 'Incorrect password or corrupted encryption.',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Download output
  const handleDownload = () => {
    if (!outputBuffer) return
    const blob = new Blob([outputBuffer], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const suffix = activeSubTab === 'encrypt' ? 'protected' : 'unlocked'
    a.download = `${activeName.replace(/\.pdf$/i, '')}-${suffix}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Open in viewer
  const handleOpenInViewer = async () => {
    if (!outputBuffer) return
    const suffix = activeSubTab === 'encrypt' ? 'protected' : 'unlocked'
    const finalName = `${activeName.replace(/\.pdf$/i, '')}-${suffix}.pdf`
    await loadBuffer(outputBuffer, finalName)
    addToast({
      type: 'success',
      title: 'Opened in Viewer',
      message: 'Document loaded into active workspace.',
    })
    navigate('/')
  }

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Top Banner / Document Source */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            {isProtected ? <ShieldAlert className="w-5 h-5 text-amber-500" /> : <Lock className="w-5 h-5" />}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span>{activeName}</span>
              {isProtected && (
                <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">
                  Password Protected
                </span>
              )}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {activeBuffer
                ? 'Document loaded. Configure encryption or enter password to unlock.'
                : 'No document loaded. Upload a PDF file to encrypt or unlock.'}
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
        <div className="space-y-4">
          {/* Sub Tab Switcher: Encrypt vs Decrypt */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl max-w-sm text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setActiveSubTab('encrypt')
                setOutputBuffer(null)
              }}
              className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition ${
                activeSubTab === 'encrypt'
                  ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Password Protection</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveSubTab('decrypt')
                setOutputBuffer(null)
              }}
              className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition ${
                activeSubTab === 'decrypt'
                  ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Unlock PDF</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Left 2 Cols */}
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-6 space-y-4">
                  {activeSubTab === 'encrypt' ? (
                    /* ENCRYPT FORM */
                    <>
                      <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Set Passwords & Access Control
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Documents encrypted with DocFusion adhere to standard PDF encryption handlers.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        {/* User Password */}
                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            Document Open Password (User):
                          </label>
                          <div className="relative">
                            <input
                              type={showUserPass ? 'text' : 'password'}
                              value={userPassword}
                              onChange={(e) => setUserPassword(e.target.value)}
                              placeholder="Required to open and view"
                              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg pl-3 pr-9 py-2 text-xs font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => setShowUserPass(!showUserPass)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              {showUserPass ? <EyeOff className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Owner Password */}
                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            Owner / Master Password (Optional):
                          </label>
                          <div className="relative">
                            <input
                              type={showOwnerPass ? 'text' : 'password'}
                              value={ownerPassword}
                              onChange={(e) => setOwnerPassword(e.target.value)}
                              placeholder="Required to modify permissions"
                              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg pl-3 pr-9 py-2 text-xs font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => setShowOwnerPass(!showOwnerPass)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              {showOwnerPass ? <EyeOff className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Permissions */}
                      <div className="pt-2">
                        <label className="font-semibold text-xs text-slate-700 dark:text-slate-300 block mb-2">
                          Granular Permission Rules:
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                          <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={allowPrinting}
                              onChange={(e) => setAllowPrinting(e.target.checked)}
                              className="w-4 h-4 rounded text-brand-600 accent-brand-600"
                            />
                            <span className="text-slate-700 dark:text-slate-300">Allow High-Resolution Printing</span>
                          </label>

                          <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={allowCopying}
                              onChange={(e) => setAllowCopying(e.target.checked)}
                              className="w-4 h-4 rounded text-brand-600 accent-brand-600"
                            />
                            <span className="text-slate-700 dark:text-slate-300">Allow Text & Graphics Copying</span>
                          </label>

                          <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={allowModifying}
                              onChange={(e) => setAllowModifying(e.target.checked)}
                              className="w-4 h-4 rounded text-brand-600 accent-brand-600"
                            />
                            <span className="text-slate-700 dark:text-slate-300">Allow Content Modification</span>
                          </label>

                          <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={allowForms}
                              onChange={(e) => setAllowForms(e.target.checked)}
                              className="w-4 h-4 rounded text-brand-600 accent-brand-600"
                            />
                            <span className="text-slate-700 dark:text-slate-300">Allow Interactive Form Filling</span>
                          </label>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                        <Button
                          variant="primary"
                          size="md"
                          leftIcon={
                            isProcessing ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Lock className="w-4 h-4" />
                            )
                          }
                          disabled={isProcessing || (!userPassword && !ownerPassword)}
                          onClick={handleEncrypt}
                        >
                          {isProcessing ? 'Encrypting PDF...' : 'Encrypt & Protect PDF'}
                        </Button>
                      </div>
                    </>
                  ) : (
                    /* DECRYPT FORM */
                    <>
                      <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Unlock Encrypted PDF Document
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Enter the password to remove encryption and generate a permanent unprotected PDF copy.
                        </p>
                      </div>

                      <div className="max-w-md space-y-2 text-xs">
                        <label className="font-semibold text-slate-700 dark:text-slate-300 block">
                          Enter Password:
                        </label>
                        <div className="relative">
                          <input
                            type={showUnlockPass ? 'text' : 'password'}
                            value={unlockPassword}
                            onChange={(e) => setUnlockPassword(e.target.value)}
                            placeholder="User or Owner Password"
                            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg pl-3 pr-9 py-2 text-xs font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setShowUnlockPass(!showUnlockPass)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showUnlockPass ? <EyeOff className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                        <Button
                          variant="primary"
                          size="md"
                          leftIcon={
                            isProcessing ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Unlock className="w-4 h-4" />
                            )
                          }
                          disabled={isProcessing || !unlockPassword}
                          onClick={handleUnlock}
                        >
                          {isProcessing ? 'Decrypting Document...' : 'Unlock & Decrypt PDF'}
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Result Card */}
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4 space-y-3 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-2">
                    <Key className="w-4 h-4 text-brand-500" />
                    <span>Security Engine Status</span>
                  </div>

                  {outputBuffer ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span>
                          {activeSubTab === 'encrypt'
                            ? 'Document Protected Successfully!'
                            : 'Document Unlocked Successfully!'}
                        </span>
                      </div>

                      <Button
                        variant="primary"
                        size="sm"
                        className="w-full justify-center text-xs"
                        leftIcon={<Download className="w-3.5 h-3.5" />}
                        onClick={handleDownload}
                      >
                        Download {activeSubTab === 'encrypt' ? 'Encrypted' : 'Unlocked'} PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-center text-xs"
                        leftIcon={<EyeIcon className="w-3.5 h-3.5" />}
                        onClick={handleOpenInViewer}
                      >
                        Open in DocFusion Viewer
                      </Button>
                    </div>
                  ) : (
                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                      {activeSubTab === 'encrypt'
                        ? 'Set password credentials on the left to lock viewing and restrict modification permissions.'
                        : 'Enter the valid password to strip encryption and export an unlocked PDF.'}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { PDFDocument as EncryptablePDFDocument } from 'pdf-lib-plus-encrypt'
import { PDFDocument } from 'pdf-lib'
import { loadPdfDocument } from './pdfService'
import { toSafeLoadableBuffer } from './organizeService'

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy.buffer as ArrayBuffer
}

export interface EncryptOptions {
  userPassword: string
  ownerPassword?: string
  permissions?: {
    printing?: 'lowResolution' | 'highResolution'
    modifying?: boolean
    copying?: boolean
    annotating?: boolean
    fillingForms?: boolean
    contentAccessibility?: boolean
    documentAssembly?: boolean
  }
}

/**
 * Checks if a PDF is encrypted or password-protected.
 */
export async function checkIsPasswordProtected(buffer: ArrayBuffer): Promise<boolean> {
  try {
    await loadPdfDocument(buffer)
    return false
  } catch (err: any) {
    if (err?.name === 'PasswordException' || err?.message?.toLowerCase().includes('password')) {
      return true
    }
    return false
  }
}

/**
 * Encrypts a PDF with User and/or Owner passwords and customizable security permissions.
 */
export async function encryptPdf(
  buffer: ArrayBuffer,
  options: EncryptOptions
): Promise<ArrayBuffer> {
  if (!options.userPassword && !options.ownerPassword) {
    throw new Error('At least one password (User or Owner) is required to encrypt.')
  }

  const safeData = toSafeLoadableBuffer(buffer)
  const pdfDoc = await EncryptablePDFDocument.load(safeData, { ignoreEncryption: true })

  const ownerPassword = options.ownerPassword || options.userPassword || ''
  const userPassword = options.userPassword || options.ownerPassword || ''

  await pdfDoc.encrypt({
    userPassword,
    ownerPassword,
    permissions: {
      printing: options.permissions?.printing ?? 'highResolution',
      modifying: options.permissions?.modifying ?? false,
      copying: options.permissions?.copying ?? false,
      annotating: options.permissions?.annotating ?? false,
      fillingForms: options.permissions?.fillingForms ?? true,
      contentAccessibility: options.permissions?.contentAccessibility ?? true,
      documentAssembly: options.permissions?.documentAssembly ?? false,
    },
  })

  const bytes = await pdfDoc.save()
  return toArrayBuffer(bytes)
}

/**
 * Unlocks an encrypted PDF with its password and produces a decrypted version.
 */
export async function unlockPdf(
  buffer: ArrayBuffer,
  password: string
): Promise<ArrayBuffer> {
  // First verify the password opens the PDF via pdfjs
  try {
    const verifiedDoc = await loadPdfDocument(buffer, password)
    const numPages = verifiedDoc.numPages

    // Reconstruct clean unlocked document using verified page rendering or direct decrypt
    const newDoc = await PDFDocument.create()

    for (let i = 1; i <= numPages; i++) {
      const page = await verifiedDoc.getPage(i)
      const vp = page.getViewport({ scale: 2.0 })

      const canvas = document.createElement('canvas')
      canvas.width = Math.floor(vp.width)
      canvas.height = Math.floor(vp.height)
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise

      const pngDataUrl = canvas.toDataURL('image/png')
      const base64 = pngDataUrl.split(',')[1]
      const binary = atob(base64)
      const imgBytes = new Uint8Array(binary.length)
      for (let b = 0; b < binary.length; b++) {
        imgBytes[b] = binary.charCodeAt(b)
      }

      const embeddedPng = await newDoc.embedPng(imgBytes)
      const baseVp = page.getViewport({ scale: 1.0 })
      const newPage = newDoc.addPage([baseVp.width, baseVp.height])

      newPage.drawImage(embeddedPng, {
        x: 0,
        y: 0,
        width: baseVp.width,
        height: baseVp.height,
      })
    }

    const cleanBytes = await newDoc.save({ useObjectStreams: true })
    return toArrayBuffer(cleanBytes)
  } catch (err: any) {
    if (err?.name === 'PasswordException' || err?.message?.toLowerCase().includes('password')) {
      throw new Error('Incorrect password. Please verify the password and try again.')
    }
    throw new Error(err.message || 'Failed to decrypt document.')
  }
}

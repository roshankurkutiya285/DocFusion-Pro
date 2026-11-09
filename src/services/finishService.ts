import { PDFDocument, PDFName } from 'pdf-lib'
import { loadPdfDocument } from './pdfService'
import { toSafeLoadableBuffer } from './organizeService'

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy.buffer as ArrayBuffer
}

// -------------------------------------------------------------
// 1. COMPRESS PDF
// -------------------------------------------------------------

export type CompressionPreset = 'lossless' | 'low' | 'recommended' | 'extreme'

export interface CompressOptions {
  preset: CompressionPreset
  quality?: number
  scale?: number
}

export interface CompressResult {
  compressedBuffer: ArrayBuffer
  originalSize: number
  compressedSize: number
  savedBytes: number
  ratioPercentage: number
}

/**
 * Compresses a PDF document offline.
 * Supports lossless object-stream optimization and visual raster recompression.
 */
export async function compressPdf(
  pdfBuffer: ArrayBuffer,
  options: CompressOptions,
  onProgress?: (current: number, total: number) => void
): Promise<CompressResult> {
  const originalSize = pdfBuffer.byteLength

  if (options.preset === 'lossless') {
    const pdfDoc = await PDFDocument.load(toSafeLoadableBuffer(pdfBuffer), { ignoreEncryption: true })
    const compressedBytes = await pdfDoc.save({ useObjectStreams: true })
    const compressedBuffer = toArrayBuffer(compressedBytes)
    const compressedSize = compressedBuffer.byteLength
    const savedBytes = Math.max(0, originalSize - compressedSize)
    const ratioPercentage = Math.round((savedBytes / originalSize) * 100)

    return {
      compressedBuffer,
      originalSize,
      compressedSize,
      savedBytes,
      ratioPercentage,
    }
  }

  // Visual raster recompression settings
  let renderScale = 1.2
  let jpegQuality = 0.75

  if (options.preset === 'extreme') {
    renderScale = 0.85
    jpegQuality = 0.5
  } else if (options.preset === 'low') {
    renderScale = 1.5
    jpegQuality = 0.88
  }

  if (options.scale) renderScale = options.scale
  if (options.quality) jpegQuality = options.quality

  const sourcePdf = await loadPdfDocument(pdfBuffer)
  const totalPages = sourcePdf.numPages
  const newPdfDoc = await PDFDocument.create()

  for (let i = 1; i <= totalPages; i++) {
    const page = await sourcePdf.getPage(i)
    const baseViewport = page.getViewport({ scale: 1.0 })
    const targetViewport = page.getViewport({ scale: renderScale })

    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(targetViewport.width)
    canvas.height = Math.floor(targetViewport.height)

    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error(`Failed to create canvas context for page ${i}`)

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const renderTask = page.render({
      canvasContext: ctx,
      viewport: targetViewport,
      canvas,
    })
    await renderTask.promise

    const jpegDataUrl = canvas.toDataURL('image/jpeg', jpegQuality)
    const base64 = jpegDataUrl.split(',')[1]
    const binary = atob(base64)
    const imgBytes = new Uint8Array(binary.length)
    for (let b = 0; b < binary.length; b++) {
      imgBytes[b] = binary.charCodeAt(b)
    }

    const embeddedJpg = await newPdfDoc.embedJpg(imgBytes)
    const newPage = newPdfDoc.addPage([baseViewport.width, baseViewport.height])

    newPage.drawImage(embeddedJpg, {
      x: 0,
      y: 0,
      width: baseViewport.width,
      height: baseViewport.height,
    })

    if (onProgress) {
      onProgress(i, totalPages)
    }
  }

  const compressedBytes = await newPdfDoc.save({ useObjectStreams: true })
  const compressedBuffer = toArrayBuffer(compressedBytes)
  const compressedSize = compressedBuffer.byteLength
  const savedBytes = Math.max(0, originalSize - compressedSize)
  const ratioPercentage = Math.round((savedBytes / originalSize) * 100)

  return {
    compressedBuffer,
    originalSize,
    compressedSize,
    savedBytes,
    ratioPercentage,
  }
}

// -------------------------------------------------------------
// 2. COMPARE PDFS
// -------------------------------------------------------------

export interface PageCompareResult {
  pageNumber: number
  canvasAUrl: string
  canvasBUrl: string
  diffCanvasUrl: string
  differencePercentage: number
  diffPixelsCount: number
  textA: string
  textB: string
  textDifferences: {
    added: string[]
    removed: string[]
    unchanged: string[]
  }
}

/**
 * Computes a visual pixel-by-pixel diff and text diff between two PDF revisions for a given page.
 */
export async function comparePdfPage(
  docABuffer: ArrayBuffer,
  docBBuffer: ArrayBuffer,
  pageNumber: number,
  scale = 1.5
): Promise<PageCompareResult> {
  const docA = await loadPdfDocument(docABuffer)
  const docB = await loadPdfDocument(docBBuffer)

  const hasPageA = pageNumber <= docA.numPages
  const hasPageB = pageNumber <= docB.numPages

  let canvasAUrl = ''
  let canvasBUrl = ''
  let textA = ''
  let textB = ''

  let imgDataA: ImageData | null = null
  let imgDataB: ImageData | null = null
  let width = 600
  let height = 800

  // Render Page A if it exists
  if (hasPageA) {
    const pageA = await docA.getPage(pageNumber)
    const vpA = pageA.getViewport({ scale })
    width = Math.floor(vpA.width)
    height = Math.floor(vpA.height)

    const cA = document.createElement('canvas')
    cA.width = width
    cA.height = height
    const ctxA = cA.getContext('2d')!
    ctxA.fillStyle = '#ffffff'
    ctxA.fillRect(0, 0, width, height)
    await pageA.render({ canvasContext: ctxA, viewport: vpA, canvas: cA }).promise
    canvasAUrl = cA.toDataURL('image/png')
    imgDataA = ctxA.getImageData(0, 0, width, height)

    // Extract text A
    const tcA = await pageA.getTextContent()
    textA = tcA.items.map((item: any) => item.str || '').filter(Boolean).join(' ')
  }

  // Render Page B if it exists
  if (hasPageB) {
    const pageB = await docB.getPage(pageNumber)
    const vpB = pageB.getViewport({ scale })
    width = Math.max(width, Math.floor(vpB.width))
    height = Math.max(height, Math.floor(vpB.height))

    const cB = document.createElement('canvas')
    cB.width = width
    cB.height = height
    const ctxB = cB.getContext('2d')!
    ctxB.fillStyle = '#ffffff'
    ctxB.fillRect(0, 0, width, height)
    await pageB.render({ canvasContext: ctxB, viewport: vpB, canvas: cB }).promise
    canvasBUrl = cB.toDataURL('image/png')
    imgDataB = ctxB.getImageData(0, 0, width, height)

    // Extract text B
    const tcB = await pageB.getTextContent()
    textB = tcB.items.map((item: any) => item.str || '').filter(Boolean).join(' ')
  }

  // Create Visual Diff Canvas
  const diffCanvas = document.createElement('canvas')
  diffCanvas.width = width
  diffCanvas.height = height
  const diffCtx = diffCanvas.getContext('2d')!
  const diffImageData = diffCtx.createImageData(width, height)
  const diffData = diffImageData.data

  let diffPixelsCount = 0
  const totalPixels = width * height

  const dA = imgDataA?.data
  const dB = imgDataB?.data

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4

    const rA = dA ? dA[idx] : 255
    const gA = dA ? dA[idx + 1] : 255
    const bA = dA ? dA[idx + 2] : 255

    const rB = dB ? dB[idx] : 255
    const gB = dB ? dB[idx + 1] : 255
    const bB = dB ? dB[idx + 2] : 255

    const delta = Math.abs(rA - rB) + Math.abs(gA - gB) + Math.abs(bA - bB)

    if (delta > 35) {
      // Changed pixel -> Highlight in vibrant red/magenta
      diffData[idx] = 239 // R
      diffData[idx + 1] = 68 // G
      diffData[idx + 2] = 68 // B
      diffData[idx + 3] = 255 // Alpha
      diffPixelsCount++
    } else {
      // Unchanged pixel -> soft muted grayscale
      const gray = Math.round((rB * 0.299 + gB * 0.587 + bB * 0.114) * 0.8 + 40)
      diffData[idx] = gray
      diffData[idx + 1] = gray
      diffData[idx + 2] = gray
      diffData[idx + 3] = 180
    }
  }

  diffCtx.putImageData(diffImageData, 0, 0)
  const diffCanvasUrl = diffCanvas.toDataURL('image/png')
  const differencePercentage = totalPixels > 0 ? (diffPixelsCount / totalPixels) * 100 : 0

  // Calculate text diff
  const wordsA = new Set(textA.split(/\s+/).filter(Boolean))
  const wordsB = new Set(textB.split(/\s+/).filter(Boolean))

  const added: string[] = []
  const removed: string[] = []
  const unchanged: string[] = []

  wordsB.forEach((w) => {
    if (wordsA.has(w)) {
      unchanged.push(w)
    } else {
      added.push(w)
    }
  })

  wordsA.forEach((w) => {
    if (!wordsB.has(w)) {
      removed.push(w)
    }
  })

  return {
    pageNumber,
    canvasAUrl,
    canvasBUrl,
    diffCanvasUrl,
    differencePercentage,
    diffPixelsCount,
    textA,
    textB,
    textDifferences: {
      added,
      removed,
      unchanged,
    },
  }
}

// -------------------------------------------------------------
// 3. EDIT & REMOVE METADATA
// -------------------------------------------------------------

export interface PdfMetadata {
  title: string
  author: string
  subject: string
  keywords: string[]
  creator: string
  producer: string
  creationDate: string
  modificationDate: string
}

/**
 * Reads document metadata using pdf-lib
 */
export async function getPdfMetadata(pdfBuffer: ArrayBuffer | Uint8Array): Promise<PdfMetadata> {
  const pdfDoc = await PDFDocument.load(toSafeLoadableBuffer(pdfBuffer), { ignoreEncryption: true })

  const title = pdfDoc.getTitle() || ''
  const author = pdfDoc.getAuthor() || ''
  const subject = pdfDoc.getSubject() || ''
  const keywords = pdfDoc.getKeywords() ? pdfDoc.getKeywords()!.split(/[,;\s]+/).filter(Boolean) : []
  const creator = pdfDoc.getCreator() || ''
  const producer = pdfDoc.getProducer() || ''

  const cDate = pdfDoc.getCreationDate()
  const mDate = pdfDoc.getModificationDate()

  return {
    title,
    author,
    subject,
    keywords,
    creator,
    producer,
    creationDate: cDate ? cDate.toISOString().slice(0, 10) : '',
    modificationDate: mDate ? mDate.toISOString().slice(0, 10) : '',
  }
}

/**
 * Updates document metadata in place.
 */
export async function updatePdfMetadata(
  pdfBuffer: ArrayBuffer | Uint8Array,
  newMeta: Partial<PdfMetadata>
): Promise<ArrayBuffer> {
  const pdfDoc = await PDFDocument.load(toSafeLoadableBuffer(pdfBuffer), { ignoreEncryption: true })

  if (newMeta.title !== undefined) pdfDoc.setTitle(newMeta.title)
  if (newMeta.author !== undefined) pdfDoc.setAuthor(newMeta.author)
  if (newMeta.subject !== undefined) pdfDoc.setSubject(newMeta.subject)
  if (newMeta.keywords !== undefined) pdfDoc.setKeywords(newMeta.keywords)
  if (newMeta.creator !== undefined) pdfDoc.setCreator(newMeta.creator)
  if (newMeta.producer !== undefined) pdfDoc.setProducer(newMeta.producer)

  if (newMeta.creationDate) {
    const d = new Date(newMeta.creationDate)
    if (!isNaN(d.getTime())) pdfDoc.setCreationDate(d)
  }
  if (newMeta.modificationDate) {
    const d = new Date(newMeta.modificationDate)
    if (!isNaN(d.getTime())) pdfDoc.setModificationDate(d)
  }

  const bytes = await pdfDoc.save({ useObjectStreams: true })
  return toArrayBuffer(bytes)
}

/**
 * Completely scrubs and sanitizes all document metadata (Author, Software, Timestamps, XMP streams).
 */
export async function sanitizePdfMetadata(pdfBuffer: ArrayBuffer | Uint8Array): Promise<ArrayBuffer> {
  const pdfDoc = await PDFDocument.load(toSafeLoadableBuffer(pdfBuffer), { ignoreEncryption: true })

  // Clear all standard fields
  pdfDoc.setTitle('')
  pdfDoc.setAuthor('')
  pdfDoc.setSubject('')
  pdfDoc.setKeywords([])
  pdfDoc.setCreator('')
  pdfDoc.setProducer('')

  // Set normalized epoch date or clear
  pdfDoc.setCreationDate(new Date(0))
  pdfDoc.setModificationDate(new Date(0))

  // Delete XML/XMP Metadata stream from document catalog
  try {
    pdfDoc.catalog.delete(PDFName.of('Metadata'))
  } catch {
    // ignore if not present
  }

  const bytes = await pdfDoc.save({ useObjectStreams: true })
  return toArrayBuffer(bytes)
}

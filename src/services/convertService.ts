import { PDFDocument } from 'pdf-lib'
import JSZip from 'jszip'
import { loadPdfDocument } from './pdfService'

// Helper to convert Uint8Array buffer to standard ArrayBuffer
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy.buffer as ArrayBuffer
}

// -------------------------------------------------------------
// 1. IMAGES -> PDF TYPES & SERVICE
// -------------------------------------------------------------

export interface ImageConvertItem {
  id: string
  file?: File
  name: string
  dataUrl: string
  width: number
  height: number
  size: number
}

export interface ImagesToPdfOptions {
  pageSize: 'a4' | 'letter' | 'legal' | 'fit-image'
  orientation: 'portrait' | 'landscape' | 'auto'
  margin: number // in points: 0, 18, 36, 54
  fit: 'contain' | 'cover' | 'stretch'
}

const PAGE_SIZES: Record<'a4' | 'letter' | 'legal', [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612.0, 792.0],
  legal: [612.0, 1008.0],
}

/**
 * Converts any browser image format (including WEBP, SVG, BMP) to a PNG or JPEG Uint8Array
 */
async function imageToBytes(dataUrl: string): Promise<{ bytes: Uint8Array; format: 'png' | 'jpg' }> {
  // If already standard PNG or JPEG data url, extract bytes directly
  if (dataUrl.startsWith('data:image/png')) {
    const base64 = dataUrl.split(',')[1]
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return { bytes, format: 'png' }
  }

  if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) {
    const base64 = dataUrl.split(',')[1]
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return { bytes, format: 'jpg' }
  }

  // Otherwise draw image to canvas and export as PNG to ensure compatibility with pdf-lib
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth || img.width
      canvas.height = img.naturalHeight || img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to create canvas context'))
        return
      }
      ctx.drawImage(img, 0, 0)
      const pngDataUrl = canvas.toDataURL('image/png')
      const base64 = pngDataUrl.split(',')[1]
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }
      resolve({ bytes, format: 'png' })
    }
    img.onerror = () => reject(new Error('Failed to load image for conversion'))
    img.src = dataUrl
  })
}

/**
 * Converts an ordered list of images into a single PDF document.
 */
export async function imagesToPdf(
  images: ImageConvertItem[],
  options: ImagesToPdfOptions
): Promise<ArrayBuffer> {
  if (images.length === 0) {
    throw new Error('At least one image is required to generate a PDF.')
  }

  const pdfDoc = await PDFDocument.create()

  for (const item of images) {
    const { bytes, format } = await imageToBytes(item.dataUrl)
    const embeddedImage =
      format === 'png'
        ? await pdfDoc.embedPng(bytes)
        : await pdfDoc.embedJpg(bytes)

    const imgWidth = embeddedImage.width
    const imgHeight = embeddedImage.height

    let pageWidth: number
    let pageHeight: number

    if (options.pageSize === 'fit-image') {
      pageWidth = imgWidth + options.margin * 2
      pageHeight = imgHeight + options.margin * 2
    } else {
      const [baseW, baseH] = PAGE_SIZES[options.pageSize]
      let isLandscape = false
      if (options.orientation === 'landscape') {
        isLandscape = true
      } else if (options.orientation === 'auto') {
        isLandscape = imgWidth > imgHeight
      }

      pageWidth = isLandscape ? Math.max(baseW, baseH) : Math.min(baseW, baseH)
      pageHeight = isLandscape ? Math.min(baseW, baseH) : Math.max(baseW, baseH)
    }

    const page = pdfDoc.addPage([pageWidth, pageHeight])

    const availableWidth = Math.max(1, pageWidth - options.margin * 2)
    const availableHeight = Math.max(1, pageHeight - options.margin * 2)

    let drawWidth = availableWidth
    let drawHeight = availableHeight
    let drawX = options.margin
    let drawY = options.margin

    if (options.fit === 'contain') {
      const scale = Math.min(availableWidth / imgWidth, availableHeight / imgHeight)
      drawWidth = imgWidth * scale
      drawHeight = imgHeight * scale
      drawX = options.margin + (availableWidth - drawWidth) / 2
      drawY = options.margin + (availableHeight - drawHeight) / 2
    } else if (options.fit === 'cover') {
      const scale = Math.max(availableWidth / imgWidth, availableHeight / imgHeight)
      drawWidth = imgWidth * scale
      drawHeight = imgHeight * scale
      drawX = options.margin + (availableWidth - drawWidth) / 2
      drawY = options.margin + (availableHeight - drawHeight) / 2
    } else {
      // stretch
      drawWidth = availableWidth
      drawHeight = availableHeight
    }

    page.drawImage(embeddedImage, {
      x: drawX,
      y: drawY,
      width: drawWidth,
      height: drawHeight,
    })
  }

  const pdfBytes = await pdfDoc.save()
  return toArrayBuffer(pdfBytes)
}

// -------------------------------------------------------------
// 2. PDF -> IMAGES TYPES & SERVICE
// -------------------------------------------------------------

export interface PdfToImagesOptions {
  format: 'png' | 'jpeg' | 'webp'
  quality: number // 0.1 to 1.0 (for jpeg/webp)
  scale: number // 1.0, 1.5, 2.0, 3.0
  pageIndices?: number[] // specific 0-based page indices to convert
}

export interface PdfImageResult {
  pageNumber: number
  dataUrl: string
  blob: Blob
  width: number
  height: number
  fileName: string
}

/**
 * Renders PDF pages into high-resolution images.
 */
export async function pdfToImages(
  pdfBuffer: ArrayBuffer,
  options: PdfToImagesOptions,
  onProgress?: (current: number, total: number) => void
): Promise<PdfImageResult[]> {
  const pdfDoc = await loadPdfDocument(pdfBuffer)
  const totalPages = pdfDoc.numPages

  const targetIndices = options.pageIndices && options.pageIndices.length > 0
    ? options.pageIndices.filter((idx) => idx >= 0 && idx < totalPages)
    : Array.from({ length: totalPages }, (_, i) => i)

  const results: PdfImageResult[] = []
  const mimeType =
    options.format === 'jpeg'
      ? 'image/jpeg'
      : options.format === 'webp'
      ? 'image/webp'
      : 'image/png'

  const fileExt = options.format === 'jpeg' ? 'jpg' : options.format

  for (let i = 0; i < targetIndices.length; i++) {
    const pageIndex = targetIndices[i]
    const pageNumber = pageIndex + 1
    const page = await pdfDoc.getPage(pageNumber)

    const viewport = page.getViewport({ scale: options.scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)

    const ctx = canvas.getContext('2d', { alpha: options.format === 'png' })
    if (!ctx) {
      throw new Error(`Failed to create 2D canvas context for page ${pageNumber}`)
    }

    // White background for JPEG/WEBP
    if (options.format !== 'png') {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    const renderTask = page.render({
      canvasContext: ctx,
      viewport,
      canvas,
    })

    await renderTask.promise

    const dataUrl = canvas.toDataURL(mimeType, options.quality)
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Failed to convert canvas to blob'))),
        mimeType,
        options.quality
      )
    })

    const paddedNum = String(pageNumber).padStart(totalPages > 99 ? 3 : 2, '0')
    const fileName = `page-${paddedNum}.${fileExt}`

    results.push({
      pageNumber,
      dataUrl,
      blob,
      width: canvas.width,
      height: canvas.height,
      fileName,
    })

    if (onProgress) {
      onProgress(i + 1, targetIndices.length)
    }
  }

  return results
}

/**
 * Packages multiple rendered PDF image pages into a single ZIP archive.
 */
export async function exportImagesAsZip(
  images: PdfImageResult[],
  onZipProgress?: (percent: number) => void
): Promise<Blob> {
  const zip = new JSZip()
  const imgFolder = zip.folder('pages') || zip

  images.forEach((img) => {
    imgFolder.file(img.fileName, img.blob)
  })

  return await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      if (onZipProgress) {
        onZipProgress(Math.round(metadata.percent))
      }
    }
  )
}

// -------------------------------------------------------------
// 3. PDF -> TEXT TYPES & SERVICE
// -------------------------------------------------------------

export interface PdfToTextOptions {
  pageIndices?: number[]
  includePageNumbers: boolean
  normalizeWhitespace: boolean
  format: 'plain' | 'markdown' | 'json'
}

export interface ExtractedPageText {
  pageNumber: number
  text: string
  lines: string[]
  charCount: number
  wordCount: number
}

export interface PdfTextResult {
  fullText: string
  pages: ExtractedPageText[]
  totalChars: number
  totalWords: number
  totalLines: number
  pageCount: number
  jsonDump?: string
}

/**
 * Extracts clean, structured text from any PDF document completely offline.
 */
export async function pdfToText(
  pdfBuffer: ArrayBuffer,
  options: PdfToTextOptions,
  onProgress?: (current: number, total: number) => void
): Promise<PdfTextResult> {
  const pdfDoc = await loadPdfDocument(pdfBuffer)
  const totalPages = pdfDoc.numPages

  const targetIndices = options.pageIndices && options.pageIndices.length > 0
    ? options.pageIndices.filter((idx) => idx >= 0 && idx < totalPages)
    : Array.from({ length: totalPages }, (_, i) => i)

  const extractedPages: ExtractedPageText[] = []
  const jsonDumpArray: Array<{ page: number; items: any[] }> = []

  for (let i = 0; i < targetIndices.length; i++) {
    const pageIndex = targetIndices[i]
    const pageNumber = pageIndex + 1
    const page = await pdfDoc.getPage(pageNumber)
    const content = await page.getTextContent()

    // Store raw text items for json format
    if (options.format === 'json') {
      jsonDumpArray.push({
        page: pageNumber,
        items: content.items.map((item: any) => ({
          str: item.str,
          dir: item.dir,
          width: item.width,
          height: item.height,
          transform: item.transform,
          fontName: item.fontName,
        })),
      })
    }

    // Group items into logical lines based on vertical Y-coordinate
    interface TextItemWithPos {
      text: string
      x: number
      y: number
      height: number
    }

    const items: TextItemWithPos[] = []
    for (const rawItem of content.items) {
      if ('str' in rawItem && rawItem.str) {
        const item = rawItem as any
        const tx = item.transform ? item.transform[4] : 0
        const ty = item.transform ? item.transform[5] : 0
        items.push({
          text: item.str,
          x: tx,
          y: ty,
          height: item.height || 10,
        })
      }
    }

    // Sort items by Y (top to bottom, descending), then by X (left to right, ascending)
    items.sort((a, b) => {
      const yDiff = b.y - a.y
      if (Math.abs(yDiff) > 3) {
        return yDiff
      }
      return a.x - b.x
    })

    // Group items into lines
    const lineBuckets: string[] = []
    let currentLine: string[] = []
    let currentY: number | null = null

    for (const item of items) {
      if (currentY === null || Math.abs(item.y - currentY) > 3.5) {
        if (currentLine.length > 0) {
          lineBuckets.push(currentLine.join(' '))
          currentLine = []
        }
        currentY = item.y
      }
      currentLine.push(item.text)
    }

    if (currentLine.length > 0) {
      lineBuckets.push(currentLine.join(' '))
    }

    // Normalize spacing if requested
    const formattedLines = lineBuckets.map((line) => {
      let l = line
      if (options.normalizeWhitespace) {
        l = l.replace(/\s+/g, ' ').trim()
      }
      return l
    }).filter((l) => l.length > 0)

    const pageRawText = formattedLines.join('\n')
    const charCount = pageRawText.length
    const wordCount = pageRawText.trim() ? pageRawText.trim().split(/\s+/).length : 0

    extractedPages.push({
      pageNumber,
      text: pageRawText,
      lines: formattedLines,
      charCount,
      wordCount,
    })

    if (onProgress) {
      onProgress(i + 1, targetIndices.length)
    }
  }

  // Build combined full text output based on format
  let fullText = ''
  if (options.format === 'markdown') {
    fullText = extractedPages
      .map((p) => {
        const header = options.includePageNumbers ? `## Page ${p.pageNumber}\n\n` : ''
        return `${header}${p.text}\n`
      })
      .join('\n---\n\n')
  } else if (options.format === 'json') {
    fullText = JSON.stringify(
      {
        pageCount: extractedPages.length,
        pages: extractedPages.map((p) => ({
          pageNumber: p.pageNumber,
          characterCount: p.charCount,
          wordCount: p.wordCount,
          text: p.text,
        })),
        rawDetails: jsonDumpArray,
      },
      null,
      2
    )
  } else {
    // Plain text
    fullText = extractedPages
      .map((p) => {
        const header = options.includePageNumbers ? `--- Page ${p.pageNumber} ---\n` : ''
        return `${header}${p.text}`
      })
      .join('\n\n')
  }

  const totalChars = extractedPages.reduce((acc, p) => acc + p.charCount, 0)
  const totalWords = extractedPages.reduce((acc, p) => acc + p.wordCount, 0)
  const totalLines = extractedPages.reduce((acc, p) => acc + p.lines.length, 0)

  return {
    fullText,
    pages: extractedPages,
    totalChars,
    totalWords,
    totalLines,
    pageCount: extractedPages.length,
    jsonDump: options.format === 'json' ? fullText : undefined,
  }
}

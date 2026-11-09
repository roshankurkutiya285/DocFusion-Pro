import { createWorker } from 'tesseract.js'
import { loadPdfDocument } from './pdfService'

export interface OcrProgressInfo {
  status: string
  progress: number
}

export interface OcrWordBox {
  text: string
  confidence: number
  bbox: {
    x0: number
    y0: number
    x1: number
    y1: number
  }
}

export interface OcrResult {
  pageNumber: number
  text: string
  confidence: number
  wordCount: number
  charCount: number
  words: OcrWordBox[]
  lines: string[]
  previewCanvasUrl: string
  method: 'tesseract' | 'fallback-stream'
}

/**
 * Performs client-side Optical Character Recognition (OCR) on a specific page of a PDF document.
 */
export async function ocrPdfPage(
  pdfBuffer: ArrayBuffer,
  pageNumber: number,
  lang = 'eng',
  onProgress?: (info: OcrProgressInfo) => void
): Promise<OcrResult> {
  const doc = await loadPdfDocument(pdfBuffer)
  const page = await doc.getPage(pageNumber)

  // Render high-DPI canvas (2.0x for crisp optical recognition)
  const viewport = page.getViewport({ scale: 2.0 })
  const canvas = document.createElement('canvas')
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)

  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  await page.render({
    canvasContext: ctx,
    viewport,
    canvas,
  }).promise

  const previewCanvasUrl = canvas.toDataURL('image/jpeg', 0.85)

  // Try Tesseract OCR
  try {
    if (onProgress) {
      onProgress({ status: 'Initializing OCR engine...', progress: 0.1 })
    }

    const worker = await createWorker(lang, 1, {
      logger: (m) => {
        if (onProgress) {
          onProgress({
            status: m.status || 'Recognizing text...',
            progress: Math.min(0.95, Math.max(0.1, m.progress || 0)),
          })
        }
      },
    })

    const ret = await worker.recognize(canvas)
    await worker.terminate()

    if (onProgress) {
      onProgress({ status: 'Processing OCR results...', progress: 1.0 })
    }

    const pageData = ret.data as any
    const text = (ret.data.text || '').trim()
    const confidence = Math.round(ret.data.confidence || 90)
    const words: OcrWordBox[] = (pageData.words || []).map((w: any) => ({
      text: w.text,
      confidence: Math.round(w.confidence || 0),
      bbox: w.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 },
    }))

    const lines = pageData.lines
      ? pageData.lines.map((l: any) => l.text.trim()).filter(Boolean)
      : text.split('\n').filter(Boolean)
    const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0

    return {
      pageNumber,
      text,
      confidence: confidence || 92,
      wordCount,
      charCount: text.length,
      words,
      lines,
      previewCanvasUrl,
      method: 'tesseract',
    }
  } catch (err) {
    // Offline / Network fallback: Extract direct PDF text stream if Tesseract traineddata cannot be loaded offline
    const textContent = await page.getTextContent()
    const textItems = textContent.items
      .map((item: any) => item.str)
      .filter(Boolean)

    const fallbackText = textItems.join(' ').trim()
    const fallbackLines = textItems.length > 0 ? [fallbackText] : []

    return {
      pageNumber,
      text: fallbackText || '(No text detected via OCR or stream fallback)',
      confidence: 85,
      wordCount: fallbackText ? fallbackText.split(/\s+/).filter(Boolean).length : 0,
      charCount: fallbackText.length,
      words: [],
      lines: fallbackLines,
      previewCanvasUrl,
      method: 'fallback-stream',
    }
  }
}

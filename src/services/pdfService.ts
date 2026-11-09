import * as pdfjsLib from 'pdfjs-dist'
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Configure worker locally - 100% offline, zero network requests
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

export type { PDFDocumentProxy, PDFPageProxy }

export interface PageViewportDimensions {
  width: number
  height: number
  aspectRatio: number
}

// Active render tasks mapped by canvas to avoid overlapping renders
const activeRenderTasks = new WeakMap<HTMLCanvasElement, RenderTask>()

/**
 * Loads a PDF document from an ArrayBuffer, Uint8Array or URL
 */
export async function loadPdfDocument(
  source: ArrayBuffer | Uint8Array | string,
  password?: string
): Promise<PDFDocumentProxy> {
  if (typeof source === 'string') {
    const loadingTask = pdfjsLib.getDocument({ url: source, password })
    return await loadingTask.promise
  }

  if (!source) {
    throw new Error('PDF document data is missing')
  }

  let bytes: Uint8Array
  try {
    bytes = source instanceof Uint8Array ? source : new Uint8Array(source)
    if (bytes.byteLength === 0) {
      throw new Error('PDF document buffer has 0 bytes or is detached')
    }
  } catch (err) {
    throw new Error(`Cannot read PDF data: ${err instanceof Error ? err.message : 'detached ArrayBuffer'}`)
  }

  // Clone bytes so pdf.js Web Worker transfer NEVER detaches the caller's ArrayBuffer
  const cloned = new Uint8Array(bytes.byteLength)
  cloned.set(bytes)

  const loadingTask = pdfjsLib.getDocument({ data: cloned, password })
  return await loadingTask.promise
}

/**
 * Gets page dimensions without full rendering
 */
export async function getPageDimensions(
  page: PDFPageProxy,
  rotation = 0
): Promise<PageViewportDimensions> {
  const viewport = page.getViewport({ scale: 1.0, rotation })
  return {
    width: viewport.width,
    height: viewport.height,
    aspectRatio: viewport.width / viewport.height,
  }
}

/**
 * Renders a PDF page to a canvas with devicePixelRatio crisp scaling
 */
export async function renderPdfPage(
  page: PDFPageProxy,
  canvas: HTMLCanvasElement,
  scale: number,
  rotation = 0
): Promise<void> {
  // Cancel previous render on this canvas if still in progress
  const existingTask = activeRenderTasks.get(canvas)
  if (existingTask) {
    try {
      existingTask.cancel()
    } catch {
      // Ignore cancellation exceptions
    }
    activeRenderTasks.delete(canvas)
  }

  const dpr = window.devicePixelRatio || 1
  const viewport = page.getViewport({ scale: scale * dpr, rotation })
  const displayViewport = page.getViewport({ scale, rotation })

  const context = canvas.getContext('2d', { alpha: false })
  if (!context) {
    throw new Error('Failed to acquire 2D canvas rendering context')
  }

  // Set internal resolution for high-DPI displays
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)

  // Set CSS display dimensions
  canvas.style.width = `${Math.floor(displayViewport.width)}px`
  canvas.style.height = `${Math.floor(displayViewport.height)}px`

  const renderTask = page.render({
    canvasContext: context,
    canvas: canvas,
    viewport: viewport,
  })
  activeRenderTasks.set(canvas, renderTask)

  try {
    await renderTask.promise
  } catch (err: unknown) {
    // Only rethrow if not a cancellation
    if (err && typeof err === 'object' && 'name' in err && err.name !== 'RenderingCancelledException') {
      throw err
    }
  } finally {
    if (activeRenderTasks.get(canvas) === renderTask) {
      activeRenderTasks.delete(canvas)
    }
  }
}

/**
 * Renders a fast low-resolution thumbnail to a canvas
 */
export async function renderThumbnail(
  page: PDFPageProxy,
  canvas: HTMLCanvasElement,
  targetWidth = 140,
  rotation = 0
): Promise<void> {
  const unscaled = page.getViewport({ scale: 1.0, rotation })
  const scale = targetWidth / unscaled.width
  const dpr = Math.min(window.devicePixelRatio || 1, 2)

  const viewport = page.getViewport({ scale: scale * dpr, rotation })
  const displayViewport = page.getViewport({ scale, rotation })

  const context = canvas.getContext('2d', { alpha: false })
  if (!context) return

  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  canvas.style.width = `${Math.floor(displayViewport.width)}px`
  canvas.style.height = `${Math.floor(displayViewport.height)}px`

  const renderTask = page.render({
    canvasContext: context,
    canvas: canvas,
    viewport: viewport,
  })
  await renderTask.promise
}

/**
 * Creates a minimal, valid self-contained PDF ArrayBuffer for testing offline
 */
export function createSamplePdfBuffer(): ArrayBuffer {
  const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R 4 0 R 5 0 R] /Count 3 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 6 0 R /Resources << /Font << /F1 9 0 R >> >> >>
endobj
4 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 7 0 R /Resources << /Font << /F1 9 0 R >> >> >>
endobj
5 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 8 0 R /Resources << /Font << /F1 9 0 R >> >> >>
endobj
6 0 obj
<< /Length 195 >>
stream
BT
/F1 28 Tf
50 720 Td
(DocFusion Pro Sample PDF) Tj
/F1 14 Tf
0 -36 Td
(Page 1 of 3: Welcome to DocFusion Pro) Tj
/F1 12 Tf
0 -30 Td
(This sample document demonstrates offline rendering, thumbnail generation,) Tj
0 -18 Td
(continuous scrolling, single page view, zoom controls, and fit modes.) Tj
ET
endstream
endobj
7 0 obj
<< /Length 176 >>
stream
BT
/F1 24 Tf
50 720 Td
(Page 2: Offline Viewer Architecture) Tj
/F1 12 Tf
0 -36 Td
(DocFusion Pro renders PDF files completely client-side via Web Workers.) Tj
0 -20 Td
(No document content ever leaves your local computer or is sent to any server.) Tj
ET
endstream
endobj
8 0 obj
<< /Length 174 >>
stream
BT
/F1 24 Tf
50 720 Td
(Page 3: Productivity Suite Features) Tj
/F1 12 Tf
0 -36 Td
(Tested with continuous scroll, page navigation, fit width, and fit page.) Tj
0 -20 Td
(DocFusion Pro is ready for production use across desktop devices.) Tj
ET
endstream
endobj
9 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 10
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000130 00000 n 
0000000256 00000 n 
0000000382 00000 n 
0000000508 00000 n 
0000000755 00000 n 
0000000983 00000 n 
0000001209 00000 n 
trailer
<< /Size 10 /Root 1 0 R >>
startxref
1277
%%EOF`

  const encoder = new TextEncoder()
  const bytes = encoder.encode(pdfContent)
  return bytes.buffer
}

export interface DetectedTextItem {
  id: string
  pageNumber: number
  str: string
  x: number // in PDF unscaled points from top-left
  y: number // in PDF unscaled points from top-left
  width: number
  height: number
  fontSize: number
  fontName?: string
}

/**
 * Extracts and merges detected text items from a PDF page for direct editing and interchange
 */
export async function extractPageTextItems(
  page: PDFPageProxy,
  pageNumber: number,
  rotation = 0
): Promise<DetectedTextItem[]> {
  const viewport = page.getViewport({ scale: 1.0, rotation })
  const textContent = await page.getTextContent()

  const rawItems: {
    str: string
    x: number
    y: number
    width: number
    height: number
    fontSize: number
    fontName?: string
  }[] = []

  for (const item of textContent.items as any[]) {
    if (!item.str || !item.str.trim()) continue
    const tx = item.transform[4]
    const ty = item.transform[5]
    const fontSize = Math.max(8, Math.round(Math.hypot(item.transform[0], item.transform[1])))
    const y = Math.max(0, viewport.height - ty - fontSize)
    const x = Math.max(0, tx)
    const width = Math.max(8, Math.round(item.width))
    const height = Math.max(8, Math.round(item.height || fontSize))

    rawItems.push({
      str: item.str,
      x: Math.round(x),
      y: Math.round(y),
      width,
      height,
      fontSize,
      fontName: item.fontName,
    })
  }

  // Sort by Y ascending, then X ascending
  rawItems.sort((a, b) => {
    if (Math.abs(a.y - b.y) <= 4) {
      return a.x - b.x
    }
    return a.y - b.y
  })

  // Merge items on the same line if adjacent
  const merged: DetectedTextItem[] = []
  let curr: (typeof rawItems)[0] | null = null

  for (const item of rawItems) {
    if (!curr) {
      curr = { ...item }
      continue
    }

    const sameLine = Math.abs(curr.y - item.y) <= 4
    const adjacent =
      item.x >= curr.x &&
      item.x - (curr.x + curr.width) <= Math.max(16, curr.fontSize * 0.9)

    if (sameLine && adjacent) {
      const gap = item.x - (curr.x + curr.width)
      const needSpace = gap > 2 && !curr.str.endsWith(' ') && !item.str.startsWith(' ')
      curr.str += (needSpace ? ' ' : '') + item.str
      curr.width = Math.round(item.x + item.width - curr.x)
      curr.height = Math.max(curr.height, item.height)
      curr.fontSize = Math.max(curr.fontSize, item.fontSize)
    } else {
      merged.push({
        id: `txt_${pageNumber}_${merged.length}_${Math.random().toString(36).substring(2, 6)}`,
        pageNumber,
        ...curr,
      })
      curr = { ...item }
    }
  }

  if (curr) {
    merged.push({
      id: `txt_${pageNumber}_${merged.length}_${Math.random().toString(36).substring(2, 6)}`,
      pageNumber,
      ...curr,
    })
  }

  // Deduplicate items that have virtually identical coordinates (e.g. from previously overwritten/occluded text)
  const deduplicated: DetectedTextItem[] = []
  for (const item of merged) {
    const isDuplicate = deduplicated.some(
      (existing) =>
        Math.abs(existing.x - item.x) <= 4 &&
        Math.abs(existing.y - item.y) <= 4 &&
        Math.abs(existing.width - item.width) <= 8
    )
    if (!isDuplicate) {
      deduplicated.push(item)
    }
  }

  return deduplicated
}


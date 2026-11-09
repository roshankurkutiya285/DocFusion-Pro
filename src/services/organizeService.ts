import { PDFDocument, degrees } from 'pdf-lib'

export interface CropMargins {
  top: number
  right: number
  bottom: number
  left: number
}

/**
 * Converts a Uint8Array into a pristine ArrayBuffer
 */
export function toArrayBuffer(uint8Array: Uint8Array): ArrayBuffer {
  const buf = new ArrayBuffer(uint8Array.byteLength)
  new Uint8Array(buf).set(uint8Array)
  return buf
}

/**
 * Ensures an ArrayBuffer or Uint8Array is non-detached, healthy, and isolated
 */
export function toSafeLoadableBuffer(source: ArrayBuffer | Uint8Array): Uint8Array {
  if (!source) {
    throw new Error('PDF document data is required')
  }
  try {
    const uint8 = source instanceof Uint8Array ? source : new Uint8Array(source)
    if (uint8.byteLength === 0) {
      throw new Error('PDF document buffer has 0 bytes or is detached')
    }
    const safeCopy = new Uint8Array(uint8.byteLength)
    safeCopy.set(uint8)
    return safeCopy
  } catch (err) {
    throw new Error(
      `Cannot read PDF document data: ${err instanceof Error ? err.message : 'detached ArrayBuffer'}`
    )
  }
}

/**
 * Downloads a Uint8Array as a PDF file
 */
export function downloadPdfBlob(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Merges multiple PDF ArrayBuffers into a single PDF
 */
export async function mergePdfs(pdfBuffers: (ArrayBuffer | Uint8Array)[]): Promise<Uint8Array> {
  if (pdfBuffers.length === 0) {
    throw new Error('At least one PDF is required to merge')
  }

  const mergedDoc = await PDFDocument.create()

  for (const buffer of pdfBuffers) {
    const safeData = toSafeLoadableBuffer(buffer)
    const doc = await PDFDocument.load(safeData, { ignoreEncryption: true })
    const pageIndices = doc.getPageIndices()
    const copiedPages = await mergedDoc.copyPages(doc, pageIndices)
    for (const page of copiedPages) {
      mergedDoc.addPage(page)
    }
  }

  return await mergedDoc.save()
}

/**
 * Splits a PDF document into multiple documents based on page ranges (1-indexed)
 */
export async function splitPdf(
  sourceBuffer: ArrayBuffer | Uint8Array,
  ranges: { from: number; to: number }[]
): Promise<{ name: string; bytes: Uint8Array }[]> {
  const safeData = toSafeLoadableBuffer(sourceBuffer)
  const srcDoc = await PDFDocument.load(safeData, { ignoreEncryption: true })
  const totalPages = srcDoc.getPageCount()
  const results: { name: string; bytes: Uint8Array }[] = []

  for (let i = 0; i < ranges.length; i++) {
    const range = ranges[i]
    const from = Math.max(1, Math.min(range.from, totalPages))
    const to = Math.max(from, Math.min(range.to, totalPages))

    const subDoc = await PDFDocument.create()
    const indicesToCopy: number[] = []
    for (let p = from; p <= to; p++) {
      indicesToCopy.push(p - 1) // 0-indexed
    }

    const copied = await subDoc.copyPages(srcDoc, indicesToCopy)
    for (const page of copied) {
      subDoc.addPage(page)
    }

    const bytes = await subDoc.save()
    results.push({
      name: `split_part_${i + 1}_pages_${from}-${to}.pdf`,
      bytes,
    })
  }

  return results
}

/**
 * Reorders pages of a PDF given an array of page indices (0-indexed)
 */
export async function reorderPages(
  sourceBuffer: ArrayBuffer | Uint8Array,
  newOrderIndices: number[]
): Promise<Uint8Array> {
  const safeData = toSafeLoadableBuffer(sourceBuffer)
  const srcDoc = await PDFDocument.load(safeData, { ignoreEncryption: true })
  const newDoc = await PDFDocument.create()

  const copiedPages = await newDoc.copyPages(srcDoc, newOrderIndices)
  for (const page of copiedPages) {
    newDoc.addPage(page)
  }

  return await newDoc.save()
}

/**
 * Rotates designated pages (0-indexed) by a delta angle (+90, +180, +270)
 */
export async function rotatePages(
  sourceBuffer: ArrayBuffer | Uint8Array,
  pageIndicesToRotate: number[],
  deltaAngle: number
): Promise<Uint8Array> {
  const safeData = toSafeLoadableBuffer(sourceBuffer)
  const doc = await PDFDocument.load(safeData, { ignoreEncryption: true })
  const pages = doc.getPages()

  for (const idx of pageIndicesToRotate) {
    if (idx >= 0 && idx < pages.length) {
      const page = pages[idx]
      const currentRotation = page.getRotation().angle
      const nextAngle = ((currentRotation + deltaAngle) % 360 + 360) % 360
      page.setRotation(degrees(nextAngle))
    }
  }

  return await doc.save()
}

/**
 * Deletes specified pages (0-indexed) from a PDF
 */
export async function deletePages(
  sourceBuffer: ArrayBuffer | Uint8Array,
  pageIndicesToDelete: number[]
): Promise<Uint8Array> {
  const safeData = toSafeLoadableBuffer(sourceBuffer)
  const srcDoc = await PDFDocument.load(safeData, { ignoreEncryption: true })
  const totalPages = srcDoc.getPageCount()

  const deleteSet = new Set(pageIndicesToDelete)
  if (deleteSet.size >= totalPages) {
    throw new Error('Cannot delete all pages from the document. At least one page must remain.')
  }

  const keepIndices: number[] = []
  for (let i = 0; i < totalPages; i++) {
    if (!deleteSet.has(i)) {
      keepIndices.push(i)
    }
  }

  const newDoc = await PDFDocument.create()
  const copiedPages = await newDoc.copyPages(srcDoc, keepIndices)
  for (const page of copiedPages) {
    newDoc.addPage(page)
  }

  return await newDoc.save()
}

/**
 * Duplicates specified pages (0-indexed), placing copies directly after the originals
 */
export async function duplicatePages(
  sourceBuffer: ArrayBuffer | Uint8Array,
  pageIndicesToDuplicate: number[]
): Promise<Uint8Array> {
  const safeData = toSafeLoadableBuffer(sourceBuffer)
  const srcDoc = await PDFDocument.load(safeData, { ignoreEncryption: true })
  const newDoc = await PDFDocument.create()
  const totalPages = srcDoc.getPageCount()
  const duplicateSet = new Set(pageIndicesToDuplicate)

  for (let i = 0; i < totalPages; i++) {
    // Copy the original page
    const [origPage] = await newDoc.copyPages(srcDoc, [i])
    newDoc.addPage(origPage)

    // If marked for duplication, copy again
    if (duplicateSet.has(i)) {
      const [dupPage] = await newDoc.copyPages(srcDoc, [i])
      newDoc.addPage(dupPage)
    }
  }

  return await newDoc.save()
}

/**
 * Inserts a blank page into the document at a specific index (0-indexed)
 */
export async function insertBlankPage(
  sourceBuffer: ArrayBuffer | Uint8Array,
  insertAtIndex: number,
  width = 612,
  height = 792
): Promise<Uint8Array> {
  const safeData = toSafeLoadableBuffer(sourceBuffer)
  const doc = await PDFDocument.load(safeData, { ignoreEncryption: true })
  const totalPages = doc.getPageCount()
  const clampedIndex = Math.max(0, Math.min(insertAtIndex, totalPages))

  // If previous page exists, inherit its size
  if (totalPages > 0) {
    const referenceIndex = Math.min(clampedIndex, totalPages - 1)
    const refPage = doc.getPage(referenceIndex)
    const size = refPage.getSize()
    width = size.width
    height = size.height
  }

  doc.insertPage(clampedIndex, [width, height])
  return await doc.save()
}

/**
 * Extracts specified pages (0-indexed) into a new standalone PDF
 */
export async function extractPages(
  sourceBuffer: ArrayBuffer | Uint8Array,
  pageIndicesToExtract: number[]
): Promise<Uint8Array> {
  if (pageIndicesToExtract.length === 0) {
    throw new Error('Please select at least one page to extract')
  }

  const safeData = toSafeLoadableBuffer(sourceBuffer)
  const srcDoc = await PDFDocument.load(safeData, { ignoreEncryption: true })
  const newDoc = await PDFDocument.create()

  const copiedPages = await newDoc.copyPages(srcDoc, pageIndicesToExtract)
  for (const page of copiedPages) {
    newDoc.addPage(page)
  }

  return await newDoc.save()
}

/**
 * Crops specified pages (0-indexed) by applying margin insets to CropBox / MediaBox
 */
export async function cropPages(
  sourceBuffer: ArrayBuffer | Uint8Array,
  pageIndicesToCrop: number[],
  margins: CropMargins
): Promise<Uint8Array> {
  const safeData = toSafeLoadableBuffer(sourceBuffer)
  const doc = await PDFDocument.load(safeData, { ignoreEncryption: true })
  const pages = doc.getPages()

  for (const idx of pageIndicesToCrop) {
    if (idx >= 0 && idx < pages.length) {
      const page = pages[idx]
      const { width, height } = page.getSize()

      const newX = margins.left
      const newY = margins.bottom
      const newWidth = Math.max(20, width - margins.left - margins.right)
      const newHeight = Math.max(20, height - margins.top - margins.bottom)

      page.setCropBox(newX, newY, newWidth, newHeight)
    }
  }

  return await doc.save()
}

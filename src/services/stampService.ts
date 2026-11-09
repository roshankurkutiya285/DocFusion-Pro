import { PDFDocument, degrees, StandardFonts } from 'pdf-lib'
import { hexToRgb, dataUrlToBytes } from './editService'
import { toSafeLoadableBuffer } from './organizeService'

export type StampPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

export interface WatermarkOptions {
  enabled: boolean
  type: 'text' | 'image'
  text?: string
  imageDataUrl?: string
  fontSize?: number
  color?: string
  opacity?: number // 0.1 to 1.0
  rotation?: number // in degrees, e.g. 45
  applyTo: 'all' | 'odd' | 'even' | 'range'
  pageRange?: string
}

export interface PageNumberOptions {
  enabled: boolean
  format: 'X' | 'Page X' | 'Page X of Y' | 'X / Y' | 'bates'
  batesPrefix?: string
  position: StampPosition
  fontSize?: number
  color?: string
  startAt?: number // starting number, default 1
  startPage?: number // page on which numbering starts, default 1
  margin?: number // offset from edge in points, default 30
}

export interface HeaderOptions {
  enabled: boolean
  text: string
  alignment: 'left' | 'center' | 'right'
  fontSize?: number
  color?: string
  marginTop?: number
  excludeFirstPage?: boolean
}

export interface FooterOptions {
  enabled: boolean
  text: string
  alignment: 'left' | 'center' | 'right'
  fontSize?: number
  color?: string
  marginBottom?: number
  excludeFirstPage?: boolean
}

export interface DateStampOptions {
  enabled: boolean
  format: 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD Mon YYYY' | 'custom'
  prefix?: string // e.g. "APPROVED ON " or "RECEIVED: "
  customDate?: string
  includeTime?: boolean
  position: StampPosition
  fontSize?: number
  color?: string
  margin?: number
}

export interface AllStampOptions {
  watermark?: WatermarkOptions
  pageNumbers?: PageNumberOptions
  header?: HeaderOptions
  footer?: FooterOptions
  dateStamp?: DateStampOptions
}

/**
 * Checks if a 1-indexed page number should receive the stamp
 */
function shouldApplyToPage(
  pageNum: number,
  applyTo: 'all' | 'odd' | 'even' | 'range',
  rangeStr?: string
): boolean {
  if (applyTo === 'all') return true
  if (applyTo === 'odd') return pageNum % 2 !== 0
  if (applyTo === 'even') return pageNum % 2 === 0
  if (applyTo === 'range' && rangeStr) {
    const parts = rangeStr.split(',').map((p) => p.trim())
    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map((s) => parseInt(s.trim(), 10))
        if (!isNaN(start) && !isNaN(end) && pageNum >= start && pageNum <= end) return true
      } else {
        const single = parseInt(part, 10)
        if (!isNaN(single) && pageNum === single) return true
      }
    }
    return false
  }
  return true
}

/**
 * Calculates (x, y) coordinates for position alignments
 */
function calculatePositionCoords(
  position: StampPosition,
  pageWidth: number,
  pageHeight: number,
  textWidth: number,
  textHeight: number,
  margin = 30
): { x: number; y: number } {
  let x = margin
  let y = margin

  // Horizontal X
  if (position === 'top-left' || position === 'bottom-left') {
    x = margin
  } else if (position === 'top-center' || position === 'bottom-center') {
    x = (pageWidth - textWidth) / 2
  } else if (position === 'top-right' || position === 'bottom-right') {
    x = pageWidth - textWidth - margin
  }

  // Vertical Y
  if (position.startsWith('top')) {
    y = pageHeight - margin - textHeight
  } else {
    y = margin
  }

  return { x, y }
}

/**
 * Formats date based on date stamp options
 */
export function formatDateStamp(options: DateStampOptions): string {
  const d = options.customDate ? new Date(options.customDate) : new Date()
  let dateText = ''

  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  switch (options.format) {
    case 'YYYY-MM-DD':
      dateText = `${year}-${month}-${day}`
      break
    case 'MM/DD/YYYY':
      dateText = `${month}/${day}/${year}`
      break
    case 'DD Mon YYYY':
      dateText = `${day} ${monthNames[d.getMonth()]} ${year}`
      break
    default:
      dateText = `${year}-${month}-${day}`
  }

  if (options.includeTime) {
    const hours = String(d.getHours()).padStart(2, '0')
    const mins = String(d.getMinutes()).padStart(2, '0')
    dateText += ` ${hours}:${mins}`
  }

  return `${options.prefix || ''}${dateText}`
}

/**
 * Applies all selected stamps in a single unified pass
 */
export async function applyStamps(
  sourceBuffer: ArrayBuffer | Uint8Array,
  options: AllStampOptions
): Promise<Uint8Array> {
  const safeData = toSafeLoadableBuffer(sourceBuffer)
  const doc = await PDFDocument.load(safeData, { ignoreEncryption: true })
  const pages = doc.getPages()
  const totalPages = pages.length

  const fontHelvetica = await doc.embedFont(StandardFonts.Helvetica)
  const fontHelveticaBold = await doc.embedFont(StandardFonts.HelveticaBold)

  // 1. Watermark setup if image
  let embeddedWatermarkImg: any = null
  if (options.watermark?.enabled && options.watermark.type === 'image' && options.watermark.imageDataUrl) {
    try {
      const bytes = dataUrlToBytes(options.watermark.imageDataUrl)
      embeddedWatermarkImg = options.watermark.imageDataUrl.includes('image/png')
        ? await doc.embedPng(bytes)
        : await doc.embedJpg(bytes)
    } catch (err) {
      console.error('Failed to embed watermark image', err)
    }
  }

  // Iterate pages
  for (let idx = 0; idx < totalPages; idx++) {
    const page = pages[idx]
    const pageNum = idx + 1
    const { width: pageWidth, height: pageHeight } = page.getSize()

    // --- A. Apply Watermark ---
    if (options.watermark?.enabled) {
      const wm = options.watermark
      if (shouldApplyToPage(pageNum, wm.applyTo, wm.pageRange)) {
        const opacity = wm.opacity ?? 0.25
        const angle = degrees(wm.rotation ?? 45)

        if (wm.type === 'text' && wm.text) {
          const fontSize = wm.fontSize ?? 48
          const color = hexToRgb(wm.color ?? '#64748b')
          const textWidth = fontHelveticaBold.widthOfTextAtSize(wm.text, fontSize)

          // Center watermark on page
          const x = (pageWidth - textWidth) / 2
          const y = pageHeight / 2

          page.drawText(wm.text, {
            x,
            y,
            size: fontSize,
            font: fontHelveticaBold,
            color,
            opacity,
            rotate: angle,
          })
        } else if (wm.type === 'image' && embeddedWatermarkImg) {
          const imgWidth = 250
          const imgHeight = (embeddedWatermarkImg.height / embeddedWatermarkImg.width) * imgWidth
          const x = (pageWidth - imgWidth) / 2
          const y = (pageHeight - imgHeight) / 2

          page.drawImage(embeddedWatermarkImg, {
            x,
            y,
            width: imgWidth,
            height: imgHeight,
            opacity,
            rotate: angle,
          })
        }
      }
    }

    // --- B. Apply Header ---
    if (options.header?.enabled && options.header.text) {
      const hdr = options.header
      const isExcluded = hdr.excludeFirstPage && pageNum === 1
      if (!isExcluded) {
        const fontSize = hdr.fontSize ?? 10
        const color = hexToRgb(hdr.color ?? '#475569')
        const textWidth = fontHelvetica.widthOfTextAtSize(hdr.text, fontSize)
        const marginTop = hdr.marginTop ?? 24

        let x = 36
        if (hdr.alignment === 'center') {
          x = (pageWidth - textWidth) / 2
        } else if (hdr.alignment === 'right') {
          x = pageWidth - textWidth - 36
        }

        const y = pageHeight - marginTop - fontSize
        page.drawText(hdr.text, {
          x,
          y,
          size: fontSize,
          font: fontHelvetica,
          color,
        })
      }
    }

    // --- C. Apply Footer ---
    if (options.footer?.enabled && options.footer.text) {
      const ftr = options.footer
      const isExcluded = ftr.excludeFirstPage && pageNum === 1
      if (!isExcluded) {
        const fontSize = ftr.fontSize ?? 10
        const color = hexToRgb(ftr.color ?? '#475569')
        const textWidth = fontHelvetica.widthOfTextAtSize(ftr.text, fontSize)
        const marginBottom = ftr.marginBottom ?? 24

        let x = 36
        if (ftr.alignment === 'center') {
          x = (pageWidth - textWidth) / 2
        } else if (ftr.alignment === 'right') {
          x = pageWidth - textWidth - 36
        }

        page.drawText(ftr.text, {
          x,
          y: marginBottom,
          size: fontSize,
          font: fontHelvetica,
          color,
        })
      }
    }

    // --- D. Apply Page Numbers ---
    if (options.pageNumbers?.enabled) {
      const pno = options.pageNumbers
      const startPage = pno.startPage ?? 1
      if (pageNum >= startPage) {
        const currentNum = (pno.startAt ?? 1) + (pageNum - startPage)
        let numStr = ''
        switch (pno.format) {
          case 'X':
            numStr = `${currentNum}`
            break
          case 'Page X':
            numStr = `Page ${currentNum}`
            break
          case 'Page X of Y':
            numStr = `Page ${currentNum} of ${totalPages}`
            break
          case 'X / Y':
            numStr = `${currentNum} / ${totalPages}`
            break
          case 'bates':
            numStr = `${pno.batesPrefix || 'BATES-'}${String(currentNum).padStart(6, '0')}`
            break
        }

        const fontSize = pno.fontSize ?? 10
        const color = hexToRgb(pno.color ?? '#334155')
        const textWidth = fontHelvetica.widthOfTextAtSize(numStr, fontSize)
        const coords = calculatePositionCoords(
          pno.position || 'bottom-center',
          pageWidth,
          pageHeight,
          textWidth,
          fontSize,
          pno.margin ?? 25
        )

        page.drawText(numStr, {
          x: coords.x,
          y: coords.y,
          size: fontSize,
          font: fontHelvetica,
          color,
        })
      }
    }

    // --- E. Apply Date Stamp ---
    if (options.dateStamp?.enabled) {
      const ds = options.dateStamp
      const dateText = formatDateStamp(ds)
      const fontSize = ds.fontSize ?? 10
      const color = hexToRgb(ds.color ?? '#0f172a')
      const textWidth = fontHelveticaBold.widthOfTextAtSize(dateText, fontSize)

      const coords = calculatePositionCoords(
        ds.position || 'top-right',
        pageWidth,
        pageHeight,
        textWidth,
        fontSize,
        ds.margin ?? 30
      )

      page.drawText(dateText, {
        x: coords.x,
        y: coords.y,
        size: fontSize,
        font: fontHelveticaBold,
        color,
      })
    }
  }

  return await doc.save()
}

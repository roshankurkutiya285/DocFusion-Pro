import {
  PDFDocument,
  rgb,
  StandardFonts,
} from 'pdf-lib'
import type { AnyAnnotation, Point } from '@/types/edit'
import { toSafeLoadableBuffer } from './organizeService'

/**
 * Parses Hex color (#RRGGBB) to pdf-lib rgb(r, g, b)
 */
export function hexToRgb(hex: string) {
  let cleaned = hex.replace('#', '').trim()
  if (cleaned.length === 3) {
    cleaned = cleaned
      .split('')
      .map((c) => c + c)
      .join('')
  }
  const num = parseInt(cleaned, 16)
  if (isNaN(num)) return rgb(0, 0, 0)
  const r = ((num >> 16) & 255) / 255
  const g = ((num >> 8) & 255) / 255
  const b = (num & 255) / 255
  return rgb(r, g, b)
}

/**
 * Converts a Base64 Data URL to Uint8Array bytes
 */
export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const parts = dataUrl.split(',')
  const base64 = parts.length > 1 ? parts[1] : parts[0]
  const binary = atob(base64)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * Converts points array into SVG path string
 */
function pointsToSvgPath(points: Point[], pageHeight: number): string {
  if (points.length === 0) return ''
  const first = points[0]
  let d = `M ${first.x} ${pageHeight - first.y}`
  for (let i = 1; i < points.length; i++) {
    const pt = points[i]
    d += ` L ${pt.x} ${pageHeight - pt.y}`
  }
  return d
}

/**
 * Applies all interactive annotations and form edits directly to a PDF
 */
export async function applyEditsToPdf(
  sourceBuffer: ArrayBuffer | Uint8Array,
  annotations: AnyAnnotation[]
): Promise<Uint8Array> {
  const safeData = toSafeLoadableBuffer(sourceBuffer)
  const doc = await PDFDocument.load(safeData, { ignoreEncryption: true })

  // Embed regular and bold fonts
  const fontHelvetica = await doc.embedFont(StandardFonts.Helvetica)
  const fontHelveticaBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const fontTimes = await doc.embedFont(StandardFonts.TimesRoman)
  const fontTimesBold = await doc.embedFont(StandardFonts.TimesRomanBold)
  const fontCourier = await doc.embedFont(StandardFonts.Courier)
  const fontCourierBold = await doc.embedFont(StandardFonts.CourierBold)

  const pages = doc.getPages()
  const form = doc.getForm()

  // Group annotations by page
  const annotationsByPage = new Map<number, AnyAnnotation[]>()
  for (const ann of annotations) {
    const list = annotationsByPage.get(ann.pageIndex) || []
    list.push(ann)
    annotationsByPage.set(ann.pageIndex, list)
  }

  for (const [pageIdx, pageAnnotations] of annotationsByPage.entries()) {
    if (pageIdx < 0 || pageIdx >= pages.length) continue
    const page = pages[pageIdx]
    const { height: pageHeight } = page.getSize()

    // Sort annotations by layer order: whiteout & redact MUST be drawn first to mask existing content
    const sortedAnnotations = [...pageAnnotations].sort((a, b) => {
      const priorityMap: Record<string, number> = {
        whiteout: 1,
        redact: 2,
        highlight: 3,
        shape: 4,
        draw: 5,
        addImage: 6,
        underline: 7,
        editText: 8,
        addText: 9,
        signature: 10,
        form: 11,
      }
      const pA = priorityMap[a.type] ?? 50
      const pB = priorityMap[b.type] ?? 50
      if (pA !== pB) return pA - pB
      return a.createdAt - b.createdAt
    })

    for (const ann of sortedAnnotations) {
      switch (ann.type) {
        case 'addText':
        case 'editText': {
          const isBold = !!ann.isBold
          const font =
            ann.fontFamily === 'TimesRoman'
              ? (isBold ? fontTimesBold : fontTimes)
              : ann.fontFamily === 'Courier'
              ? (isBold ? fontCourierBold : fontCourier)
              : (isBold ? fontHelveticaBold : fontHelvetica)

          const color = hexToRgb(ann.color)
          const pdfY = pageHeight - ann.y - ann.fontSize

          page.drawText(ann.text || '', {
            x: ann.x,
            y: Math.max(0, pdfY),
            size: ann.fontSize,
            lineHeight: ann.fontSize * 1.25,
            font,
            color,
          })
          break
        }

        case 'addImage': {
          if (!ann.dataUrl) break
          try {
            const imgBytes = dataUrlToBytes(ann.dataUrl)
            const embeddedImage = ann.dataUrl.includes('image/png')
              ? await doc.embedPng(imgBytes)
              : await doc.embedJpg(imgBytes)

            const pdfY = pageHeight - ann.y - ann.height
            page.drawImage(embeddedImage, {
              x: ann.x,
              y: pdfY,
              width: ann.width,
              height: ann.height,
            })
          } catch (err) {
            console.error('Failed to embed image annotation', err)
          }
          break
        }

        case 'highlight': {
          const color = hexToRgb(ann.color || '#facc15')
          const pdfY = pageHeight - ann.y - ann.height
          page.drawRectangle({
            x: ann.x,
            y: pdfY,
            width: ann.width,
            height: ann.height,
            color,
            opacity: ann.opacity ?? 0.35,
          })
          break
        }

        case 'underline': {
          const color = hexToRgb(ann.color || '#2563eb')
          const pdfY = pageHeight - ann.y
          page.drawLine({
            start: { x: ann.x, y: pdfY },
            end: { x: ann.x + ann.width, y: pdfY },
            thickness: ann.thickness || 2,
            color,
          })
          break
        }

        case 'draw': {
          if (ann.points.length < 2) break
          const color = hexToRgb(ann.color || '#000000')
          const path = pointsToSvgPath(ann.points, pageHeight)
          if (path) {
            try {
              page.drawSvgPath(path, {
                borderColor: color,
                borderWidth: ann.strokeWidth || 2,
              })
            } catch {
              // Fallback to line segments
              for (let i = 0; i < ann.points.length - 1; i++) {
                const p1 = ann.points[i]
                const p2 = ann.points[i + 1]
                page.drawLine({
                  start: { x: p1.x, y: pageHeight - p1.y },
                  end: { x: p2.x, y: pageHeight - p2.y },
                  thickness: ann.strokeWidth || 2,
                  color,
                })
              }
            }
          }
          break
        }

        case 'shape': {
          const strokeColor = hexToRgb(ann.strokeColor || '#000000')
          const fillColor = ann.fillColor ? hexToRgb(ann.fillColor) : undefined
          const normX = Math.min(ann.x, ann.x + ann.width)
          const normY = Math.min(ann.y, ann.y + ann.height)
          const normW = Math.max(2, Math.abs(ann.width))
          const normH = Math.max(2, Math.abs(ann.height))
          const pdfY = pageHeight - normY - normH

          if (ann.shapeType === 'rectangle') {
            page.drawRectangle({
              x: normX,
              y: pdfY,
              width: normW,
              height: normH,
              borderColor: strokeColor,
              borderWidth: ann.strokeWidth || 2,
              color: fillColor,
            })
          } else if (ann.shapeType === 'circle') {
            const xRadius = normW / 2
            const yRadius = normH / 2
            page.drawEllipse({
              x: normX + xRadius,
              y: pdfY + yRadius,
              xScale: xRadius,
              yScale: yRadius,
              borderColor: strokeColor,
              borderWidth: ann.strokeWidth || 2,
              color: fillColor,
            })
          } else if (ann.shapeType === 'line' || ann.shapeType === 'arrow') {
            page.drawLine({
              start: { x: ann.x, y: pageHeight - ann.y },
              end: { x: ann.x + ann.width, y: pageHeight - (ann.y + ann.height) },
              thickness: ann.strokeWidth || 2,
              color: strokeColor,
            })
            // If arrow, draw arrowhead lines
            if (ann.shapeType === 'arrow') {
              const endX = ann.x + ann.width
              const endY = pageHeight - (ann.y + ann.height)
              const angle = Math.atan2(-ann.height, ann.width)
              const headLen = 12
              page.drawLine({
                start: { x: endX, y: endY },
                end: {
                  x: endX - headLen * Math.cos(angle - Math.PI / 6),
                  y: endY - headLen * Math.sin(angle - Math.PI / 6),
                },
                thickness: ann.strokeWidth || 2,
                color: strokeColor,
              })
              page.drawLine({
                start: { x: endX, y: endY },
                end: {
                  x: endX - headLen * Math.cos(angle + Math.PI / 6),
                  y: endY - headLen * Math.sin(angle + Math.PI / 6),
                },
                thickness: ann.strokeWidth || 2,
                color: strokeColor,
              })
            }
          }
          break
        }

        case 'whiteout': {
          const normX = Math.min(ann.x, ann.x + ann.width)
          const normY = Math.min(ann.y, ann.y + ann.height)
          const normW = Math.max(2, Math.abs(ann.width))
          const normH = Math.max(2, Math.abs(ann.height))
          const pdfY = pageHeight - normY - normH
          page.drawRectangle({
            x: normX,
            y: pdfY,
            width: normW,
            height: normH,
            color: rgb(1, 1, 1),
            opacity: 1.0,
          })
          break
        }

        case 'redact': {
          const normX = Math.min(ann.x, ann.x + ann.width)
          const normY = Math.min(ann.y, ann.y + ann.height)
          const normW = Math.max(2, Math.abs(ann.width))
          const normH = Math.max(2, Math.abs(ann.height))
          const pdfY = pageHeight - normY - normH
          page.drawRectangle({
            x: normX,
            y: pdfY,
            width: normW,
            height: normH,
            color: rgb(0, 0, 0),
            opacity: 1.0,
          })
          if (ann.overlayText) {
            page.drawText(ann.overlayText, {
              x: normX + 4,
              y: pdfY + 4,
              size: 10,
              font: fontHelvetica,
              color: rgb(1, 1, 1),
            })
          }
          break
        }

        case 'form': {
          try {
            if (ann.fieldType === 'text') {
              // Try updating existing PDF form field, or draw text box
              try {
                const field = form.getTextField(ann.name)
                field.setText(String(ann.value || ''))
              } catch {
                // If no field by that name, draw fill text and border
                const pdfY = pageHeight - ann.y - ann.height
                page.drawRectangle({
                  x: ann.x,
                  y: pdfY,
                  width: ann.width,
                  height: ann.height,
                  borderColor: rgb(0.2, 0.4, 0.8),
                  borderWidth: 1,
                  color: rgb(0.97, 0.98, 1.0),
                })
                page.drawText(String(ann.value || ''), {
                  x: ann.x + 4,
                  y: pdfY + 4,
                  size: 11,
                  font: fontHelvetica,
                  color: rgb(0, 0, 0),
                })
              }
            } else if (ann.fieldType === 'checkbox') {
              try {
                const box = form.getCheckBox(ann.name)
                if (ann.value) box.check()
                else box.uncheck()
              } catch {
                const pdfY = pageHeight - ann.y - ann.height
                page.drawRectangle({
                  x: ann.x,
                  y: pdfY,
                  width: ann.width,
                  height: ann.height,
                  borderColor: rgb(0, 0, 0),
                  borderWidth: 1.5,
                })
                if (ann.value) {
                  page.drawLine({
                    start: { x: ann.x + 2, y: pdfY + 2 },
                    end: { x: ann.x + ann.width - 2, y: pdfY + ann.height - 2 },
                    thickness: 2,
                    color: rgb(0, 0, 0),
                  })
                  page.drawLine({
                    start: { x: ann.x + 2, y: pdfY + ann.height - 2 },
                    end: { x: ann.x + ann.width - 2, y: pdfY + 2 },
                    thickness: 2,
                    color: rgb(0, 0, 0),
                  })
                }
              }
            }
          } catch (err) {
            console.error('Failed to process form field', err)
          }
          break
        }

        case 'signature': {
          if (!ann.dataUrl) break
          try {
            const sigBytes = dataUrlToBytes(ann.dataUrl)
            const embeddedSig = await doc.embedPng(sigBytes)
            const pdfY = pageHeight - ann.y - ann.height
            page.drawImage(embeddedSig, {
              x: ann.x,
              y: pdfY,
              width: ann.width,
              height: ann.height,
            })
          } catch (err) {
            console.error('Failed to embed signature', err)
          }
          break
        }
      }
    }
  }

  return await doc.save()
}

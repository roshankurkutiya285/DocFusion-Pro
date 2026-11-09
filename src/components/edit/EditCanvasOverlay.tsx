import React, { useState, useRef, useEffect, useCallback } from 'react'
import type { AnyAnnotation, EditToolType, ShapeType, Point, TextAnnotation, WhiteoutAnnotation } from '@/types/edit'
import type { DetectedTextItem } from '@/services/pdfService'
import {
  Trash2,
  Copy,
  Bold,
  Check,
  X,
  Type,
  FileEdit,
  ArrowLeftRight,
  Edit,
  Move,
  Eraser,
} from 'lucide-react'
import { cn } from '@/utils/cn'

interface EditCanvasOverlayProps {
  pageIndex: number
  width: number
  height: number
  scale: number
  activeTool: EditToolType
  activeShape: ShapeType
  color: string
  fontSize: number
  strokeWidth: number
  isBold?: boolean
  fontFamily?: 'Helvetica' | 'TimesRoman' | 'Courier'
  signatureDataUrl: string | null
  annotations: AnyAnnotation[]
  detectedTextItems?: DetectedTextItem[]
  onAddAnnotation: (annotation: AnyAnnotation) => void
  onAddAnnotations?: (annotations: AnyAnnotation[]) => void
  onUpdateAnnotation: (id: string, updates: Partial<AnyAnnotation>) => void
  onDeleteAnnotation: (id: string) => void
  onSelectTool?: (tool: EditToolType) => void
}

export const EditCanvasOverlay: React.FC<EditCanvasOverlayProps> = ({
  pageIndex,
  width,
  height,
  scale,
  activeTool,
  activeShape,
  color,
  fontSize,
  strokeWidth,
  isBold = false,
  fontFamily = 'Helvetica',
  signatureDataUrl,
  annotations,
  detectedTextItems = [],
  onAddAnnotation,
  onAddAnnotations,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onSelectTool,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)

  // Selection & drag states
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 })
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState<string | null>(null)
  const [initialResizeAnn, setInitialResizeAnn] = useState<AnyAnnotation | null>(null)

  // Drawing states
  const [isMouseDown, setIsMouseDown] = useState(false)
  const [startPoint, setStartPoint] = useState<Point | null>(null)
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null)
  const [freehandPoints, setFreehandPoints] = useState<Point[]>([])

  // Inline text creator / editor state
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const [newTextPos, setNewTextPos] = useState<Point | null>(null)
  const [newTextValue, setNewTextValue] = useState('')

  // Existing text detection & interchange state
  const [activeEditItem, setActiveEditItem] = useState<DetectedTextItem | null>(null)
  const [editItemValue, setEditItemValue] = useState('')
  const [swapItem1, setSwapItem1] = useState<DetectedTextItem | null>(null)
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null)

  // Direct Interchange / Swap of 2 existing text items on the page
  const handleItemClickForInterchange = (item: DetectedTextItem) => {
    if (!swapItem1) {
      setSwapItem1(item)
      return
    }

    if (swapItem1.id === item.id) {
      setSwapItem1(null)
      return
    }

    const now = Date.now()
    const padX = 1
    const padY = 0.5

    // 1. Whiteout mask over 1st item
    const wo1: WhiteoutAnnotation = {
      id: `wo_swp_${swapItem1.id}_${now}`,
      pageIndex,
      type: 'whiteout',
      createdAt: now,
      x: Math.max(0, swapItem1.x - padX),
      y: Math.max(0, swapItem1.y - padY),
      width: swapItem1.width + padX * 2,
      height: swapItem1.height + padY * 2,
    }
    // 2. Text of 2nd item placed at 1st item's position
    const txt1: AnyAnnotation = {
      id: `txt_swp_${swapItem1.id}_${now + 1}`,
      pageIndex,
      type: 'editText',
      createdAt: now + 1,
      x: swapItem1.x,
      y: swapItem1.y,
      text: item.str,
      fontSize: swapItem1.fontSize,
      color,
      fontFamily,
      isBold,
    }
    // 3. Whiteout mask over 2nd item
    const wo2: WhiteoutAnnotation = {
      id: `wo_swp_${item.id}_${now + 2}`,
      pageIndex,
      type: 'whiteout',
      createdAt: now + 2,
      x: Math.max(0, item.x - padX),
      y: Math.max(0, item.y - padY),
      width: item.width + padX * 2,
      height: item.height + padY * 2,
    }
    // 4. Text of 1st item placed at 2nd item's position
    const txt2: AnyAnnotation = {
      id: `txt_swp_${item.id}_${now + 3}`,
      pageIndex,
      type: 'editText',
      createdAt: now + 3,
      x: item.x,
      y: item.y,
      text: swapItem1.str,
      fontSize: item.fontSize,
      color,
      fontFamily,
      isBold,
    }

    if (onAddAnnotations) {
      onAddAnnotations([wo1, txt1, wo2, txt2])
    } else {
      onAddAnnotation(wo1)
      onAddAnnotation(txt1)
      onAddAnnotation(wo2)
      onAddAnnotation(txt2)
    }

    setSwapItem1(null)
  }

  // Apply in-place text edit over existing content
  const handleApplyExistingTextEdit = () => {
    if (!activeEditItem || !editItemValue.trim()) {
      setActiveEditItem(null)
      return
    }

    const now = Date.now()
    const padX = 1
    const padY = 0.5

    // Whiteout mask snug to original text bounds
    const whiteoutAnn: WhiteoutAnnotation = {
      id: `wo_edt_${activeEditItem.id}_${now}`,
      pageIndex,
      type: 'whiteout',
      createdAt: now,
      x: Math.max(0, activeEditItem.x - padX),
      y: Math.max(0, activeEditItem.y - padY),
      width: activeEditItem.width + padX * 2,
      height: activeEditItem.height + padY * 2,
    }

    // Replacement text annotation
    const newTextId = `txt_edt_${activeEditItem.id}_${now + 1}`
    const textAnn: AnyAnnotation = {
      id: newTextId,
      pageIndex,
      type: 'editText',
      createdAt: now + 1,
      x: activeEditItem.x,
      y: activeEditItem.y,
      text: editItemValue,
      fontSize: activeEditItem.fontSize,
      color,
      fontFamily,
      isBold,
    }

    if (onAddAnnotations) {
      onAddAnnotations([whiteoutAnn, textAnn])
    } else {
      onAddAnnotation(whiteoutAnn)
      onAddAnnotation(textAnn)
    }

    setSelectedId(newTextId)
    setActiveEditItem(null)
  }

  // Whiteout / Erase existing text item
  const handleEraseExistingText = () => {
    if (!activeEditItem) return
    const now = Date.now()
    const padX = 1
    const padY = 0.5
    const whiteoutAnn: WhiteoutAnnotation = {
      id: `wo_era_${activeEditItem.id}_${now}`,
      pageIndex,
      type: 'whiteout',
      createdAt: now,
      x: Math.max(0, activeEditItem.x - padX),
      y: Math.max(0, activeEditItem.y - padY),
      width: activeEditItem.width + padX * 2,
      height: activeEditItem.height + padY * 2,
    }
    if (onAddAnnotations) {
      onAddAnnotations([whiteoutAnn])
    } else {
      onAddAnnotation(whiteoutAnn)
    }
    setActiveEditItem(null)
  }

  // Convert existing text into movable, repositionable block
  const handleMakeExistingTextMovable = () => {
    if (!activeEditItem) return
    const now = Date.now()
    const padX = 1
    const padY = 0.5
    const whiteoutAnn: WhiteoutAnnotation = {
      id: `wo_mov_${activeEditItem.id}_${now}`,
      pageIndex,
      type: 'whiteout',
      createdAt: now,
      x: Math.max(0, activeEditItem.x - padX),
      y: Math.max(0, activeEditItem.y - padY),
      width: activeEditItem.width + padX * 2,
      height: activeEditItem.height + padY * 2,
    }
    const newTextId = `txt_mov_${activeEditItem.id}_${now + 1}`
    const textAnn: AnyAnnotation = {
      id: newTextId,
      pageIndex,
      type: 'editText',
      createdAt: now + 1,
      x: activeEditItem.x,
      y: activeEditItem.y,
      text: editItemValue || activeEditItem.str,
      fontSize: activeEditItem.fontSize,
      color,
      fontFamily,
      isBold,
    }
    if (onAddAnnotations) {
      onAddAnnotations([whiteoutAnn, textAnn])
    } else {
      onAddAnnotation(whiteoutAnn)
      onAddAnnotation(textAnn)
    }
    setSelectedId(newTextId)
    setActiveEditItem(null)
    onSelectTool?.('select')
  }

  const pageAnnotations = annotations.filter((a) => a.pageIndex === pageIndex)
  const selectedAnnotation = pageAnnotations.find((a) => a.id === selectedId)

  // Convert client mouse coordinates to unscaled PDF points
  const getRelativeCoords = useCallback(
    (e: React.MouseEvent | MouseEvent): Point => {
      if (!containerRef.current) return { x: 0, y: 0 }
      const rect = containerRef.current.getBoundingClientRect()
      return {
        x: Math.round((e.clientX - rect.left) / scale),
        y: Math.round((e.clientY - rect.top) / scale),
      }
    },
    [scale]
  )

  // Keyboard shortcut listener (Delete/Backspace to remove selected, Esc to deselect)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault()
        onDeleteAnnotation(selectedId)
        setSelectedId(null)
      } else if (e.key === 'Escape') {
        setSelectedId(null)
        setNewTextPos(null)
        setEditingTextId(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedId, onDeleteAnnotation])

  // Mouse Down handler on the main canvas
  const handleMouseDown = (e: React.MouseEvent) => {
    // If clicking on a tool control, ignore
    if ((e.target as HTMLElement).closest('.annotation-control')) {
      return
    }

    const pt = getRelativeCoords(e)

    // 1. Text tools
    if (activeTool === 'addText') {
      setNewTextPos(pt)
      setNewTextValue('')
      setSelectedId(null)
      return
    }

    // 2. Signature stamp placement
    if (activeTool === 'signature' && signatureDataUrl) {
      const newId = Math.random().toString(36).substring(2, 9)
      onAddAnnotation({
        id: newId,
        pageIndex,
        type: 'signature',
        createdAt: Date.now(),
        x: Math.max(10, pt.x - 80),
        y: Math.max(10, pt.y - 30),
        width: 160,
        height: 60,
        dataUrl: signatureDataUrl,
      })
      setSelectedId(newId)
      onSelectTool?.('select')
      return
    }

    // 3. Form field placement
    if (activeTool === 'form') {
      const newId = Math.random().toString(36).substring(2, 9)
      onAddAnnotation({
        id: newId,
        pageIndex,
        type: 'form',
        createdAt: Date.now(),
        fieldType: 'text',
        name: `field_${Date.now()}`,
        value: '',
        x: pt.x,
        y: pt.y,
        width: 160,
        height: 28,
      })
      setSelectedId(newId)
      onSelectTool?.('select')
      return
    }

    // 4. In Select Mode, clicking on empty canvas clears selection
    if (activeTool === 'select') {
      setSelectedId(null)
      return
    }

    // 5. Drawing & Shape creation
    setIsMouseDown(true)
    setStartPoint(pt)
    setCurrentPoint(pt)

    if (activeTool === 'draw') {
      setFreehandPoints([pt])
    }
  }

  // Mouse Move on main canvas
  const handleMouseMove = (e: React.MouseEvent) => {
    const pt = getRelativeCoords(e)

    // Handle annotation moving
    if (isDragging && selectedId && selectedAnnotation && 'x' in selectedAnnotation) {
      const newX = Math.max(0, pt.x - dragOffset.x)
      const newY = Math.max(0, pt.y - dragOffset.y)
      onUpdateAnnotation(selectedId, { x: newX, y: newY })
      return
    }

    // Handle annotation resizing
    if (isResizing && selectedId && initialResizeAnn && 'width' in initialResizeAnn && 'height' in initialResizeAnn && 'x' in initialResizeAnn && 'y' in initialResizeAnn) {
      const dx = pt.x - (initialResizeAnn.x + initialResizeAnn.width)
      const dy = pt.y - (initialResizeAnn.y + initialResizeAnn.height)
      if (resizeHandle === 'se') {
        const nextW = Math.max(20, initialResizeAnn.width + dx)
        const nextH = Math.max(15, initialResizeAnn.height + dy)
        onUpdateAnnotation(selectedId, { width: nextW, height: nextH })
      }
      return
    }

    // Handle canvas drawing & drag-shapes
    if (!isMouseDown || !startPoint) return
    setCurrentPoint(pt)

    if (activeTool === 'draw') {
      setFreehandPoints((prev) => [...prev, pt])
    }
  }

  // Mouse Up on main canvas
  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false)
      return
    }
    if (isResizing) {
      setIsResizing(false)
      setResizeHandle(null)
      setInitialResizeAnn(null)
      return
    }

    if (!isMouseDown || !startPoint || !currentPoint) {
      setIsMouseDown(false)
      return
    }

    const minX = Math.min(startPoint.x, currentPoint.x)
    const minY = Math.min(startPoint.y, currentPoint.y)
    const boxWidth = Math.max(10, Math.abs(currentPoint.x - startPoint.x))
    const boxHeight = Math.max(10, Math.abs(currentPoint.y - startPoint.y))

    const id = Math.random().toString(36).substring(2, 9)
    const createdAt = Date.now()

    switch (activeTool) {
      case 'highlight':
        onAddAnnotation({
          id,
          pageIndex,
          type: 'highlight',
          createdAt,
          x: minX,
          y: minY,
          width: boxWidth,
          height: boxHeight,
          color,
          opacity: 0.35,
        })
        setSelectedId(id)
        break

      case 'underline':
        onAddAnnotation({
          id,
          pageIndex,
          type: 'underline',
          createdAt,
          x: minX,
          y: currentPoint.y,
          width: boxWidth,
          color,
          thickness: strokeWidth,
        })
        setSelectedId(id)
        break

      case 'draw':
        if (freehandPoints.length > 1) {
          onAddAnnotation({
            id,
            pageIndex,
            type: 'draw',
            createdAt,
            points: freehandPoints,
            color,
            strokeWidth,
          })
          setSelectedId(id)
        }
        break

      case 'shape':
        onAddAnnotation({
          id,
          pageIndex,
          type: 'shape',
          createdAt,
          shapeType: activeShape,
          x: activeShape === 'line' || activeShape === 'arrow' ? startPoint.x : minX,
          y: activeShape === 'line' || activeShape === 'arrow' ? startPoint.y : minY,
          width: activeShape === 'line' || activeShape === 'arrow' ? currentPoint.x - startPoint.x : boxWidth,
          height: activeShape === 'line' || activeShape === 'arrow' ? currentPoint.y - startPoint.y : boxHeight,
          strokeColor: color,
          strokeWidth,
        })
        setSelectedId(id)
        break

      case 'whiteout':
        onAddAnnotation({
          id,
          pageIndex,
          type: 'whiteout',
          createdAt,
          x: minX,
          y: minY,
          width: boxWidth,
          height: boxHeight,
        })
        setSelectedId(id)
        break

      case 'redact':
        onAddAnnotation({
          id,
          pageIndex,
          type: 'redact',
          createdAt,
          x: minX,
          y: minY,
          width: boxWidth,
          height: boxHeight,
          overlayText: 'REDACTED',
        })
        setSelectedId(id)
        break

      case 'editText': {
        // Replace existing text: creates a clean whiteout with editable text overlay
        const whiteoutAnn: WhiteoutAnnotation = {
          id: `${id}_bg`,
          pageIndex,
          type: 'whiteout',
          createdAt,
          x: minX,
          y: minY,
          width: boxWidth,
          height: boxHeight,
        }
        const textAnn: AnyAnnotation = {
          id,
          pageIndex,
          type: 'editText',
          createdAt: createdAt + 1,
          x: minX,
          y: minY,
          text: 'Replacement text',
          fontSize: Math.max(12, Math.min(24, Math.round(boxHeight * 0.7))),
          color,
          fontFamily,
          isBold,
        }
        if (onAddAnnotations) {
          onAddAnnotations([whiteoutAnn, textAnn])
        } else {
          onAddAnnotation(whiteoutAnn)
          onAddAnnotation(textAnn)
        }
        setSelectedId(id)
        setEditingTextId(id)
        break
      }

      default:
        break
    }

    setIsMouseDown(false)
    setStartPoint(null)
    setCurrentPoint(null)
    setFreehandPoints([])
  }

  // Commit text from inline text input
  const handleCommitNewText = () => {
    if (newTextPos && newTextValue.trim()) {
      const id = Math.random().toString(36).substring(2, 9)
      onAddAnnotation({
        id,
        pageIndex,
        type: 'addText',
        createdAt: Date.now(),
        x: newTextPos.x,
        y: newTextPos.y,
        text: newTextValue.trim(),
        fontSize,
        color,
        fontFamily,
        isBold,
      })
      setSelectedId(id)
    }
    setNewTextPos(null)
    setNewTextValue('')
  }

  // Duplicate an annotation
  const handleDuplicate = (ann: AnyAnnotation) => {
    const id = Math.random().toString(36).substring(2, 9)
    const copy = { ...ann, id, createdAt: Date.now() }
    if ('x' in copy && 'y' in copy) {
      copy.x += 15
      copy.y += 15
    }
    onAddAnnotation(copy as AnyAnnotation)
    setSelectedId(id)
  }

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className={`absolute inset-0 z-20 ${
        activeTool === 'select'
          ? isDragging
            ? 'cursor-grabbing'
            : 'cursor-default'
          : activeTool === 'addText' || activeTool === 'editText'
          ? 'cursor-text'
          : 'cursor-crosshair'
      }`}
      style={{
        width: `${width}px`,
        height: `${height}px`,
      }}
    >
      {/* Active Interchange Mode Floating Banner */}
      {activeTool === 'interchange' && (
        <div className="annotation-control absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-indigo-900/95 text-white text-xs px-4 py-1.5 rounded-full shadow-2xl border border-indigo-400/60 backdrop-blur-md flex items-center gap-2 select-none pointer-events-auto">
          <ArrowLeftRight className="w-4 h-4 text-indigo-300 animate-pulse" />
          <span>
            {swapItem1
              ? `Item 1: "${swapItem1.str.slice(0, 25)}${swapItem1.str.length > 25 ? '...' : ''}" selected. Now click 2nd text to swap!`
              : 'Click 1st text on the page to interchange.'}
          </span>
          {swapItem1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setSwapItem1(null)
              }}
              className="ml-1 p-0.5 hover:bg-white/20 rounded text-slate-300 hover:text-white"
              title="Cancel selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Interactive Layer for Existing PDF Text Detection & Interchange */}
      {(activeTool === 'select' || activeTool === 'editText' || activeTool === 'interchange') &&
        detectedTextItems
          .filter((item) => {
            if (pageAnnotations.some((ann) => ann.id.includes(item.id))) return false
            const isCovered = pageAnnotations.some((ann) => {
              if (ann.type !== 'whiteout' && ann.type !== 'editText' && ann.type !== 'redact') return false
              const annW = 'width' in ann ? (ann.width as number) : 40
              const annH = 'height' in ann ? (ann.height as number) : 14
              return (
                ann.x <= item.x + 4 &&
                ann.x + annW >= item.x + item.width - 4 &&
                ann.y <= item.y + 4 &&
                ann.y + annH >= item.y + item.height - 4
              )
            })
            return !isCovered
          })
          .map((item) => {
          const isSelectedForSwap = swapItem1?.id === item.id
          const isInterchange = activeTool === 'interchange'

          return (
            <div
              key={item.id}
              onClick={(e) => {
                e.stopPropagation()
                if (isInterchange) {
                  handleItemClickForInterchange(item)
                } else {
                  setActiveEditItem(item)
                  setEditItemValue(item.str)
                }
              }}
              onMouseEnter={() => setHoveredItemId(item.id)}
              onMouseLeave={() => setHoveredItemId(null)}
              style={{
                position: 'absolute',
                left: `${item.x * scale}px`,
                top: `${item.y * scale}px`,
                width: `${item.width * scale}px`,
                height: `${item.height * scale}px`,
              }}
              className={cn(
                'annotation-control rounded transition-all select-none cursor-pointer',
                isSelectedForSwap
                  ? 'border-2 border-amber-500 bg-amber-400/30 ring-2 ring-amber-400 z-30'
                  : isInterchange
                  ? 'border border-indigo-400/70 hover:border-indigo-600 hover:bg-indigo-500/25 z-20'
                  : 'border border-dashed border-transparent hover:border-brand-500/80 hover:bg-brand-500/15 z-10'
              )}
              title={
                isInterchange
                  ? isSelectedForSwap
                    ? '1st item selected. Click 2nd item to swap.'
                    : `Click to interchange "${item.str}"`
                  : `Click to edit existing text: "${item.str}"`
              }
            >
              {/* Swap Badge indicator */}
              {isSelectedForSwap && (
                <span className="absolute -top-3.5 -left-1 bg-amber-500 text-white font-bold text-[9px] px-1 rounded shadow-xs">
                  [1]
                </span>
              )}

              {/* Hover Edit Pencil in select / editText mode */}
              {!isInterchange && hoveredItemId === item.id && (
                <span className="absolute -top-4 -right-1 bg-brand-600 text-white px-1 py-0.5 rounded shadow-sm flex items-center gap-0.5 text-[9px] pointer-events-none">
                  <Edit className="w-2.5 h-2.5" />
                  Edit
                </span>
              )}
            </div>
          )
        })}

      {/* 1. Render Annotations */}
      {pageAnnotations.map((ann) => {
        const isSelected = selectedId === ann.id

        switch (ann.type) {
          case 'addText':
          case 'editText': {
            return (
              <div
                key={ann.id}
                onMouseDown={(e) => {
                  e.stopPropagation()
                  setSelectedId(ann.id)
                  const pt = getRelativeCoords(e)
                  setDragOffset({ x: pt.x - ann.x, y: pt.y - ann.y })
                  setIsDragging(true)
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  setEditingTextId(ann.id)
                }}
                style={{
                  position: 'absolute',
                  left: `${ann.x * scale}px`,
                  top: `${ann.y * scale}px`,
                  color: ann.color,
                  fontSize: `${ann.fontSize * scale}px`,
                  fontFamily: ann.fontFamily === 'TimesRoman' ? 'Times New Roman, serif' : ann.fontFamily === 'Courier' ? 'Courier New, monospace' : 'Arial, sans-serif',
                  fontWeight: ann.isBold ? 'bold' : 'normal',
                  lineHeight: 1.25,
                }}
                className={cn(
                  'group select-none cursor-move px-0.5 py-0 rounded transition-all bg-transparent z-30',
                  isSelected
                    ? 'ring-1 ring-brand-500 shadow-xs'
                    : 'hover:ring-1 hover:ring-brand-400/50'
                )}
              >
                {editingTextId === ann.id ? (
                  <div
                    className="annotation-control bg-white dark:bg-slate-900 border-2 border-brand-500 rounded p-1 shadow-lg"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <textarea
                      autoFocus
                      defaultValue={ann.text}
                      rows={ann.text.split('\n').length || 1}
                      onBlur={(e) => {
                        onUpdateAnnotation(ann.id, { text: e.target.value })
                        setEditingTextId(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          onUpdateAnnotation(ann.id, { text: e.currentTarget.value })
                          setEditingTextId(null)
                        } else if (e.key === 'Escape') {
                          setEditingTextId(null)
                        }
                      }}
                      className="bg-transparent border-0 outline-none text-slate-900 dark:text-slate-100 font-sans resize-none min-w-[140px]"
                      style={{ fontSize: `${ann.fontSize * scale}px`, color: ann.color }}
                    />
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5 border-t border-slate-200 dark:border-slate-800">
                      <span>Shift+Enter for newline</span>
                      <button
                        type="button"
                        onClick={() => setEditingTextId(null)}
                        className="text-brand-600 font-semibold hover:underline"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">{ann.text || '(empty text)'}</div>
                )}
              </div>
            )
          }

          case 'highlight':
            return (
              <div
                key={ann.id}
                onMouseDown={(e) => {
                  e.stopPropagation()
                  setSelectedId(ann.id)
                  const pt = getRelativeCoords(e)
                  setDragOffset({ x: pt.x - ann.x, y: pt.y - ann.y })
                  setIsDragging(true)
                }}
                style={{
                  position: 'absolute',
                  left: `${ann.x * scale}px`,
                  top: `${ann.y * scale}px`,
                  width: `${ann.width * scale}px`,
                  height: `${ann.height * scale}px`,
                  backgroundColor: ann.color,
                  opacity: ann.opacity ?? 0.35,
                }}
                className={`rounded-xs cursor-move ${
                  isSelected ? 'ring-2 ring-brand-500 ring-offset-1' : 'hover:ring-1 hover:ring-amber-400'
                }`}
              />
            )

          case 'underline':
            return (
              <div
                key={ann.id}
                onMouseDown={(e) => {
                  e.stopPropagation()
                  setSelectedId(ann.id)
                  const pt = getRelativeCoords(e)
                  setDragOffset({ x: pt.x - ann.x, y: pt.y - ann.y })
                  setIsDragging(true)
                }}
                style={{
                  position: 'absolute',
                  left: `${ann.x * scale}px`,
                  top: `${ann.y * scale}px`,
                  width: `${ann.width * scale}px`,
                  height: `${(ann.thickness || 2) * scale}px`,
                  backgroundColor: ann.color,
                }}
                className={`cursor-move ${
                  isSelected ? 'ring-2 ring-brand-500 ring-offset-1' : 'hover:ring-1 hover:ring-blue-400'
                }`}
              />
            )

          case 'draw':
            return (
              <svg
                key={ann.id}
                className="absolute inset-0 pointer-events-none w-full h-full"
              >
                <path
                  d={ann.points.reduce(
                    (acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x * scale} ${pt.y * scale}`,
                    ''
                  )}
                  fill="none"
                  stroke={ann.color}
                  strokeWidth={(ann.strokeWidth || 2) * scale}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )

          case 'shape': {
            const isRectOrCircle = ann.shapeType === 'rectangle' || ann.shapeType === 'circle'
            const normW = Math.max(4, Math.abs(ann.width))
            const normH = Math.max(4, Math.abs(ann.height))
            const normX = Math.min(ann.x, ann.x + ann.width)
            const normY = Math.min(ann.y, ann.y + ann.height)

            if (isRectOrCircle) {
              return (
                <div
                  key={ann.id}
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    setSelectedId(ann.id)
                    const pt = getRelativeCoords(e)
                    setDragOffset({ x: pt.x - normX, y: pt.y - normY })
                    setIsDragging(true)
                  }}
                  style={{
                    position: 'absolute',
                    left: `${normX * scale}px`,
                    top: `${normY * scale}px`,
                    width: `${normW * scale}px`,
                    height: `${normH * scale}px`,
                    borderWidth: `${(ann.strokeWidth || 2) * scale}px`,
                    borderColor: ann.strokeColor,
                    borderStyle: 'solid',
                    backgroundColor: ann.fillColor || 'transparent',
                    borderRadius: ann.shapeType === 'circle' ? '50%' : '2px',
                  }}
                  className={`cursor-move ${
                    isSelected ? 'ring-2 ring-brand-500 ring-offset-1' : 'hover:ring-1 hover:ring-brand-400/50'
                  }`}
                />
              )
            }

            // Line or Arrow
            return (
              <svg
                key={ann.id}
                onMouseDown={(e) => {
                  e.stopPropagation()
                  setSelectedId(ann.id)
                }}
                className="absolute inset-0 pointer-events-auto cursor-pointer"
                style={{ width: `${width}px`, height: `${height}px` }}
              >
                <line
                  x1={ann.x * scale}
                  y1={ann.y * scale}
                  x2={(ann.x + ann.width) * scale}
                  y2={(ann.y + ann.height) * scale}
                  stroke={ann.strokeColor}
                  strokeWidth={(ann.strokeWidth || 2) * scale}
                  strokeLinecap="round"
                />
                {ann.shapeType === 'arrow' && (
                  <circle
                    cx={(ann.x + ann.width) * scale}
                    cy={(ann.y + ann.height) * scale}
                    r={5 * scale}
                    fill={ann.strokeColor}
                  />
                )}
              </svg>
            )
          }

          case 'whiteout': {
            const normW = Math.max(4, Math.abs(ann.width))
            const normH = Math.max(4, Math.abs(ann.height))
            const normX = Math.min(ann.x, ann.x + ann.width)
            const normY = Math.min(ann.y, ann.y + ann.height)
            const isAutoWhiteout = ann.id.startsWith('wo_') || ann.id.endsWith('_bg')

            return (
              <div
                key={ann.id}
                onMouseDown={
                  isAutoWhiteout
                    ? undefined
                    : (e) => {
                        e.stopPropagation()
                        setSelectedId(ann.id)
                        const pt = getRelativeCoords(e)
                        setDragOffset({ x: pt.x - normX, y: pt.y - normY })
                        setIsDragging(true)
                      }
                }
                style={{
                  position: 'absolute',
                  left: `${normX * scale}px`,
                  top: `${normY * scale}px`,
                  width: `${normW * scale}px`,
                  height: `${normH * scale}px`,
                }}
                className={cn(
                  'bg-white z-10',
                  isAutoWhiteout
                    ? 'pointer-events-none'
                    : `cursor-move border border-slate-200/50 shadow-xs ${
                        isSelected ? 'ring-2 ring-brand-500' : 'hover:border-slate-300'
                      }`
                )}
              />
            )
          }

          case 'redact': {
            const normW = Math.max(4, Math.abs(ann.width))
            const normH = Math.max(4, Math.abs(ann.height))
            const normX = Math.min(ann.x, ann.x + ann.width)
            const normY = Math.min(ann.y, ann.y + ann.height)

            return (
              <div
                key={ann.id}
                onMouseDown={(e) => {
                  e.stopPropagation()
                  setSelectedId(ann.id)
                  const pt = getRelativeCoords(e)
                  setDragOffset({ x: pt.x - normX, y: pt.y - normY })
                  setIsDragging(true)
                }}
                style={{
                  position: 'absolute',
                  left: `${normX * scale}px`,
                  top: `${normY * scale}px`,
                  width: `${normW * scale}px`,
                  height: `${normH * scale}px`,
                }}
                className={`bg-black cursor-move flex items-center justify-center overflow-hidden ${
                  isSelected ? 'ring-2 ring-brand-500' : ''
                }`}
              >
                <span className="text-[10px] font-mono text-white/80 font-bold tracking-wider select-none pointer-events-none">
                  {ann.overlayText || 'REDACTED'}
                </span>
              </div>
            )
          }

          case 'signature':
          case 'addImage':
            return (
              <div
                key={ann.id}
                onMouseDown={(e) => {
                  e.stopPropagation()
                  setSelectedId(ann.id)
                  const pt = getRelativeCoords(e)
                  setDragOffset({ x: pt.x - ann.x, y: pt.y - ann.y })
                  setIsDragging(true)
                }}
                style={{
                  position: 'absolute',
                  left: `${ann.x * scale}px`,
                  top: `${ann.y * scale}px`,
                  width: `${ann.width * scale}px`,
                  height: `${ann.height * scale}px`,
                }}
                className={`cursor-move p-0.5 rounded ${
                  isSelected
                    ? 'ring-2 ring-brand-500 bg-brand-50/10'
                    : 'hover:ring-1 hover:ring-brand-400/50'
                }`}
              >
                <img
                  src={ann.dataUrl}
                  alt="Embedded Media"
                  className="w-full h-full object-contain pointer-events-none select-none"
                />

                {/* Resize Handle at bottom right */}
                {isSelected && (
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation()
                      setIsResizing(true)
                      setResizeHandle('se')
                      setInitialResizeAnn(ann)
                    }}
                    className="annotation-control absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-brand-600 border border-white rounded-full cursor-nwse-resize shadow-md"
                    title="Drag to resize"
                  />
                )}
              </div>
            )

          case 'form':
            return (
              <div
                key={ann.id}
                onMouseDown={(e) => {
                  e.stopPropagation()
                  setSelectedId(ann.id)
                  const pt = getRelativeCoords(e)
                  setDragOffset({ x: pt.x - ann.x, y: pt.y - ann.y })
                  setIsDragging(true)
                }}
                style={{
                  position: 'absolute',
                  left: `${ann.x * scale}px`,
                  top: `${ann.y * scale}px`,
                  width: `${ann.width * scale}px`,
                  height: `${ann.height * scale}px`,
                }}
                className={`cursor-move bg-blue-50/80 dark:bg-blue-950/80 border border-blue-400 rounded flex items-center px-1.5 ${
                  isSelected ? 'ring-2 ring-brand-500' : ''
                }`}
              >
                <input
                  type="text"
                  placeholder="Type field value..."
                  defaultValue={String(ann.value || '')}
                  onMouseDown={(e) => e.stopPropagation()}
                  onBlur={(e) => onUpdateAnnotation(ann.id, { value: e.target.value })}
                  className="w-full bg-transparent border-none outline-none text-xs text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>
            )

          default:
            return null
        }
      })}

      {/* 2. Floating Quick Action Controls on Selected Annotation */}
      {selectedAnnotation && 'x' in selectedAnnotation && 'y' in selectedAnnotation && (() => {
        const isNearTop = selectedAnnotation.y * scale < 45
        const annH =
          'fontSize' in selectedAnnotation
            ? ((selectedAnnotation.fontSize as number) || 16) * 1.3
            : 'height' in selectedAnnotation
            ? ((selectedAnnotation.height as number) || 24)
            : 24
        const toolbarTop = isNearTop
          ? (selectedAnnotation.y + annH) * scale + 8
          : selectedAnnotation.y * scale - 40

        return (
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="annotation-control absolute z-50 flex items-center gap-1 bg-slate-900/95 text-white px-2 py-1 rounded-md shadow-xl border border-slate-700 backdrop-blur-xs select-none"
            style={{
              left: `${Math.max(10, Math.min(width - 240, selectedAnnotation.x * scale))}px`,
              top: `${Math.max(8, toolbarTop)}px`,
            }}
          >
          {/* Text Controls (Font Size, Bold) */}
          {(selectedAnnotation.type === 'addText' || selectedAnnotation.type === 'editText') && (
            <>
              <button
                type="button"
                onClick={() => {
                  const curr = (selectedAnnotation as TextAnnotation).fontSize || 16
                  onUpdateAnnotation(selectedAnnotation.id, { fontSize: Math.max(10, curr - 2) })
                }}
                className="px-1.5 py-0.5 text-[11px] rounded hover:bg-white/20 font-mono"
                title="Decrease font size"
              >
                A-
              </button>
              <span className="text-[11px] font-mono font-semibold px-1">
                {(selectedAnnotation as TextAnnotation).fontSize || 16}pt
              </span>
              <button
                type="button"
                onClick={() => {
                  const curr = (selectedAnnotation as TextAnnotation).fontSize || 16
                  onUpdateAnnotation(selectedAnnotation.id, { fontSize: Math.min(48, curr + 2) })
                }}
                className="px-1.5 py-0.5 text-[11px] rounded hover:bg-white/20 font-mono"
                title="Increase font size"
              >
                A+
              </button>
              <button
                type="button"
                onClick={() => {
                  const currBold = (selectedAnnotation as TextAnnotation).isBold
                  onUpdateAnnotation(selectedAnnotation.id, { isBold: !currBold })
                }}
                className={`p-1 rounded hover:bg-white/20 ${
                  (selectedAnnotation as TextAnnotation).isBold ? 'bg-white/30 text-brand-300' : ''
                }`}
                title="Toggle bold"
              >
                <Bold className="w-3 h-3" />
              </button>
              <div className="h-3 w-px bg-white/20 mx-0.5" />
            </>
          )}

          {/* Duplicate button */}
          <button
            type="button"
            onClick={() => handleDuplicate(selectedAnnotation)}
            className="p-1 rounded hover:bg-white/20 text-slate-300 hover:text-white"
            title="Duplicate (clone)"
          >
            <Copy className="w-3 h-3" />
          </button>

          {/* Delete button */}
          <button
            type="button"
            onClick={() => {
              onDeleteAnnotation(selectedAnnotation.id)
              setSelectedId(null)
            }}
            className="p-1 rounded hover:bg-rose-600/80 text-rose-400 hover:text-white"
            title="Delete annotation (Delete/Backspace)"
          >
            <Trash2 className="w-3 h-3" />
          </button>
          </div>
        )
      })()}

      {/* 3. Active Freehand Drawing SVG Preview */}
      {isMouseDown && activeTool === 'draw' && freehandPoints.length > 1 && (
        <svg className="absolute inset-0 pointer-events-none w-full h-full">
          <path
            d={freehandPoints.reduce(
              (acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x * scale} ${pt.y * scale}`,
              ''
            )}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth * scale}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      {/* 4. Active Drag-Creation Preview (Shapes, Highlights, Whiteout, Redact, EditText) */}
      {isMouseDown && startPoint && currentPoint && activeTool !== 'draw' && (
        <div
          style={{
            position: 'absolute',
            left: `${Math.min(startPoint.x, currentPoint.x) * scale}px`,
            top: `${Math.min(startPoint.y, currentPoint.y) * scale}px`,
            width: `${Math.abs(currentPoint.x - startPoint.x) * scale}px`,
            height: `${Math.abs(currentPoint.y - startPoint.y) * scale}px`,
            border:
              activeTool === 'shape'
                ? `${strokeWidth * scale}px solid ${color}`
                : activeTool === 'editText'
                ? '2px dashed #3b82f6'
                : undefined,
            backgroundColor:
              activeTool === 'highlight'
                ? color
                : activeTool === 'whiteout'
                ? '#ffffff'
                : activeTool === 'redact'
                ? '#000000'
                : activeTool === 'editText'
                ? 'rgba(59, 130, 246, 0.15)'
                : 'transparent',
            opacity: activeTool === 'highlight' ? 0.35 : 1.0,
            borderRadius: activeTool === 'shape' && activeShape === 'circle' ? '50%' : '2px',
          }}
          className={
            activeTool === 'shape' && activeShape === 'rectangle'
              ? 'border-dashed'
              : activeTool === 'underline'
              ? 'border-b-2'
              : ''
          }
        />
      )}

      {/* 5. Inline Text Insertion Popup (When clicking to Add Text) */}
      {newTextPos && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            left: `${newTextPos.x * scale}px`,
            top: `${newTextPos.y * scale}px`,
          }}
          className="annotation-control z-40 bg-white dark:bg-slate-900 shadow-2xl rounded-lg border-2 border-brand-500 p-2 min-w-[200px]"
        >
          <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-semibold uppercase">
            <span className="flex items-center gap-1">
              <Type className="w-3 h-3 text-brand-500" />
              Add Text
            </span>
            <span>Enter to place</span>
          </div>

          <textarea
            autoFocus
            rows={2}
            placeholder="Type text here..."
            value={newTextValue}
            onChange={(e) => setNewTextValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleCommitNewText()
              }
              if (e.key === 'Escape') setNewTextPos(null)
            }}
            style={{
              fontSize: `${fontSize * scale}px`,
              color,
              fontFamily: fontFamily === 'TimesRoman' ? 'serif' : fontFamily === 'Courier' ? 'monospace' : 'sans-serif',
              fontWeight: isBold ? 'bold' : 'normal',
            }}
            className="w-full outline-none bg-transparent resize-none border border-slate-200 dark:border-slate-800 rounded p-1"
          />

          <div className="flex items-center justify-end gap-1.5 pt-1.5">
            <button
              type="button"
              onClick={() => setNewTextPos(null)}
              className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs"
              title="Cancel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleCommitNewText}
              disabled={!newTextValue.trim()}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold disabled:opacity-40"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Place</span>
            </button>
          </div>
        </div>
      )}

      {/* 6. Existing Text In-Place Editor Floating Dialog */}
      {activeEditItem && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            left: `${Math.max(10, Math.min(width - 320, activeEditItem.x * scale))}px`,
            top: `${Math.max(10, activeEditItem.y * scale - 120)}px`,
          }}
          className="annotation-control z-50 bg-white dark:bg-slate-900 shadow-2xl rounded-xl border border-slate-200 dark:border-slate-700 p-3 w-80 backdrop-blur-md"
        >
          <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100">
              <FileEdit className="w-3.5 h-3.5 text-brand-500" />
              Edit Existing PDF Content
            </span>
            <button
              type="button"
              onClick={() => setActiveEditItem(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="text-[10px] text-slate-400 mb-1">
            Original: <span className="font-mono text-slate-600 dark:text-slate-300">"{activeEditItem.str}"</span>
          </div>

          <textarea
            autoFocus
            rows={2}
            value={editItemValue}
            onChange={(e) => setEditItemValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleApplyExistingTextEdit()
              }
              if (e.key === 'Escape') setActiveEditItem(null)
            }}
            placeholder="Edit text..."
            className="w-full text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none font-medium"
          />

          <div className="flex flex-wrap items-center justify-between gap-1.5 mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  const target = activeEditItem
                  setActiveEditItem(null)
                  onSelectTool?.('interchange')
                  setSwapItem1(target)
                }}
                className="px-2 py-1 text-[11px] rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 flex items-center gap-1 transition-colors"
                title="Swap with another text on the page"
              >
                <ArrowLeftRight className="w-3 h-3" />
                <span>Swap</span>
              </button>

              <button
                type="button"
                onClick={handleMakeExistingTextMovable}
                className="px-2 py-1 text-[11px] rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1 transition-colors"
                title="Convert into draggable, movable block"
              >
                <Move className="w-3 h-3" />
                <span>Move</span>
              </button>

              <button
                type="button"
                onClick={handleEraseExistingText}
                className="px-2 py-1 text-[11px] rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center gap-1 transition-colors"
                title="Whiteout / erase this text"
              >
                <Eraser className="w-3 h-3" />
                <span>Erase</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleApplyExistingTextEdit}
              className="px-3 py-1 text-xs font-semibold rounded bg-brand-600 hover:bg-brand-700 text-white flex items-center gap-1 shadow-xs transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Update</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

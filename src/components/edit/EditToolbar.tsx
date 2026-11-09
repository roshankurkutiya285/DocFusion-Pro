import React from 'react'
import type { EditToolType, ShapeType } from '@/types/edit'
import {
  MousePointer,
  Type,
  FileEdit,
  Image as ImageIcon,
  Highlighter,
  Underline,
  PenTool,
  Square,
  Circle,
  Minus,
  MoveRight,
  Eraser,
  EyeOff,
  CheckSquare,
  FileSignature,
  Undo2,
  Redo2,
  Bold,
  ArrowLeftRight,
  Replace,
} from 'lucide-react'
import { IconButton } from '@/components/ui/IconButton'

interface EditToolbarProps {
  activeTool: EditToolType
  setActiveTool: (tool: EditToolType) => void
  activeShape: ShapeType
  setActiveShape: (shape: ShapeType) => void
  color: string
  setColor: (color: string) => void
  fontSize: number
  setFontSize: (size: number) => void
  strokeWidth: number
  setStrokeWidth: (width: number) => void
  fontFamily?: 'Helvetica' | 'TimesRoman' | 'Courier'
  setFontFamily?: (font: 'Helvetica' | 'TimesRoman' | 'Courier') => void
  isBold?: boolean
  setIsBold?: (bold: boolean) => void
  onUndo: () => void
  canUndo: boolean
  onRedo?: () => void
  canRedo?: boolean
  onOpenSignatureModal: () => void
  onOpenImageInput: () => void
  onOpenFindAndInterchange?: () => void
}

export const EditToolbar: React.FC<EditToolbarProps> = ({
  activeTool,
  setActiveTool,
  activeShape,
  setActiveShape,
  color,
  setColor,
  fontSize,
  setFontSize,
  strokeWidth,
  setStrokeWidth,
  fontFamily = 'Helvetica',
  setFontFamily,
  isBold = false,
  setIsBold,
  onUndo,
  canUndo,
  onRedo,
  canRedo = false,
  onOpenSignatureModal,
  onOpenImageInput,
  onOpenFindAndInterchange,
}) => {
  const colors = [
    '#000000', // Black
    '#2563eb', // Blue
    '#dc2626', // Red
    '#16a34a', // Green
    '#facc15', // Yellow (Highlight)
    '#9333ea', // Purple
  ]

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 shrink-0 select-none shadow-xs">
      {/* 1. Core Tool Selectors */}
      <div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar">
        <IconButton
          size="sm"
          tooltip="Select & Move (V)"
          isActive={activeTool === 'select'}
          onClick={() => setActiveTool('select')}
        >
          <MousePointer className="w-4 h-4" />
        </IconButton>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

        {/* Text Tools */}
        <IconButton
          size="sm"
          tooltip="Add Text (T)"
          isActive={activeTool === 'addText'}
          onClick={() => setActiveTool('addText')}
        >
          <Type className="w-4 h-4" />
        </IconButton>
        <IconButton
          size="sm"
          tooltip="Edit / Replace Text"
          isActive={activeTool === 'editText'}
          onClick={() => setActiveTool('editText')}
        >
          <FileEdit className="w-4 h-4" />
        </IconButton>
        <IconButton
          size="sm"
          tooltip="Interchange / Swap Content (Click 2 items to swap)"
          isActive={activeTool === 'interchange'}
          onClick={() => setActiveTool('interchange')}
        >
          <ArrowLeftRight className="w-4 h-4" />
        </IconButton>
        {onOpenFindAndInterchange && (
          <IconButton
            size="sm"
            tooltip="Find, Replace & Interchange Data (Ctrl+H)"
            onClick={onOpenFindAndInterchange}
          >
            <Replace className="w-4 h-4" />
          </IconButton>
        )}

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

        {/* Image Tool */}
        <IconButton
          size="sm"
          tooltip="Add Image"
          onClick={onOpenImageInput}
        >
          <ImageIcon className="w-4 h-4" />
        </IconButton>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

        {/* Markup Tools */}
        <IconButton
          size="sm"
          tooltip="Highlight (H)"
          isActive={activeTool === 'highlight'}
          onClick={() => {
            setActiveTool('highlight')
            setColor('#facc15')
          }}
        >
          <Highlighter className="w-4 h-4" />
        </IconButton>
        <IconButton
          size="sm"
          tooltip="Underline (U)"
          isActive={activeTool === 'underline'}
          onClick={() => setActiveTool('underline')}
        >
          <Underline className="w-4 h-4" />
        </IconButton>
        <IconButton
          size="sm"
          tooltip="Freehand Pen (P)"
          isActive={activeTool === 'draw'}
          onClick={() => setActiveTool('draw')}
        >
          <PenTool className="w-4 h-4" />
        </IconButton>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

        {/* Shapes */}
        <IconButton
          size="sm"
          tooltip="Rectangle Shape"
          isActive={activeTool === 'shape' && activeShape === 'rectangle'}
          onClick={() => {
            setActiveTool('shape')
            setActiveShape('rectangle')
          }}
        >
          <Square className="w-4 h-4" />
        </IconButton>
        <IconButton
          size="sm"
          tooltip="Circle / Ellipse"
          isActive={activeTool === 'shape' && activeShape === 'circle'}
          onClick={() => {
            setActiveTool('shape')
            setActiveShape('circle')
          }}
        >
          <Circle className="w-4 h-4" />
        </IconButton>
        <IconButton
          size="sm"
          tooltip="Straight Line"
          isActive={activeTool === 'shape' && activeShape === 'line'}
          onClick={() => {
            setActiveTool('shape')
            setActiveShape('line')
          }}
        >
          <Minus className="w-4 h-4" />
        </IconButton>
        <IconButton
          size="sm"
          tooltip="Arrow Line"
          isActive={activeTool === 'shape' && activeShape === 'arrow'}
          onClick={() => {
            setActiveTool('shape')
            setActiveShape('arrow')
          }}
        >
          <MoveRight className="w-4 h-4" />
        </IconButton>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

        {/* Sanitize Tools */}
        <IconButton
          size="sm"
          tooltip="Whiteout Mask"
          isActive={activeTool === 'whiteout'}
          onClick={() => setActiveTool('whiteout')}
        >
          <Eraser className="w-4 h-4" />
        </IconButton>
        <IconButton
          size="sm"
          tooltip="Redact (Blackout)"
          isActive={activeTool === 'redact'}
          onClick={() => setActiveTool('redact')}
        >
          <EyeOff className="w-4 h-4" />
        </IconButton>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

        {/* Form Fill & Digital Signature */}
        <IconButton
          size="sm"
          tooltip="Fill Forms"
          isActive={activeTool === 'form'}
          onClick={() => setActiveTool('form')}
        >
          <CheckSquare className="w-4 h-4" />
        </IconButton>
        <IconButton
          size="sm"
          tooltip="Digital Signature"
          isActive={activeTool === 'signature'}
          onClick={onOpenSignatureModal}
        >
          <FileSignature className="w-4 h-4" />
        </IconButton>
      </div>

      {/* 2. Color & Dimension Properties */}
      <div className="flex items-center gap-2.5">
        {/* Color Palette */}
        {(activeTool === 'addText' ||
          activeTool === 'editText' ||
          activeTool === 'draw' ||
          activeTool === 'shape' ||
          activeTool === 'highlight' ||
          activeTool === 'underline') && (
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-slate-400 mr-1">Color:</span>
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={`w-4 h-4 rounded-full border transition-transform ${
                  color === c ? 'scale-125 ring-2 ring-brand-500' : 'border-slate-300 dark:border-slate-600'
                }`}
              />
            ))}
          </div>
        )}

        {/* Font Controls (Font Family, Size, Bold) */}
        {(activeTool === 'addText' || activeTool === 'editText') && (
          <>
            {setFontFamily && (
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value as any)}
                className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-800 dark:text-slate-200"
              >
                <option value="Helvetica">Helvetica (Sans)</option>
                <option value="TimesRoman">Times New Roman (Serif)</option>
                <option value="Courier">Courier (Mono)</option>
              </select>
            )}

            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-400 text-[11px]">Size:</span>
              <select
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-800 dark:text-slate-200"
              >
                {[10, 12, 14, 16, 18, 20, 24, 28, 32, 40].map((s) => (
                  <option key={s} value={s}>
                    {s}pt
                  </option>
                ))}
              </select>
            </div>

            {setIsBold && (
              <button
                type="button"
                onClick={() => setIsBold(!isBold)}
                className={`p-1 rounded border text-xs flex items-center justify-center transition-colors ${
                  isBold
                    ? 'bg-brand-500 border-brand-500 text-white font-bold'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
                title="Bold (Ctrl+B)"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        )}

        {/* Stroke Width for drawing & shapes */}
        {(activeTool === 'draw' || activeTool === 'shape' || activeTool === 'underline') && (
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-400 text-[11px]">Stroke:</span>
            <select
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(parseInt(e.target.value, 10))}
              className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-800 dark:text-slate-200"
            >
              {[1, 2, 3, 5, 8, 12].map((w) => (
                <option key={w} value={w}>
                  {w}px
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Undo & Redo */}
        <div className="flex items-center gap-0.5">
          <IconButton
            size="sm"
            tooltip="Undo Annotation"
            shortcut="Ctrl+Z"
            disabled={!canUndo}
            onClick={onUndo}
          >
            <Undo2 className="w-4 h-4" />
          </IconButton>
          <IconButton
            size="sm"
            tooltip="Redo Annotation"
            shortcut="Ctrl+Y"
            disabled={!canRedo}
            onClick={onRedo}
          >
            <Redo2 className="w-4 h-4" />
          </IconButton>
        </div>
      </div>
    </div>
  )
}

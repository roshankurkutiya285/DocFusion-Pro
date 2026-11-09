export type EditToolType =
  | 'select'
  | 'addText'
  | 'editText'
  | 'interchange'
  | 'addImage'
  | 'highlight'
  | 'underline'
  | 'draw'
  | 'shape'
  | 'whiteout'
  | 'redact'
  | 'form'
  | 'signature'

export type ShapeType = 'rectangle' | 'circle' | 'line' | 'arrow'

export interface Point {
  x: number
  y: number
}

export interface BaseAnnotation {
  id: string
  pageIndex: number // 0-indexed
  type: EditToolType
  createdAt: number
}

export interface TextAnnotation extends BaseAnnotation {
  type: 'addText' | 'editText'
  x: number
  y: number
  text: string
  fontSize: number
  color: string
  fontFamily: 'Helvetica' | 'TimesRoman' | 'Courier'
  isBold?: boolean
  isItalic?: boolean
}

export interface ImageAnnotation extends BaseAnnotation {
  type: 'addImage'
  x: number
  y: number
  width: number
  height: number
  dataUrl: string
}

export interface HighlightAnnotation extends BaseAnnotation {
  type: 'highlight'
  x: number
  y: number
  width: number
  height: number
  color: string
  opacity: number
}

export interface UnderlineAnnotation extends BaseAnnotation {
  type: 'underline'
  x: number
  y: number
  width: number
  color: string
  thickness: number
}

export interface DrawAnnotation extends BaseAnnotation {
  type: 'draw'
  points: Point[]
  color: string
  strokeWidth: number
}

export interface ShapeAnnotation extends BaseAnnotation {
  type: 'shape'
  shapeType: ShapeType
  x: number
  y: number
  width: number
  height: number
  strokeColor: string
  fillColor?: string
  strokeWidth: number
}

export interface WhiteoutAnnotation extends BaseAnnotation {
  type: 'whiteout'
  x: number
  y: number
  width: number
  height: number
}

export interface RedactAnnotation extends BaseAnnotation {
  type: 'redact'
  x: number
  y: number
  width: number
  height: number
  overlayText?: string
}

export interface FormFieldAnnotation extends BaseAnnotation {
  type: 'form'
  fieldType: 'text' | 'checkbox'
  name: string
  value: string | boolean
  x: number
  y: number
  width: number
  height: number
}

export interface SignatureAnnotation extends BaseAnnotation {
  type: 'signature'
  x: number
  y: number
  width: number
  height: number
  dataUrl: string
}

export type AnyAnnotation =
  | TextAnnotation
  | ImageAnnotation
  | HighlightAnnotation
  | UnderlineAnnotation
  | DrawAnnotation
  | ShapeAnnotation
  | WhiteoutAnnotation
  | RedactAnnotation
  | FormFieldAnnotation
  | SignatureAnnotation

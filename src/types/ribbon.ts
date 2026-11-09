import type { LucideIcon } from 'lucide-react'
import type { RibbonTabId } from './index'

export interface RibbonAction {
  id: string
  label: string
  icon: LucideIcon
  description?: string
  shortcut?: string
  active?: boolean
  disabled?: boolean
  onClick?: () => void
  variant?: 'default' | 'primary' | 'danger'
}

export interface RibbonGroup {
  id: string
  title: string
  actions: RibbonAction[]
}

export interface RibbonTabConfig {
  id: RibbonTabId
  label: string
  path: string
  groups?: RibbonGroup[]
}

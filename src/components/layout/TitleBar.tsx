import React, { useRef } from 'react'
import {
  FileText,
  FolderOpen,
  Save,
  Sun,
  Moon,
  Laptop,
  Wifi,
  WifiOff,
  Settings,
  HelpCircle,
  Undo2,
  Redo2,
  Layers,
} from 'lucide-react'
import { useAppStore } from '@/stores/useAppStore'
import { useThemeStore } from '@/stores/useThemeStore'
import { useDocumentStore } from '@/stores/useDocumentStore'
import { IconButton } from '@/components/ui/IconButton'
import { Badge } from '@/components/ui/Badge'
import { useNavigate } from 'react-router-dom'

export const TitleBar: React.FC = () => {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { isOffline, openModal } = useAppStore()
  const { theme, resolvedTheme, setTheme } = useThemeStore()
  const { fileName, loadDocument, isReady, undo, redo, canUndo, canRedo } = useDocumentStore()

  const handleOpenFileClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      loadDocument(file)
      navigate('/viewer')
    }
    // reset input
    e.target.value = ''
  }

  const cycleTheme = () => {
    if (theme === 'system') {
      setTheme('light')
    } else if (theme === 'light') {
      setTheme('dark')
    } else {
      setTheme('system')
    }
  }

  const themeIcon = {
    light: <Sun className="w-4 h-4 text-amber-500" />,
    dark: <Moon className="w-4 h-4 text-blue-400" />,
    system: <Laptop className="w-4 h-4 text-slate-400" />,
  }[theme]

  return (
    <header className="h-10 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 flex items-center justify-between select-none z-30 shrink-0">
      {/* Hidden file input for open document */}
      <input
        id="global-pdf-file-picker"
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Left: Branding & Quick Action Buttons */}
      <div className="flex items-center gap-2">
        <div
          onClick={() => navigate('/')}
          className="flex items-center gap-2 cursor-pointer pr-2 hover:opacity-80 transition-opacity"
        >
          <div className="w-6 h-6 rounded bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-sm">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100 hidden sm:inline">
            DocFusion<span className="text-brand-500 ml-0.5">Pro</span>
          </span>
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

        {/* Quick Access Toolbar */}
        <div className="flex items-center gap-0.5">
          <IconButton
            size="sm"
            tooltip="Open Document"
            shortcut="Ctrl+O"
            onClick={handleOpenFileClick}
          >
            <FolderOpen className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </IconButton>

          <IconButton
            size="sm"
            tooltip="Save / Export"
            shortcut="Ctrl+S"
            disabled={!isReady}
            onClick={() => openModal('export')}
          >
            <Save className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </IconButton>

          <IconButton
            size="sm"
            tooltip="Undo"
            shortcut="Ctrl+Z"
            disabled={!canUndo}
            onClick={undo}
          >
            <Undo2 className={`w-4 h-4 ${canUndo ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 opacity-40'}`} />
          </IconButton>

          <IconButton
            size="sm"
            tooltip="Redo"
            shortcut="Ctrl+Y"
            disabled={!canRedo}
            onClick={redo}
          >
            <Redo2 className={`w-4 h-4 ${canRedo ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 opacity-40'}`} />
          </IconButton>
        </div>
      </div>

      {/* Middle: Active Document Title */}
      <div className="flex items-center gap-2 max-w-md truncate px-2">
        <FileText className="w-3.5 h-3.5 text-brand-500 shrink-0" />
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
          {fileName ? fileName : 'Untitled Document - DocFusion Pro'}
        </span>
        {isReady && (
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
        )}
      </div>

      {/* Right: Offline status, Theme, Settings, Shortcuts */}
      <div className="flex items-center gap-1.5">
        {/* Offline Badge */}
        <Badge
          variant={isOffline ? 'warning' : 'success'}
          size="sm"
          className="hidden md:inline-flex"
        >
          {isOffline ? (
            <>
              <WifiOff className="w-3 h-3" />
              <span>Offline Mode</span>
            </>
          ) : (
            <>
              <Wifi className="w-3 h-3" />
              <span>100% Offline Capable</span>
            </>
          )}
        </Badge>

        <IconButton
          size="sm"
          tooltip={`Theme: ${theme} (${resolvedTheme})`}
          onClick={cycleTheme}
        >
          {themeIcon}
        </IconButton>

        <IconButton
          size="sm"
          tooltip="Keyboard Shortcuts"
          shortcut="Ctrl+/"
          onClick={() => openModal('shortcuts')}
        >
          <HelpCircle className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        </IconButton>

        <IconButton
          size="sm"
          tooltip="Settings"
          onClick={() => navigate('/settings')}
        >
          <Settings className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        </IconButton>
      </div>
    </header>
  )
}

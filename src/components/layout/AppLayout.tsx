import React, { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { TitleBar } from './TitleBar'
import { RibbonBar } from './RibbonBar'
import { Sidebar } from './Sidebar'
import { StatusBar } from './StatusBar'
import { ModalContainer } from './ModalContainer'
import { ToastContainer } from '@/components/ui/Toast'
import { useThemeStore } from '@/stores/useThemeStore'
import { useAppStore } from '@/stores/useAppStore'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

export const AppLayout: React.FC = () => {
  const initTheme = useThemeStore((state) => state.initTheme)
  const initApp = useAppStore((state) => state.initApp)
  useKeyboardShortcuts()

  useEffect(() => {
    initTheme()
    initApp()
  }, [initTheme, initApp])

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased">
      {/* 1. Desktop Title Bar */}
      <TitleBar />

      {/* 2. Ribbon Bar & Tool Shelves */}
      <RibbonBar />

      {/* 3. Central Application Stage */}
      <div className="flex flex-1 min-h-0 relative overflow-hidden bg-slate-200/60 dark:bg-slate-900/60">
        {/* Dockable left sidebar */}
        <Sidebar />

        {/* Dynamic page viewport */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <Outlet />
        </main>
      </div>

      {/* 4. Bottom Desktop Status Bar */}
      <StatusBar />

      {/* 5. Modals & Dialogs */}
      <ModalContainer />

      {/* 6. Toast Notifications */}
      <ToastContainer />
    </div>
  )
}

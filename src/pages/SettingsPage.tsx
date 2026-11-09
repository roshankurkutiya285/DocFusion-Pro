import React from 'react'
import {
  Sun,
  Moon,
  Laptop,
  Trash2,
  ShieldCheck,
  HardDrive,
} from 'lucide-react'
import { useThemeStore } from '@/stores/useThemeStore'
import { useAppStore } from '@/stores/useAppStore'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/utils/cn'

export const SettingsPage: React.FC = () => {
  const { theme, resolvedTheme, setTheme } = useThemeStore()
  const { recentDocuments, clearRecentDocuments, isOffline, addToast } = useAppStore()

  const handleClearHistory = () => {
    clearRecentDocuments()
    addToast({
      title: 'History Cleared',
      message: 'Recent documents history has been removed.',
      type: 'info',
    })
  }

  const themeOptions = [
    { id: 'light', label: 'Light', icon: Sun, desc: 'Clean crisp daylight theme' },
    { id: 'dark', label: 'Dark', icon: Moon, desc: 'High contrast dark desktop' },
    { id: 'system', label: 'System', icon: Laptop, desc: 'Follows operating system' },
  ] as const

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Application Settings
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Personalize appearance, manage local storage, and review privacy controls.
          </p>
        </div>

        {/* Theme Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Appearance & Theme</CardTitle>
            <CardDescription>
              Select your preferred desktop appearance. Currently resolved as {resolvedTheme}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {themeOptions.map((opt) => {
                const Icon = opt.icon
                const isSelected = theme === opt.id
                return (
                  <div
                    key={opt.id}
                    onClick={() => setTheme(opt.id)}
                    className={cn(
                      'p-4 rounded-xl border cursor-pointer transition-all flex flex-col items-center text-center',
                      isSelected
                        ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/40 ring-1 ring-brand-500/50'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                    )}
                  >
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center mb-2',
                        isSelected
                          ? 'bg-brand-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {opt.label}
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5">
                      {opt.desc}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Storage & Privacy */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Local Storage & Privacy</CardTitle>
            <CardDescription>
              DocFusion Pro operates 100% on-device with zero telemetry or tracking.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
              <div className="flex items-center gap-3">
                <HardDrive className="w-5 h-5 text-slate-500" />
                <div>
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    Recent Documents Cache
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {recentDocuments.length} document entries stored locally in browser storage
                  </p>
                </div>
              </div>
              <Button
                size="xs"
                variant="outline"
                disabled={recentDocuments.length === 0}
                onClick={handleClearHistory}
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              >
                Clear History
              </Button>
            </div>

            <div className="flex items-center gap-3 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-lg text-xs text-emerald-800 dark:text-emerald-300">
              <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div>
                <span className="font-semibold">Zero-Cloud Guarantee: </span>
                Documents are never uploaded to any remote server or third-party cloud.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System & Architecture Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">About & Build Specifications</CardTitle>
            <CardDescription>
              DocFusion Pro Desktop Architecture
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                <span className="text-slate-400 block text-[10px]">APPLICATION</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">DocFusion Pro</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                <span className="text-slate-400 block text-[10px]">VERSION</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">1.0.0</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                <span className="text-slate-400 block text-[10px]">STATUS</span>
                <Badge variant={isOffline ? 'warning' : 'success'} size="sm" className="mt-0.5">
                  {isOffline ? 'Offline Mode' : 'Offline Ready'}
                </Badge>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                <span className="text-slate-400 block text-[10px]">CORE ENGINES</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">10 Phases Ready</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

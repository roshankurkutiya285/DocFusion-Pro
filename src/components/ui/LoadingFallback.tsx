import type { FC } from 'react'
import { RefreshCw } from 'lucide-react'

interface LoadingFallbackProps {
  message?: string
}

export const LoadingFallback: FC<LoadingFallbackProps> = ({
  message = 'Loading workspace module...',
}) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50/50 dark:bg-slate-950/50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center border border-brand-200 dark:border-brand-800 shadow-sm animate-pulse">
          <RefreshCw className="w-5 h-5 animate-spin" />
        </div>
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
          {message}
        </p>
      </div>
    </div>
  )
}

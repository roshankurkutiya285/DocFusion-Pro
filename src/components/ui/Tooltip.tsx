import React, { useState, useRef } from 'react'
import { cn } from '@/utils/cn'

interface TooltipProps {
  content: React.ReactNode
  children: React.ReactElement
  shortcut?: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  shortcut,
  position = 'top',
  delay = 300,
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const timerRef = useRef<number | null>(null)

  const showTooltip = () => {
    timerRef.current = window.setTimeout(() => {
      setIsVisible(true)
    }, delay)
  }

  const hideTooltip = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    setIsVisible(false)
  }

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }[position]

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      {isVisible && content && (
        <div
          role="tooltip"
          className={cn(
            'absolute z-50 px-2 py-1 text-xs font-medium text-white bg-slate-900 rounded shadow-md pointer-events-none whitespace-nowrap dark:bg-slate-800 dark:border dark:border-slate-700 animate-in fade-in zoom-in-95 duration-100 flex items-center gap-1.5',
            positionClasses
          )}
        >
          <span>{content}</span>
          {shortcut && (
            <kbd className="px-1 py-0.5 text-[10px] font-mono bg-slate-700 dark:bg-slate-600 rounded text-slate-300">
              {shortcut}
            </kbd>
          )}
        </div>
      )}
    </div>
  )
}

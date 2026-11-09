import React, { forwardRef } from 'react'
import { cn } from '@/utils/cn'
import { Tooltip } from './Tooltip'

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tooltip?: string
  shortcut?: string
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right'
  isActive?: boolean
  size?: 'xs' | 'sm' | 'md' | 'lg'
  variant?: 'ghost' | 'secondary' | 'subtle' | 'danger'
  badge?: string | number
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      tooltip,
      shortcut,
      tooltipPosition = 'bottom',
      isActive = false,
      size = 'md',
      variant = 'ghost',
      badge,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      xs: 'w-6 h-6 p-1 text-xs',
      sm: 'w-7 h-7 p-1 text-sm',
      md: 'w-8 h-8 p-1.5 text-base',
      lg: 'w-9 h-9 p-2 text-lg',
    }[size]

    const variantClasses = {
      ghost:
        'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800',
      secondary:
        'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
      subtle:
        'bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-brand-950/40 dark:text-brand-300 dark:hover:bg-brand-900/50',
      danger:
        'text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/40',
    }[variant]

    const activeClasses = isActive
      ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 ring-1 ring-brand-500/30'
      : ''

    const button = (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          'relative inline-flex items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-40 disabled:pointer-events-none select-none',
          sizeClasses,
          variantClasses,
          activeClasses,
          className
        )}
        {...props}
      >
        {children}
        {badge !== undefined && (
          <span className="absolute -top-1 -right-1 px-1 min-w-[14px] h-[14px] text-[9px] font-bold text-white bg-brand-600 rounded-full flex items-center justify-center leading-none">
            {badge}
          </span>
        )}
      </button>
    )

    if (tooltip && !disabled) {
      return (
        <Tooltip content={tooltip} shortcut={shortcut} position={tooltipPosition}>
          {button}
        </Tooltip>
      )
    }

    return button
  }
)

IconButton.displayName = 'IconButton'

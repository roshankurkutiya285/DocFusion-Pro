import React from 'react'
import { cn } from '@/utils/cn'

export interface SliderProps {
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  className?: string
  disabled?: boolean
  label?: string
}

export const Slider: React.FC<SliderProps> = ({
  value,
  min,
  max,
  step = 1,
  onChange,
  className,
  disabled = false,
  label,
}) => {
  const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))

  return (
    <div className={cn('flex items-center gap-2 select-none', className)}>
      {label && (
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          {label}
        </span>
      )}
      <div className="relative flex items-center w-full group">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-600 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${percentage}%, #cbd5e1 ${percentage}%, #cbd5e1 100%)`,
          }}
        />
      </div>
    </div>
  )
}

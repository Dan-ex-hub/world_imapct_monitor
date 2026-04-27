import { cn } from '@/lib/utils/cn'
import type { ImpactLevel } from '@/store/types'

const levelStyles: Record<ImpactLevel, string> = {
  Critical: 'bg-impact-critical/20 text-impact-critical border-impact-critical/30',
  High: 'bg-impact-high/20 text-impact-high border-impact-high/30',
  Medium: 'bg-impact-medium/20 text-impact-medium border-impact-medium/30',
  Low: 'bg-impact-low/20 text-impact-low border-impact-low/30',
}

export default function ImpactBadge({ level }: { level: ImpactLevel }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        levelStyles[level]
      )}
    >
      {level}
    </span>
  )
}

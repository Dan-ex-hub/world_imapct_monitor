import { cn } from '@/lib/utils/cn'
import type { EventCategory } from '@/store/types'

const categoryColors: Record<EventCategory, string> = {
  'Geopolitical': 'bg-red-500/15 text-red-400',
  'Central Bank': 'bg-amber-500/15 text-amber-400',
  'Macro': 'bg-blue-500/15 text-blue-400',
  'Political': 'bg-purple-500/15 text-purple-400',
  'Crisis': 'bg-red-600/15 text-red-500',
  'Sanctions': 'bg-orange-500/15 text-orange-400',
  'Earnings': 'bg-green-500/15 text-green-400',
  'Natural Disaster': 'bg-yellow-500/15 text-yellow-400',
}

export default function CategoryBadge({ category }: { category: EventCategory }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        categoryColors[category] ?? 'bg-gray-500/15 text-gray-400'
      )}
    >
      {category}
    </span>
  )
}

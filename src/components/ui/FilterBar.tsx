'use client'

import { useGlobeStore } from '@/store/useGlobeStore'
import { EventCategory, ImpactLevel } from '@/store/types'
import { Search, X } from 'lucide-react'
import { useState } from 'react'

const CATEGORIES: EventCategory[] = [
  'Geopolitical',
  'Central Bank',
  'Macro',
  'Political',
  'Crisis',
  'Sanctions',
  'Earnings',
  'Natural Disaster',
]

const IMPACT_LEVELS: ImpactLevel[] = ['Critical', 'High', 'Medium', 'Low']

const TIME_RANGES = [
  { value: '1h' as const, label: '1H' },
  { value: '6h' as const, label: '6H' },
  { value: '24h' as const, label: '24H' },
  { value: '48h' as const, label: '48H' },
]

export function FilterBar() {
  const filters = useGlobeStore((s) => s.filters)
  const setFilters = useGlobeStore((s) => s.setFilters)
  const [searchInput, setSearchInput] = useState(filters.searchQuery)

  const toggleCategory = (category: EventCategory) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter((c) => c !== category)
      : [...filters.categories, category]
    setFilters({ ...filters, categories: newCategories })
  }

  const toggleImpactLevel = (level: ImpactLevel) => {
    const newLevels = filters.impactLevels.includes(level)
      ? filters.impactLevels.filter((l) => l !== level)
      : [...filters.impactLevels, level]
    setFilters({ ...filters, impactLevels: newLevels })
  }

  const handleSearchChange = (value: string) => {
    setSearchInput(value)
    setFilters({ ...filters, searchQuery: value })
  }

  const clearSearch = () => {
    setSearchInput('')
    setFilters({ ...filters, searchQuery: '' })
  }

  const activeFilterCount =
    filters.categories.length + filters.impactLevels.length + (filters.searchQuery ? 1 : 0)

  return (
    <div className="flex items-center gap-4">
      {/* Search input */}
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search events..."
          className="w-full rounded-lg border border-border-subtle bg-bg-card py-2 pl-10 pr-10 text-sm text-text-primary placeholder:text-text-muted focus:border-border-default focus:outline-none"
        />
        {searchInput && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Time range selector */}
      <div className="flex items-center gap-1 rounded-lg border border-border-subtle bg-bg-card p-1">
        {TIME_RANGES.map((range) => (
          <button
            key={range.value}
            onClick={() => setFilters({ ...filters, timeRange: range.value })}
            className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
              filters.timeRange === range.value
                ? 'bg-impact-medium text-text-primary'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>

      {/* Filter dropdown trigger */}
      <button className="relative flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-card px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-elevated">
        <span>Filters</span>
        {activeFilterCount > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-impact-critical text-xs text-white">
            {activeFilterCount}
          </span>
        )}
      </button>
    </div>
  )
}

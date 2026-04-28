import { create } from 'zustand'
import type {
  GlobeEvent,
  ForexPair,
  Filters,
  ImpactLevel,
  EventCategory,
  EnvLayerType,
  EnvLayerData,
  ScreenPosition,
  User,
} from './types'

interface GlobeState {
  // Events
  events: GlobeEvent[]
  selectedEvent: GlobeEvent | null
  hoveredEventId: string | null
  tooltipPosition: ScreenPosition | null

  // Forex
  forexPairs: ForexPair[]

  // Environmental layers
  activeEnvLayer: EnvLayerType
  envLayerData: EnvLayerData | null

  // Filters
  filters: Filters

  // Playback
  isPlaybackMode: boolean
  playbackTimestamp: string | null
  playbackTime: Date
  playbackSpeed: 1 | 2 | 5 | 10
  isPlaybackPlaying: boolean

  // Connection
  isConnected: boolean

  // User
  user: User | null

  // Actions — Events
  setEvents: (events: GlobeEvent[]) => void
  addEvent: (event: GlobeEvent) => void
  removeEvent: (id: string) => void
  setSelectedEvent: (event: GlobeEvent | null) => void
  setHoveredEvent: (id: string | null, position?: ScreenPosition) => void

  // Actions — Forex
  setForexPairs: (pairs: ForexPair[]) => void

  // Actions — Environmental layers
  setActiveEnvLayer: (layer: EnvLayerType) => void
  setEnvLayerData: (data: EnvLayerData) => void

  // Actions — Filters
  setFilters: (filters: Partial<Filters>) => void
  toggleCategory: (category: EventCategory) => void
  toggleImpactLevel: (level: ImpactLevel) => void

  // Actions — Playback
  setPlaybackMode: (enabled: boolean) => void
  setPlaybackTimestamp: (ts: string | null) => void
  enterPlayback: () => void
  exitPlayback: () => void
  setPlaybackTime: (time: Date | ((prev: Date) => Date)) => void
  setPlaybackSpeed: (speed: 1 | 2 | 5 | 10) => void
  togglePlayback: () => void

  // Actions — Connection
  setConnected: (connected: boolean) => void

  // Actions — User
  setUser: (user: User | null) => void
}

const defaultFilters: Filters = {
  categories: [],
  impactLevels: [],
  timeRange: '24h',
  searchQuery: '',
}

export const useGlobeStore = create<GlobeState>((set) => ({
  // Initial state
  events: [],
  selectedEvent: null,
  hoveredEventId: null,
  tooltipPosition: null,
  forexPairs: [],
  activeEnvLayer: 'none',
  envLayerData: null,
  filters: defaultFilters,
  isPlaybackMode: false,
  playbackTimestamp: null,
  playbackTime: new Date(),
  playbackSpeed: 1,
  isPlaybackPlaying: false,
  isConnected: false,
  user: null,

  // Events
  setEvents: (events) => set({ events }),
  addEvent: (event) =>
    set((state) => ({
      events: [event, ...state.events.filter((e) => e.id !== event.id)],
    })),
  removeEvent: (id) =>
    set((state) => ({
      events: state.events.filter((e) => e.id !== id),
    })),
  setSelectedEvent: (event) => set({ selectedEvent: event }),
  setHoveredEvent: (id, position) =>
    set({
      hoveredEventId: id,
      tooltipPosition: position ?? null,
    }),

  // Forex
  setForexPairs: (pairs) => set({ forexPairs: pairs }),

  // Environmental layers
  setActiveEnvLayer: (layer) => set({ activeEnvLayer: layer }),
  setEnvLayerData: (data) => set({ envLayerData: data }),

  // Filters
  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),
  toggleCategory: (category) =>
    set((state) => ({
      filters: {
        ...state.filters,
        categories: state.filters.categories.includes(category)
          ? state.filters.categories.filter((c) => c !== category)
          : [...state.filters.categories, category],
      },
    })),
  toggleImpactLevel: (level) =>
    set((state) => ({
      filters: {
        ...state.filters,
        impactLevels: state.filters.impactLevels.includes(level)
          ? state.filters.impactLevels.filter((l) => l !== level)
          : [...state.filters.impactLevels, level],
      },
    })),

  // Playback
  setPlaybackMode: (enabled) => set({ isPlaybackMode: enabled }),
  setPlaybackTimestamp: (ts) => set({ playbackTimestamp: ts }),
  enterPlayback: () => set({ isPlaybackMode: true }),
  exitPlayback: () => set({ isPlaybackMode: false, isPlaybackPlaying: false }),
  setPlaybackTime: (time) =>
    set((state) => ({
      playbackTime: typeof time === 'function' ? time(state.playbackTime) : time,
    })),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  togglePlayback: () =>
    set((state) => ({
      isPlaybackPlaying: !state.isPlaybackPlaying,
    })),

  // Connection
  setConnected: (connected) => set({ isConnected: connected }),

  // User
  setUser: (user) => set({ user }),
}))

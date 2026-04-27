'use client'

import { useGlobeStore } from '@/store/useGlobeStore'
import type { EnvLayerType } from '@/store/types'

const ENV_LAYERS = [
  { type: 'none' as const, icon: '🌐', label: 'None', color: 'text-text-muted' },
  { type: 'wind' as const, icon: '💨', label: 'Wind', color: 'text-env-wind' },
  { type: 'aqi' as const, icon: '😷', label: 'AQI', color: 'text-env-aqi' },
  { type: 'temperature_anomaly' as const, icon: '🌡️', label: 'Temp', color: 'text-env-temp' },
  { type: 'earthquakes' as const, icon: '⚡', label: 'Quakes', color: 'text-env-quake' },
  { type: 'wildfires' as const, icon: '🔥', label: 'Fire', color: 'text-env-fire' },
  { type: 'storms' as const, icon: '🌀', label: 'Storms', color: 'text-env-storm' },
  { type: 'sea_temp' as const, icon: '🌊', label: 'Sea Temp', color: 'text-env-sea' },
]

const LAYER_LEGENDS: Record<EnvLayerType, React.ReactNode> = {
  none: null,
  wind: (
    <div className="flex items-center gap-2 text-xs text-text-muted">
      <span>Speed:</span>
      <span className="text-env-wind">Low</span>
      <span>→</span>
      <span className="text-env-wind font-bold">High</span>
    </div>
  ),
  aqi: (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="text-green-500">Good</span>
      <span className="text-yellow-500">Moderate</span>
      <span className="text-orange-500">Unhealthy</span>
      <span className="text-red-500">Very Unhealthy</span>
      <span className="text-purple-500">Hazardous</span>
    </div>
  ),
  temperature_anomaly: (
    <div className="flex items-center gap-2 text-xs text-text-muted">
      <span className="text-blue-400">-3°C</span>
      <span>→</span>
      <span className="text-text-muted">Normal</span>
      <span>→</span>
      <span className="text-red-400">+3°C</span>
    </div>
  ),
  earthquakes: (
    <div className="flex items-center gap-2 text-xs text-text-muted">
      <span>Magnitude:</span>
      <span className="text-env-quake">2.5+</span>
      <span>→</span>
      <span className="text-env-quake font-bold">7.0+</span>
    </div>
  ),
  wildfires: (
    <div className="text-xs text-text-muted">
      <span className="text-env-fire">●</span> Active wildfire
    </div>
  ),
  storms: (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-env-storm">Tropical Storm</span>
      <span className="text-pink-500">Hurricane</span>
    </div>
  ),
  sea_temp: (
    <div className="flex items-center gap-2 text-xs text-text-muted">
      <span className="text-blue-400">Cold</span>
      <span>→</span>
      <span className="text-env-sea">Warm</span>
    </div>
  ),
}

export function EnvLayerPanel() {
  const activeEnvLayer = useGlobeStore((s) => s.activeEnvLayer)
  const setActiveEnvLayer = useGlobeStore((s) => s.setActiveEnvLayer)

  const handleLayerClick = (layer: EnvLayerType) => {
    setActiveEnvLayer(layer)
  }

  const activeLegend = LAYER_LEGENDS[activeEnvLayer]

  return (
    <div className="fixed bottom-12 left-4 z-30 rounded-lg border border-border-subtle bg-bg-surface/90 p-3 backdrop-blur-sm">
      {/* Layer buttons */}
      <div className="mb-3 flex flex-wrap gap-2">
        {ENV_LAYERS.map((layer) => {
          const isActive = activeEnvLayer === layer.type

          return (
            <button
              key={layer.type}
              onClick={() => handleLayerClick(layer.type)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                isActive
                  ? `${layer.color} bg-bg-elevated shadow-lg ring-2 ring-current ring-opacity-30`
                  : 'text-text-muted hover:bg-bg-elevated hover:text-text-secondary'
              }`}
            >
              <span className="text-base">{layer.icon}</span>
              <span>{layer.label}</span>
            </button>
          )
        })}
      </div>

      {/* Legend for active layer */}
      {activeLegend && (
        <div className="border-t border-border-subtle pt-3">
          <div className="text-xs font-medium uppercase tracking-wide text-text-muted mb-2">
            Legend
          </div>
          {activeLegend}
        </div>
      )}
    </div>
  )
}

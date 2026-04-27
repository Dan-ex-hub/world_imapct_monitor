'use client'

import { formatDistanceToNow } from 'date-fns'
import type { AQIPoint, EarthquakeEvent, WildfireEvent, StormEvent, WindPoint } from '@/store/types'

interface EnvTooltipProps {
  type: 'wind' | 'aqi' | 'earthquake' | 'wildfire' | 'storm'
  data: WindPoint | AQIPoint | EarthquakeEvent | WildfireEvent | StormEvent
  position: { x: number; y: number }
}

export function EnvTooltip({ type, data, position }: EnvTooltipProps) {
  const renderContent = () => {
    switch (type) {
      case 'wind':
        const windData = data as WindPoint
        return (
          <>
            <h3 className="mb-2 font-display text-sm font-semibold text-text-primary">
              Wind Data
            </h3>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-text-muted">Speed:</span>
                <span className="font-semibold text-env-wind">{windData.speed.toFixed(1)} m/s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Direction:</span>
                <span className="text-text-secondary">{windData.direction.toFixed(0)}°</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Location:</span>
                <span className="text-text-secondary">
                  {windData.lat.toFixed(2)}°, {windData.lon.toFixed(2)}°
                </span>
              </div>
            </div>
          </>
        )

      case 'aqi':
        const aqiData = data as AQIPoint
        const healthAdvice = getHealthAdvice(aqiData.category)
        return (
          <>
            <h3 className="mb-2 font-display text-sm font-semibold text-text-primary">
              {aqiData.city}, {aqiData.country}
            </h3>
            <div className="mb-2 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-text-muted">AQI:</span>
                <span className="font-semibold text-env-aqi">{aqiData.aqi}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">PM2.5:</span>
                <span className="text-text-secondary">{aqiData.pm25.toFixed(1)} µg/m³</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Category:</span>
                <span className="text-text-secondary">{aqiData.category}</span>
              </div>
            </div>
            <div className="border-t border-border-subtle pt-2 text-xs text-text-muted">
              {healthAdvice}
            </div>
          </>
        )

      case 'earthquake':
        const quakeData = data as EarthquakeEvent
        return (
          <>
            <h3 className="mb-2 font-display text-sm font-semibold text-text-primary">
              Magnitude {quakeData.magnitude.toFixed(1)} Earthquake
            </h3>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-text-muted">Location:</span>
                <span className="text-text-secondary">{quakeData.location}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Depth:</span>
                <span className="text-text-secondary">{quakeData.depth.toFixed(0)} km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Time:</span>
                <span className="text-text-secondary">
                  {formatDistanceToNow(new Date(quakeData.time), { addSuffix: true })}
                </span>
              </div>
            </div>
            <div className="mt-2 border-t border-border-subtle pt-2">
              <a
                href={quakeData.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-impact-medium hover:underline"
              >
                View details on USGS →
              </a>
            </div>
          </>
        )

      case 'wildfire':
        const fireData = data as WildfireEvent
        return (
          <>
            <h3 className="mb-2 font-display text-sm font-semibold text-text-primary">
              {fireData.title}
            </h3>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-text-muted">Started:</span>
                <span className="text-text-secondary">
                  {formatDistanceToNow(new Date(fireData.date), { addSuffix: true })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Source:</span>
                <span className="text-text-secondary">{fireData.source}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Location:</span>
                <span className="text-text-secondary">
                  {fireData.lat.toFixed(2)}°, {fireData.lon.toFixed(2)}°
                </span>
              </div>
            </div>
          </>
        )

      case 'storm':
        const stormData = data as StormEvent
        return (
          <>
            <h3 className="mb-2 font-display text-sm font-semibold text-text-primary">
              {stormData.title}
            </h3>
            <div className="space-y-1 text-xs">
              {stormData.category && (
                <div className="flex justify-between">
                  <span className="text-text-muted">Category:</span>
                  <span className="font-semibold text-env-storm">{stormData.category}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-text-muted">Date:</span>
                <span className="text-text-secondary">
                  {formatDistanceToNow(new Date(stormData.date), { addSuffix: true })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Location:</span>
                <span className="text-text-secondary">
                  {stormData.lat.toFixed(2)}°, {stormData.lon.toFixed(2)}°
                </span>
              </div>
            </div>
          </>
        )

      default:
        return null
    }
  }

  return (
    <div
      className="pointer-events-none fixed z-50 animate-fade-in"
      style={{
        left: position.x + 16,
        top: position.y + 16,
      }}
    >
      <div className="max-w-xs rounded-lg border border-border-default bg-bg-card/95 p-3 shadow-2xl backdrop-blur-sm">
        {renderContent()}
      </div>
    </div>
  )
}

function getHealthAdvice(category: string): string {
  switch (category) {
    case 'Good':
      return 'Air quality is satisfactory, and air pollution poses little or no risk.'
    case 'Moderate':
      return 'Air quality is acceptable. However, there may be a risk for some people.'
    case 'Unhealthy for Sensitive':
      return 'Members of sensitive groups may experience health effects.'
    case 'Unhealthy':
      return 'Some members of the general public may experience health effects.'
    case 'Very Unhealthy':
      return 'Health alert: The risk of health effects is increased for everyone.'
    case 'Hazardous':
      return 'Health warning of emergency conditions: everyone is more likely to be affected.'
    default:
      return 'Air quality information unavailable.'
  }
}

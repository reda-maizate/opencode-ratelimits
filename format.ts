/** Compact display for token counts: `858K`, `1M`, `1.3M`. */
export function formatTokens(value: number | null): string {
  if (value === null) return "—"
  if (value >= 1_000_000) {
    const millions = value / 1_000_000
    return `${Number.isInteger(millions) ? millions : millions.toFixed(1)}M`
  }
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`
  return String(value)
}

/** Compact display for durations: `522ms`, `8.5s`, `1m30s`, `23h59m`. */
export function formatDuration(ms: number | null): string {
  if (ms === null) return "—"
  const total = Math.max(0, Math.round(ms))
  if (total === 0) return "0s"
  if (total < 1_000) return `${total}ms`
  const seconds = total / 1_000
  if (seconds < 10) return `${Math.round(seconds * 10) / 10}s`
  const wholeSeconds = Math.round(seconds)
  if (wholeSeconds < 60) return `${wholeSeconds}s`
  const minutes = Math.floor(wholeSeconds / 60)
  const restSeconds = wholeSeconds % 60
  if (minutes < 60) return restSeconds === 0 ? `${minutes}m` : `${minutes}m${restSeconds}s`
  const hours = Math.floor(minutes / 60)
  const restMinutes = minutes % 60
  return restMinutes === 0 ? `${hours}h` : `${hours}h${restMinutes}m`
}

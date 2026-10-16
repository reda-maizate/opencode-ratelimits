import { Rpc } from "@opencode/plugin"

/** Latest known rate limits for one provider, captured from a primary response. */
export type RateLimitEntry = {
  readonly providerID: string
  readonly modelID: string
  readonly limitRequests: number | null
  readonly remainingRequests: number | null
  readonly limitTokens: number | null
  readonly remainingTokens: number | null
  readonly resetRequestsMs: number | null
  readonly resetTokensMs: number | null
  readonly timestamp: number
}

const integerOrNull = { type: ["integer", "null"] } as const

const entrySchema = {
  type: "object",
  properties: {
    providerID: { type: "string" },
    modelID: { type: "string" },
    limitRequests: integerOrNull,
    remainingRequests: integerOrNull,
    limitTokens: integerOrNull,
    remainingTokens: integerOrNull,
    resetRequestsMs: integerOrNull,
    resetTokensMs: integerOrNull,
    timestamp: { type: "integer" },
  },
  required: [
    "providerID",
    "modelID",
    "limitRequests",
    "remainingRequests",
    "limitTokens",
    "remainingTokens",
    "resetRequestsMs",
    "resetTokensMs",
    "timestamp",
  ],
  additionalProperties: false,
} as const

/**
 * The bridge between the server plugin and the TUI plugin. The server
 * registers it and publishes `updated` events; the TUI calls `entries` for
 * the current state and listens for updates.
 */
export const rateLimitsRpc = Rpc.define({
  id: "ratelimits",
  methods: {
    entries: {
      input: { type: "object", properties: {}, additionalProperties: false },
      output: {
        type: "object",
        properties: { entries: { type: "object", additionalProperties: entrySchema } },
        required: ["entries"],
        additionalProperties: false,
      },
    },
  },
  events: {
    updated: { schema: entrySchema },
  },
})

/** Parse a numeric rate-limit header (`"600"`) into a number, or null. */
export function parseHeaderInt(value: string | null): number | null {
  if (value === null) return null
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? null : parsed
}

/**
 * Parse a duration header (`"8s522ms"`, `"1m"`, `"2h"`) into milliseconds.
 * Bare numbers (`"120"`) are treated as seconds; anything unparseable is null.
 */
export function parseDurationMs(value: string | null): number | null {
  if (value === null) return null
  let total = 0
  let matched = false
  for (const match of value.matchAll(/(\d+)(ms|s|m|h)/g)) {
    matched = true
    const amount = Number.parseInt(match[1]!, 10)
    const scale = match[2] === "ms" ? 1 : match[2] === "s" ? 1_000 : match[2] === "m" ? 60_000 : 3_600_000
    total += amount * scale
  }
  if (matched) return total
  const seconds = Number.parseInt(value, 10)
  return Number.isNaN(seconds) ? null : seconds * 1_000
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || typeof value === "number"
}

/** Runtime guard for a payload crossing the RPC boundary. */
export function isRateLimitEntry(value: unknown): value is RateLimitEntry {
  if (typeof value !== "object" || value === null) return false
  const entry = value as Record<string, unknown>
  return (
    typeof entry.providerID === "string" &&
    typeof entry.modelID === "string" &&
    isNullableNumber(entry.limitRequests) &&
    isNullableNumber(entry.remainingRequests) &&
    isNullableNumber(entry.limitTokens) &&
    isNullableNumber(entry.remainingTokens) &&
    isNullableNumber(entry.resetRequestsMs) &&
    isNullableNumber(entry.resetTokensMs) &&
    typeof entry.timestamp === "number"
  )
}

/** Validate an `entries` RPC response into a provider → entry record. */
export function parseEntries(value: unknown): Record<string, RateLimitEntry> | null {
  if (typeof value !== "object" || value === null) return null
  const entries = (value as Record<string, unknown>).entries
  if (typeof entries !== "object" || entries === null) return null
  const parsed: Record<string, RateLimitEntry> = {}
  for (const [providerID, entry] of Object.entries(entries)) {
    if (isRateLimitEntry(entry)) parsed[providerID] = entry
  }
  return parsed
}

/**
 * Build an entry from a response's rate-limit headers, or null when the
 * response carries no limit information.
 */
export function entryFromHeaders(
  header: (name: string) => string | null,
  model: { readonly providerID: string; readonly id: string },
  timestamp: number,
): RateLimitEntry | null {
  const limitRequests = parseHeaderInt(header("x-ratelimit-limit-requests"))
  const limitTokens = parseHeaderInt(header("x-ratelimit-limit-tokens"))
  if (limitRequests === null && limitTokens === null) return null
  return {
    providerID: model.providerID,
    modelID: model.id,
    limitRequests,
    remainingRequests: parseHeaderInt(header("x-ratelimit-remaining-requests")),
    limitTokens,
    remainingTokens: parseHeaderInt(header("x-ratelimit-remaining-tokens")),
    resetRequestsMs: parseDurationMs(header("x-ratelimit-reset-requests")),
    resetTokensMs: parseDurationMs(header("x-ratelimit-reset-tokens")),
    timestamp,
  }
}

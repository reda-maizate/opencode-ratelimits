import { describe, expect, test } from "bun:test"
import { JsonSchema, Schema, SchemaRepresentation } from "effect"
import {
  entryFromHeaders,
  isRateLimitEntry,
  parseDurationMs,
  parseEntries,
  parseHeaderInt,
  rateLimitsRpc,
  type RateLimitEntry,
} from "./shared"

const sample: RateLimitEntry = {
  providerID: "scaleway",
  modelID: "gpt-4o",
  limitRequests: 600,
  remainingRequests: 599,
  limitTokens: 1_000_000,
  remainingTokens: 858_000,
  resetRequestsMs: 100,
  resetTokensMs: 8_522,
  timestamp: 1_760_000_000_000,
}

/** The same JSON Schema → codec pipeline OpenCode uses to validate RPC payloads. */
function compile(document: object) {
  const schema = SchemaRepresentation.fromJsonSchemaDocument(
    JsonSchema.fromSchemaDraft2020_12(document as JsonSchema.JsonSchema),
  )
  return Schema.make<Schema.Codec<unknown>>(schema.ast)
}

describe("parseHeaderInt", () => {
  test("parses integers", () => {
    expect(parseHeaderInt("600")).toBe(600)
  })

  test("null stays null", () => {
    expect(parseHeaderInt(null)).toBeNull()
  })

  test("non-numeric values become null", () => {
    expect(parseHeaderInt("soon")).toBeNull()
  })
})

describe("parseDurationMs", () => {
  test("null stays null", () => {
    expect(parseDurationMs(null)).toBeNull()
  })

  test("parses compound durations", () => {
    expect(parseDurationMs("8s522ms")).toBe(8_522)
  })

  test("parses single units", () => {
    expect(parseDurationMs("100ms")).toBe(100)
    expect(parseDurationMs("45s")).toBe(45_000)
    expect(parseDurationMs("1m")).toBe(60_000)
    expect(parseDurationMs("2h")).toBe(7_200_000)
  })

  test("bare numbers are treated as seconds", () => {
    expect(parseDurationMs("120")).toBe(120_000)
  })

  test("unparseable values become null", () => {
    expect(parseDurationMs("soon")).toBeNull()
  })
})

describe("entryFromHeaders", () => {
  const headers: Record<string, string> = {
    "x-ratelimit-limit-requests": "600",
    "x-ratelimit-remaining-requests": "599",
    "x-ratelimit-reset-requests": "100ms",
    "x-ratelimit-limit-tokens": "1000000",
    "x-ratelimit-remaining-tokens": "858000",
    "x-ratelimit-reset-tokens": "8s522ms",
  }

  test("captures an entry from headers", () => {
    const entry = entryFromHeaders((name) => headers[name] ?? null, { providerID: "scaleway", id: "gpt-4o" }, 42)
    expect(entry).toEqual({ ...sample, timestamp: 42 })
  })

  test("ignores responses without limit headers", () => {
    expect(entryFromHeaders(() => null, { providerID: "x", id: "y" }, 42)).toBeNull()
  })

  test("captures partial limits when only tokens are present", () => {
    const entry = entryFromHeaders(
      (name) => (name === "x-ratelimit-limit-tokens" ? "1000" : null),
      { providerID: "p", id: "m" },
      42,
    )
    expect(entry?.limitRequests).toBeNull()
    expect(entry?.limitTokens).toBe(1_000)
  })
})

describe("isRateLimitEntry and parseEntries", () => {
  test("accepts a valid entry", () => {
    expect(isRateLimitEntry(sample)).toBe(true)
  })

  test("rejects non-objects", () => {
    expect(isRateLimitEntry("nope")).toBe(false)
  })

  test("rejects entries with missing fields", () => {
    expect(isRateLimitEntry({ providerID: "x" })).toBe(false)
  })

  test("rejects entries with wrong field types", () => {
    expect(isRateLimitEntry({ ...sample, timestamp: "soon" })).toBe(false)
  })

  test("parseEntries keeps only valid entries", () => {
    const parsed = parseEntries({ entries: { scaleway: sample, broken: { providerID: "x" } } })
    expect(Object.keys(parsed ?? {})).toEqual(["scaleway"])
  })

  test("parseEntries rejects malformed payloads", () => {
    expect(parseEntries({ nope: true })).toBeNull()
    expect(parseEntries(null)).toBeNull()
  })
})

describe("rateLimitsRpc schemas", () => {
  test("schemas are valid draft-2020-12 documents", () => {
    expect(() => compile(rateLimitsRpc.methods.entries.input)).not.toThrow()
    expect(() => compile(rateLimitsRpc.methods.entries.output)).not.toThrow()
    expect(() => compile(rateLimitsRpc.events.updated.schema)).not.toThrow()
  })

  test("a sample entry round-trips through the event schema", () => {
    const codec = compile(rateLimitsRpc.events.updated.schema)
    expect(Schema.decodeUnknownSync(codec)(sample)).toEqual(sample)
  })

  test("the entries output validates a provider record", () => {
    const codec = compile(rateLimitsRpc.methods.entries.output)
    expect(Schema.decodeUnknownSync(codec)({ entries: { scaleway: sample } })).toEqual({ entries: { scaleway: sample } })
  })

  test("the event schema rejects entries with missing fields", () => {
    const codec = compile(rateLimitsRpc.events.updated.schema)
    expect(() => Schema.decodeUnknownSync(codec)({ providerID: "scaleway" })).toThrow()
  })
})

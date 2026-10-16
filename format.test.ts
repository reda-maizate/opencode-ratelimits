import { describe, expect, test } from "bun:test"
import { formatDuration, formatTokens } from "./format"

describe("formatTokens", () => {
  test("null renders as an em dash", () => {
    expect(formatTokens(null)).toBe("—")
  })

  test("small counts render verbatim", () => {
    expect(formatTokens(42)).toBe("42")
  })

  test("thousands render rounded with K", () => {
    expect(formatTokens(858_000)).toBe("858K")
  })

  test("millions render whole with M", () => {
    expect(formatTokens(1_000_000)).toBe("1M")
  })

  test("fractional millions render with one decimal", () => {
    expect(formatTokens(1_500_000)).toBe("1.5M")
  })
})

describe("formatDuration", () => {
  test("null renders as an em dash", () => {
    expect(formatDuration(null)).toBe("—")
  })

  test("zero clamps to 0s", () => {
    expect(formatDuration(0)).toBe("0s")
  })

  test("negative values clamp to 0s", () => {
    expect(formatDuration(-500)).toBe("0s")
  })

  test("sub-second renders in ms", () => {
    expect(formatDuration(522)).toBe("522ms")
  })

  test("seconds under ten keep one decimal", () => {
    expect(formatDuration(8_522)).toBe("8.5s")
  })

  test("whole seconds render bare", () => {
    expect(formatDuration(8_000)).toBe("8s")
  })

  test("rounds up across the minute boundary", () => {
    expect(formatDuration(59_960)).toBe("1m")
  })

  test("minutes and seconds compose", () => {
    expect(formatDuration(90_000)).toBe("1m30s")
  })

  test("whole minutes render bare", () => {
    expect(formatDuration(60_000)).toBe("1m")
  })

  test("hours and minutes compose", () => {
    expect(formatDuration(3_780_000)).toBe("1h3m")
  })

  test("whole hours render bare", () => {
    expect(formatDuration(3_600_000)).toBe("1h")
  })
})

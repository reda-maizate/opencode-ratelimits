import { Plugin } from "@opencode/plugin"

export interface RateLimits {
  limitRequests: string | null
  remainingRequests: string | null
  resetRequests: string | null
  limitTokens: string | null
  remainingTokens: string | null
  resetTokens: string | null
  timestamp: number
}

const DATA_FILE = "/tmp/opencode-ratelimits.json"

export default Plugin.define({
  id: "ratelimits",
  async setup(ctx) {
    const registration = await ctx.session.hook("http.response", async (event) => {
      if (event.kind !== "primary") return

      const h = event.response.headers
      const limits: RateLimits = {
        limitRequests: h.get("x-ratelimit-limit-requests"),
        remainingRequests: h.get("x-ratelimit-remaining-requests"),
        resetRequests: h.get("x-ratelimit-reset-requests"),
        limitTokens: h.get("x-ratelimit-limit-tokens"),
        remainingTokens: h.get("x-ratelimit-remaining-tokens"),
        resetTokens: h.get("x-ratelimit-reset-tokens"),
        timestamp: Date.now(),
      }

      if (!limits.limitRequests && !limits.limitTokens) return

      try {
        await Bun.write(DATA_FILE, JSON.stringify(limits))
      } catch {}
    })

    return () => void registration.dispose()
  },
})

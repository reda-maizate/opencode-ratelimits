import { Plugin } from "@opencode/plugin"
import { entryFromHeaders, rateLimitsRpc, type RateLimitEntry } from "./shared"

export default Plugin.define({
  id: "ratelimits",
  async setup(ctx) {
    const entries = new Map<string, RateLimitEntry>()

    // Registered first, so the TUI can query state even before the first response arrives.
    const rpc = await ctx.rpc.register(rateLimitsRpc, {
      entries: async () => ({ entries: Object.fromEntries(entries) }),
    })

    const hook = await ctx.session.hook("http.response", (event) => {
      if (event.kind !== "primary") return
      const entry = entryFromHeaders((name) => event.response.headers.get(name), event.model, Date.now())
      if (entry === null) return
      entries.set(entry.providerID, entry)
      return rpc.events
        .emit("updated", entry)
        .catch((error) => console.error("[ratelimits] failed to publish rate-limit update", error))
    })

    return () => void Promise.all([rpc.dispose(), hook.dispose()])
  },
})

import { Plugin } from "@opencode/plugin/tui"
import { Show, createSignal } from "solid-js"
import { formatDuration, formatTokens } from "./format"
import { isRateLimitEntry, parseEntries, rateLimitsRpc, type RateLimitEntry } from "./shared"

/** Hide the footer after this long without a response for the active provider. */
const STALE_MS = 10 * 60_000
/** How often the reset countdown is re-evaluated. */
const CLOCK_MS = 1_000

export default Plugin.define({
  id: "ratelimits",
  setup(context) {
    const [entries, setEntries] = createSignal<Record<string, RateLimitEntry>>({})
    const [now, setNow] = createSignal(Date.now())

    const client = context.client.rpc(rateLimitsRpc)

    // Initial state: fills the footer if responses arrived before the TUI started.
    void client
      .entries({})
      .then((value) => {
        const parsed = parseEntries(value)
        if (parsed !== null) setEntries(parsed)
      })
      .catch(() => {
        // The server plugin is unavailable (older host, disabled) — nothing to show yet.
      })

    const stopEvents = client.events.on("updated", (event) => {
      const entry = event.data
      if (!isRateLimitEntry(entry)) return
      setEntries((previous) => ({ ...previous, [entry.providerID]: entry }))
    })

    const clock = setInterval(() => setNow(Date.now()), CLOCK_MS)

    const stopSlot = context.ui.slot({
      append: "prompt.footer.status",
      render: (input) => {
        const entry = () => {
          if (input.sessionID === undefined) return undefined
          const providerID = context.data.session.get(input.sessionID)?.model?.providerID
          return providerID === undefined ? undefined : entries()[providerID]
        }
        const visible = () => {
          const current = entry()
          return current !== undefined && now() - current.timestamp < STALE_MS ? current : undefined
        }
        const countdown = (current: RateLimitEntry) => {
          const reset = current.resetTokensMs ?? current.resetRequestsMs
          return formatDuration(reset === null ? null : Math.max(0, reset - (now() - current.timestamp)))
        }
        return (
          <Show when={visible()} keyed>
            {(current) => (
              <text fg={context.theme.text.base}>
                {"⚡ "}
                {current.remainingRequests ?? "—"}/{current.limitRequests ?? "—"} req
                {" · "}
                {formatTokens(current.remainingTokens)}/{formatTokens(current.limitTokens)} tok
                {" · "}
                reset {countdown(current)}
              </text>
            )}
          </Show>
        )
      },
    })

    return () => {
      clearInterval(clock)
      stopEvents()
      stopSlot()
    }
  },
})

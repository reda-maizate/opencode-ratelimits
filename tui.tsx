import { Plugin } from "@opencode/plugin/tui"
import { Show, createSignal, onCleanup } from "solid-js"

interface RateLimits {
  limitRequests: string | null
  remainingRequests: string | null
  resetRequests: string | null
  limitTokens: string | null
  remainingTokens: string | null
  resetTokens: string | null
  timestamp: number
}

const DATA_FILE = "/tmp/opencode-ratelimits.json"

function formatTokens(value: string | null | undefined): string {
  if (!value) return "—"
  const n = parseInt(value, 10)
  if (isNaN(n)) return value
  if (n >= 1_000_000) {
    const m = n / 1_000_000
    return `${Number.isInteger(m) ? m : m.toFixed(1)}M`
  }
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`
  return String(n)
}

function formatDuration(value: string | null | undefined): string {
  if (!value) return "—"
  const stripped = value.replace(/\d+ms$/, "")
  return stripped || "0s"
}

export default Plugin.define({
  id: "ratelimits",
  setup(context) {
    const [limits, setLimits] = createSignal<RateLimits | null>(null)

    async function readLimits() {
      try {
        const file = Bun.file(DATA_FILE)
        const data = await file.json()
        if (data && typeof data === "object" && "limitRequests" in data) {
          setLimits(data as RateLimits)
        }
      } catch {}
    }

    const interval = setInterval(readLimits, 2000)

    const stopEvent = context.data.on("session.execution.succeeded", readLimits)

    void readLimits()

    onCleanup(() => {
      clearInterval(interval)
      stopEvent()
    })

    return context.ui.slot({
      append: "prompt.footer.status",
      render: () => (
        <Show when={limits()}>
          <text fg={context.theme.text.base}>
            {"⚡ "}
            {limits()!.remainingRequests ?? "—"}/{limits()!.limitRequests ?? "—"} req
            {" · "}
            {formatTokens(limits()!.remainingTokens)}/{formatTokens(limits()!.limitTokens)} tok
            {" · "}
            reset {formatDuration(limits()!.resetTokens)}
          </text>
        </Show>
      ),
    })
  },
})

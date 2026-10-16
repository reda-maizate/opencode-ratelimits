# opencode-ratelimits

An [OpenCode](https://opencode.ai) plugin that displays your provider's rate limits (`x-ratelimit-*` headers) in the TUI footer.

```
⚡ 599/600 req · 858K/1M tok · reset 8.5s
```

## Install

```sh
opencode plugin add github:reda-maizate/opencode-ratelimits
```

Restart the TUI after installing (the TUI client loads plugins on startup):

```sh
# quit the TUI, then reopen it
opencode
```

## How it works

The plugin has two entrypoints that communicate over OpenCode's plugin RPC:

- **Server** (`index.ts`) — hooks `http.response`, extracts the `x-ratelimit-*` headers from primary responses, and publishes them as typed RPC events.
- **TUI** (`tui.tsx`) — calls the plugin's `ratelimits` RPC for the current state, subscribes to `updated` events, and renders the limits for the session's active provider in the `prompt.footer.status` slot.

Limits are tracked per provider, so switching models — or subagents running on another provider — each show their own numbers. The footer hides itself after ten minutes without a response.

If the footer never appears, your provider likely doesn't send rate-limit headers (see below), or the server plugin failed to load — check the OpenCode server log.

## Requirements

Your provider must return OpenAI-compatible rate-limit headers:

| Header | Example |
|---|---|
| `x-ratelimit-limit-requests` | `600` |
| `x-ratelimit-remaining-requests` | `599` |
| `x-ratelimit-reset-requests` | `100ms` |
| `x-ratelimit-limit-tokens` | `1000000` |
| `x-ratelimit-remaining-tokens` | `999999` |
| `x-ratelimit-reset-tokens` | `8s522ms` |

These are returned by [Scaleway's Generative APIs](https://www.scaleway.com/en/generative-apis/) and other OpenAI-compatible providers.

## Development

```sh
bun install    # dev dependencies (types and tests only — the plugin itself has none)
bun run typecheck
bun test
```

## License

MIT

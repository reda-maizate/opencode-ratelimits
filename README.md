# opencode-ratelimits

An [OpenCode](https://opencode.ai) plugin that displays your provider's rate limits (`x-ratelimit-*` headers) in the TUI footer after every query.

```
⚡ 599/600 req · 858K/1M tok · reset 8s
```

## Install

```sh
opencode plugin add github:<your-github-username>/opencode-ratelimits
```

Or using the GitHub shorthand:

```sh
opencode plugin add <your-github-username>/opencode-ratelimits
```

Restart the TUI after installing (the TUI client loads plugins on startup):

```sh
# quit the TUI, then reopen it
opencode
```

## How it works

The plugin has two entrypoints:

- **Server** (`index.ts`) — hooks `http.response`, extracts `x-ratelimit-*` headers from primary responses, and writes them to `/tmp/opencode-ratelimits.json`.
- **TUI** (`tui.tsx`) — polls that file (and refreshes on `session.execution.succeeded`), rendering the rate limits in the `prompt.footer.status` slot.

A file-based bridge is used because the server and TUI run in separate processes with separate storage.

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

## License

MIT

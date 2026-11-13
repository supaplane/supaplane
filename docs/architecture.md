# Architecture

Supaplane is a local-first, multi-surface coding-agent workbench. This document describes the package boundaries and the run-time topology.

## Goals

- **Local-first.** All agent CLIs run on the user's machine. The daemon is supervised; the user's shell environment is inherited. No telemetry.
- **Multi-surface.** Desktop (Electron), PWA (browser), mobile (Expo / React Native), CLI. All surfaces consume the same daemon over WebSocket.
- **Multi-provider.** OpenCode, Claude Code, Cursor (via ACP) at MVP. Codex, Copilot, Pi/OMP, plus any user-defined ACP agent, post-MVP.
- **Seamless onboarding.** New client connects to a daemon via QR + TOFU-pinned public-key fingerprint. Zero inbound ports on the host (relay dials outbound).
- **MIT-licensed.** The Paseo daemon is AGPL-3.0 — we mirror its architecture clean-room rather than fork its code.

## Package layout

```
@echohello/protocol   Zod schemas + binary frame codecs. The contract.
                    No deps on other packages.
@echohello/client     WS driver + SupaplaneClient facade.
                    Depends on @echohello/protocol.
@echohello/server     Standalone supervised daemon (Express 5 + ws + Pino).
                    Depends on @echohello/protocol + @echohello/client.
@echohello/cli        Commander CLI over the daemon's WS API.
                    Depends on @echohello/protocol + @echohello/client.
@echohello/web        Vite 8 + React 19 + Tailwind 4 + Pretext renderer.
                    Also serves as the PWA. Depends on @echohello/protocol + @echohello/client.
@echohello/desktop    Electron 41 shell that spawns and supervises the daemon.
                    Depends on @echohello/server + @echohello/web.
@echohello/app        Expo 54 + RN 0.81 mobile renderer.
                    Depends on @echohello/protocol + @echohello/client.
@echohello/relay      (post-MVP) tweetnacl-box E2E relay.
                    Depends on @echohello/protocol.
@echohello/cast       Rigged passenger SVGs and demo playground.
                    No deps on other packages.
```

The dependency direction is strictly downward. Never import backwards — if you find yourself needing to import `@echohello/web` from `@echohello/server`, you have a design problem.

## Run-time topology

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User's machine                                │
│                                                                       │
│  ┌────────────────────────────┐    ┌────────────────────────────────┐ │
│  │  @echohello/desktop          │    │  @echohello/app (mobile)         │ │
│  │  Electron 41 shell         │    │  Expo 54 / RN 0.81            │ │
│  │  spawns + supervises       │    │  connects via relay          │ │
│  │  the daemon                │    │                                │ │
│  │  hosts @echohello/web        │    │                                │ │
│  └────────────┬───────────────┘    └────────────────┬───────────────┘ │
│               │                                       │                │
│               │ (direct WS)                           │ (relay WS)     │
│               ▼                                       ▼                │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │                  @echohello/server (daemon)                       │   │
│  │  Express 5 + ws 8 + Pino                                         │   │
│  │  agent-manager {opencode, claude, cursor-acp, ...}              │   │
│  │  worktree-service, project-registry, chat                       │   │
│  └─────────────────────────────────────┬──────────────────────────┘   │
│                                        │                              │
│                                        │ spawns + supervises          │
│                                        ▼                              │
│                       agent CLIs (claude, codex, opencode, ...)        │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                  @echohello/web (browser)                         │  │
│  │  Vite 8 + React 19 + Tailwind 4 + Pretext                       │  │
│  │  PWA installable, also reachable via relay                     │  │
│  └────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘

                            (zero inbound ports)

                              ┌───────────────┐
                              │ relay.supaplane │
                              │  .run:443     │   ← sees only ciphertext
                              │  (post-MVP)   │
                              └───────────────┘
```

## Build order

`bun run build` emits Cast, protocol, client, server and CLI in that order. Cast is independent. The other packages follow `protocol -> client -> server -> CLI`; `build:server-deps` is a helper that builds the client and protocol, not a separate package.

The renderers have separate commands. The root build does not bundle web or emit the desktop shell.

| Command                                | Result                                                                                            |
| -------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `bun run build:web`                    | Builds protocol and client, then type-checks and bundles web with Vite.                           |
| `bun run build:desktop`                | Builds server and web, then type-checks the Electron shell.                                       |
| `bun run --cwd packages/desktop build` | Emits the Electron shell and type-checks it. Run after `build:desktop` to prepare server and web. |
| `bun run build:app`                    | Builds protocol and client, then type-checks the mobile app. It does not produce a native bundle. |

The intended dependency direction is unchanged. Web and app consume client and protocol. Desktop supervises server and hosts web. Cast can build independently of every daemon and renderer package.

## Reference

- `docs/onboarding-relay.md` — pairing, QR, relay, settings sync
- `docs/providers.md` — agent runtime integrations

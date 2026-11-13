# Development

How to work on Supaplane day-to-day.

## Toolchain

```bash
mise install      # installs node 22.23 + bun 1.3.14
bun install       # installs all workspace deps
```

Both are pinned in `mise.toml`. Use `mise run <task>` for the convenience wrappers, or `bun run <script>` directly from the root.

## Build

```bash
# Emit cast, protocol, client, server and CLI
bun run build

# Build protocol + client, then type-check and bundle web
bun run build:web

# Build server + web, then type-check the Electron shell
bun run build:desktop

# Emit and type-check the Electron shell after its dependencies are built
bun run --cwd packages/desktop build

# Build protocol + client, then type-check the mobile app (no native bundle)
bun run build:app

# Just protocol + client (fast iteration on the wire types)
bun run build:client

# Watch a single package
bun run watch:server
```

## Type-check

```bash
bun run typecheck
```

Checks Cast, protocol, client, server, CLI and web. It uses `@typescript/native-preview` (tsgo) except for the server, which uses `tsc`. CI runs `bun run build` first so workspace imports resolve to emitted packages.

Desktop and app are checked separately by `bun run build:desktop` and `bun run build:app`. The root build and type-check commands do not cover those renderers.

## Lint + format

```bash
bun run lint         # oxlint
bun run lint-fix     # auto-fix
bun run format       # oxfmt write
bun run format-check # CI check (no write)
mise run fmt-check   # wrapper for bun run format-check
```

Lefthook (`lefthook.yml`) runs formatting, lint and type-check hooks for matching staged files. CI also checks lint and formatting.

## Test

```bash
bun run test         # Vitest suite used by CI, including workflow tests
bun run knip         # dead-code detection
```

`bun test` invokes Bun's own test runner. It currently skips the workflow tests under `.github/`, so use `bun run test` for the full configured suite. Lefthook runs Vitest and Knip before pushes.

## Dev loops

```bash
# Run the daemon in dev mode (auto-reload on src/ changes)
mise run dev

# Run the daemon without watch
mise run dev-daemon

# Run the web renderer (Vite HMR on http://127.0.0.1:5179)
mise run dev-web

# Run the desktop shell (Electron + the running daemon)
mise run dev-desktop

# All three concurrently
mise run dev-all
```

Run `bun run build` once before starting a dev loop so the workspace dependencies are emitted. The dev commands then run each surface from its own workspace.

The Vite dev server proxies `/api` and `/ws` to `http://127.0.0.1:17687` (the daemon). The desktop shell expects the daemon to be running separately. Default ports avoid conflicts with Paseo (6767), Vite default (5173), Metro/Expo (8081, 19000), and other well-known dev tools.

## Day-to-day workflow

1. Make a change in a package (e.g. `packages/server/src/handshake.ts`).
2. `bun run watch:server` for type-check feedback.
3. Run the daemon with `mise run dev`; `--watch` reloads on save.
4. Run tests in that package from the root with `bun run test packages/server`.
5. Commit. Lefthook runs format + lint + typecheck on staged files.

## Adding a new package

1. `mkdir packages/foo`
2. Add `package.json` (private, `"type": "module"`).
3. Add `tsconfig.json` extending `../../tsconfig.base.json`, with references to the packages it depends on.
4. Add `tsconfig.typecheck.json` with `"noEmit": true`.
5. Add `src/index.ts` as the entry.
6. Add `packages/foo` to the root `package.json` `workspaces` array (auto-picked-up by Bun glob, but explicit is clearer).
7. Add `docs/<concern>.md` describing the package.

## Adding a new provider

1. Create `packages/server/src/server/agent/providers/<id>/agent.ts` implementing `AgentClient`.
2. Register in `packages/server/src/server/agent/provider-registry.ts`'s `PROVIDER_CLIENT_FACTORIES` map.
3. Add the provider id to `BUILTIN_PROVIDER_IDS` in `packages/protocol/src/provider-manifest.ts`.
4. Declare default modes/models in `packages/protocol/src/provider-manifest.ts`.
5. Add a `getDiagnostic()` probe so the onboarding wizard can show status.
6. Document in `docs/providers.md`.

## Reference

- `AGENTS.md` — operating manual for AI agents
- `docs/architecture.md`
- `docs/onboarding-relay.md`
- `docs/providers.md`

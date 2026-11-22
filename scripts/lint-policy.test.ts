import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

const fixtureDir = realpathSync(mkdtempSync(join(tmpdir(), "supaplane-lint-policy-")));
const configPath = join(fixtureDir, ".oxlintrc.json");
const oxlintPath = fileURLToPath(new URL("../node_modules/.bin/oxlint", import.meta.url));
copyFileSync(new URL("../.oxlintrc.json", import.meta.url), configPath);

afterAll(() => {
  rmSync(fixtureDir, { recursive: true, force: true });
});

function lintFixture(filename: string, source: string) {
  const fixturePath = join(fixtureDir, filename);
  mkdirSync(dirname(fixturePath), { recursive: true });
  writeFileSync(fixturePath, source);
  const result = spawnSync(oxlintPath, ["--config", configPath, "--format", "json", fixturePath], {
    encoding: "utf8",
    cwd: fixtureDir,
  });
  expect(result.error).toBeUndefined();
  expect(result.signal).toBeNull();
  const report = JSON.parse(result.stdout) as {
    diagnostics: { code?: string; severity: string; message: string }[];
  };
  return { status: result.status, diagnostics: report.diagnostics };
}

describe("lint policy", () => {
  it.each([
    [
      "constructors",
      "export class Client { readonly providerId: string; constructor(providerId: string) { this.providerId = providerId; } }\n",
    ],
    ["properties", 'export class Client { readonly providerId = "claude"; }\n'],
    ["methods", "export class Client { connect() { return this; } }\n"],
    [
      "accessors",
      "export class Client { get connected() { return true; } set connected(value: boolean) { void value; } }\n",
    ],
    [
      "readonly parameter properties",
      "export class Client { constructor(readonly providerId: string) {} }\n",
    ],
    [
      "public parameter properties",
      "export class Client { constructor(public providerId: string) {} }\n",
    ],
    [
      "private members",
      "export class Client { private connected = false; get isConnected() { return this.connected; } }\n",
    ],
    [
      "protected members",
      "export class Client { protected connected = false; get isConnected() { return this.connected; } }\n",
    ],
    [
      "private fields",
      "export class Client { #connected = false; get isConnected() { return this.#connected; } }\n",
    ],
  ])("allows class accessibility for %s", (_kind, source) => {
    const result = lintFixture("packages/client/src/entry.ts", source);
    expect(result.status).toBe(0);
    expect(result.diagnostics.map(({ code }) => code)).not.toContain(
      "typescript-eslint(explicit-member-accessibility)",
    );
  });

  it.each([
    [
      "constructors",
      "export class Client { readonly providerId: string; public constructor(providerId: string) { this.providerId = providerId; } }\n",
    ],
    ["properties", 'export class Client { public readonly providerId = "claude"; }\n'],
    ["methods", "export class Client { public connect() { return this; } }\n"],
    ["accessors", "export class Client { public get connected() { return true; } }\n"],
    [
      "readonly parameter properties",
      "export class Client { constructor(public readonly providerId: string) {} }\n",
    ],
  ])("keeps redundant public modifier warnings for %s", (_kind, source) => {
    const result = lintFixture("packages/client/src/entry.ts", source);
    expect(result.status).toBe(0);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "typescript-eslint(explicit-member-accessibility)",
        severity: "warning",
      }),
    );
  });

  it.each([
    "packages/web/src/entry.tsx",
    "packages/app/src/entry.tsx",
    "packages/web/src/entry.jsx",
  ])("allows JSX in %s", (filename) => {
    const result = lintFixture(filename, "export function Status() { return <span />; }\n");
    expect(result.status).toBe(0);
    expect(result.diagnostics.map(({ code }) => code)).not.toContain(
      "eslint-plugin-react(jsx-filename-extension)",
    );
  });

  it("keeps JSX filename warnings for unsupported extensions", () => {
    const result = lintFixture(
      "packages/web/src/entry.js",
      "export function Status() { return <span />; }\n",
    );
    expect(result.status).toBe(0);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "eslint-plugin-react(jsx-filename-extension)",
        severity: "warning",
      }),
    );
  });

  it.each([
    [
      "scalar selection",
      "packages/protocol/src/entry.ts",
      'export function scheme(tls: boolean) { return tls ? "wss" : "ws"; }\n',
    ],
    [
      "template expressions",
      "packages/client/src/entry.ts",
      'export function endpoint(tls: boolean) { return `${tls ? "wss" : "ws"}://localhost/ws`; }\n',
    ],
    [
      "optional object fields",
      "packages/server/src/entry.ts",
      "export function options(token?: string) { return { ...(token ? { token } : {}) }; }\n",
    ],
    [
      "JSX rendering",
      "packages/web/src/entry.tsx",
      'export function Status({ connected }: { connected: boolean }) { return <span>{connected ? "online" : "offline"}</span>; }\n',
    ],
  ])("allows simple ternaries for %s", (_kind, filename, source) => {
    const result = lintFixture(filename, source);
    expect(result.status).toBe(0);
    expect(result.diagnostics.map(({ code }) => code)).not.toContain("eslint(no-ternary)");
  });

  it("keeps nested ternary warnings", () => {
    const result = lintFixture(
      "packages/protocol/src/nested.ts",
      'export function label(primary: boolean, secondary: boolean) { return primary ? "primary" : secondary ? "secondary" : "idle"; }\n',
    );
    expect(result.status).toBe(0);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "eslint(no-nested-ternary)", severity: "warning" }),
    );
  });

  it.each([
    ["values", 'export const sessionId = "session";\nexport const providerId = "claude";\n'],
    ["functions", "export function connect() {}\nexport function disconnect() {}\n"],
    ["types", "export type SessionId = string;\nexport type ProviderId = string;\n"],
    [
      "classes",
      "export class Client { connect() { return this; } }\nexport class Driver { connect() { return this; } }\n",
    ],
    [
      "values with derived types",
      'export const session = { id: "session" };\nexport type Session = typeof session;\n',
    ],
    [
      "re-exports",
      'export { Client } from "./client.js";\nexport { Driver } from "./driver.js";\n',
    ],
  ])("allows separate named exports for %s", (_kind, source) => {
    const result = lintFixture("packages/protocol/src/entry.ts", source);
    expect(result.status).toBe(0);
    expect(result.diagnostics.map(({ code }) => code)).not.toContain(
      "eslint-plugin-import(group-exports)",
    );
  });

  it("rejects duplicate exported declarations", () => {
    const result = lintFixture(
      "packages/protocol/src/duplicate.ts",
      'export const sessionId = "session";\nexport const sessionId = "other";\n',
    );
    expect(result.status).toBe(1);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "error",
        message: "Identifier `sessionId` has already been declared",
      }),
    );
  });

  it.each([
    "packages/server/src/entry.ts",
    "packages/server/src/server/entry.test.ts",
    "packages/cli/src/entry.ts",
    "packages/desktop/src/main.ts",
    "scripts/check.ts",
    "scripts/check.test.ts",
    "packages/cast/vite.config.ts",
    "packages/web/vite.config.ts",
  ])("allows Node built-in imports in %s", (filename) => {
    const result = lintFixture(
      filename,
      'import path from "node:path";\nexport const root = path.resolve(".");\n',
    );
    expect(result.status).toBe(0);
    expect(result.diagnostics.map(({ code }) => code)).not.toContain(
      "eslint-plugin-import(no-nodejs-modules)",
    );
  });

  it("allows Node built-in requires in the Metro config", () => {
    const result = lintFixture(
      "packages/app/metro.config.cjs",
      'const path = require("path");\nmodule.exports = path.resolve(".");\n',
    );
    expect(result.status).toBe(0);
    expect(result.diagnostics.map(({ code }) => code)).not.toContain(
      "eslint-plugin-import(no-nodejs-modules)",
    );
  });

  it.each([
    "packages/web/src/entry.ts",
    "packages/app/src/entry.ts",
    "packages/protocol/src/entry.ts",
    "packages/client/src/entry.ts",
    "packages/cast/src/entry.ts",
    "packages/cast/demo/main.ts",
    "packages/serverish/src/entry.ts",
    "packages/web/src/vite.config.ts",
    "packages/desktop/src/renderer.ts",
  ])("keeps Node built-in import warnings in %s", (filename) => {
    const result = lintFixture(
      filename,
      'import path from "node:path";\nexport const root = path.resolve(".");\n',
    );
    expect(result.status).toBe(0);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "eslint-plugin-import(no-nodejs-modules)",
        severity: "warning",
      }),
    );
  });

  it.each([
    "packages/cast/src/geometry.ts",
    "packages/cast/demo/main.ts",
    "packages/cast/src/rig.test.ts",
  ])("allows short coordinate identifiers in %s", (filename) => {
    const result = lintFixture(
      filename,
      "export function distance(x: number, y: number) { return Math.hypot(x, y); }\n",
    );
    expect(result.status).toBe(0);
    expect(result.diagnostics.map(({ code }) => code)).not.toContain("eslint(id-length)");
  });

  it.each(["packages/server/src/entry.ts", "packages/castaway/entry.test.ts"])(
    "keeps short identifier warnings outside Cast in %s",
    (filename) => {
      const result = lintFixture(
        filename,
        "export function distance(x: number, y: number) { return Math.hypot(x, y); }\n",
      );
      expect(result.status).toBe(0);
      expect(result.diagnostics).toContainEqual(
        expect.objectContaining({ code: "eslint(id-length)", severity: "warning" }),
      );
    },
  );

  it.each([
    "packages/cast/src/geometry.ts",
    "packages/cast/demo/main.ts",
    "packages/cast/src/rig.test.ts",
  ])("allows numeric coefficients in %s", (filename) => {
    const result = lintFixture(
      filename,
      "export function scale(radius: number) { return radius * 0.38; }\n",
    );
    expect(result.status).toBe(0);
    expect(result.diagnostics.map(({ code }) => code)).not.toContain("eslint(no-magic-numbers)");
  });

  it.each(["packages/server/src/entry.ts", "packages/castaway/entry.test.ts"])(
    "keeps numeric literal warnings outside Cast in %s",
    (filename) => {
      const result = lintFixture(
        filename,
        "export function scale(radius: number) { return radius * 0.38; }\n",
      );
      expect(result.status).toBe(0);
      expect(result.diagnostics).toContainEqual(
        expect.objectContaining({ code: "eslint(no-magic-numbers)", severity: "warning" }),
      );
    },
  );

  it.each(["packages/cast/src/geometry.ts", "packages/cast/src/rig.test.ts"])(
    "keeps correctness errors in %s",
    (filename) => {
      const result = lintFixture(filename, "const unused = 1;\ndebugger;\n");
      expect(result.status).toBe(1);
      expect(result.diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: "eslint(no-unused-vars)", severity: "error" }),
          expect.objectContaining({ code: "eslint(no-debugger)", severity: "error" }),
        ]),
      );
    },
  );

  it.each(
    (
      [
        [
          "discriminator-first messages",
          'export const message = { type: "tool.start", input: {} };\n',
        ],
        ["time ranges", "export const range = { start: 1000, end: 1500 };\n"],
        [
          "nested objects",
          'export const event = { time: { start: 1000, end: 1500 }, status: "done" };\n',
        ],
      ] as const
    ).flatMap(([kind, source]) =>
      ["entry.ts", "entry.test.ts"].map((filename) => [kind, filename, source] as const),
    ),
  )("allows intentional key ordering for %s in %s", (_kind, filename, source) => {
    const result = lintFixture(filename, source);
    expect(result.status).toBe(0);
    expect(result.diagnostics.map(({ code }) => code)).not.toContain("eslint(sort-keys)");
  });

  it.each(["entry.ts", "entry.test.ts"])("rejects duplicate object keys in %s", (filename) => {
    const result = lintFixture(
      filename,
      'export const message = { type: "start", type: "end" };\n',
    );
    expect(result.status).toBe(1);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "eslint(no-dupe-keys)", severity: "error" }),
    );
  });

  it.each([
    ["value declarations", "entry.ts", 'export const sessionId = "session";\n'],
    ["function declarations", "entry.ts", "export function connect() {}\n"],
    ["class declarations", "entry.ts", "export class Client { connect() { return this; } }\n"],
    ["type declarations", "entry.ts", "export type SessionId = string;\n"],
    ["re-exports", "entry.ts", 'export { Client } from "./client.js";\n'],
    ["test helpers", "helper.test.ts", "export function createClient() {}\n"],
  ])("allows named exports for %s", (_kind, filename, source) => {
    const result = lintFixture(filename, source);
    expect(result.status).toBe(0);
    expect(result.diagnostics.map(({ code }) => code)).not.toContain(
      "eslint-plugin-import(no-named-export)",
    );
  });

  it("allows production module initialisation without test setup warnings", () => {
    const result = lintFixture("entry.ts", "initialise();\n");
    expect(result.status).toBe(0);
    expect(result.diagnostics.map(({ code }) => code)).not.toContain(
      "eslint-plugin-jest(require-hook)",
    );
  });

  it.each(
    ["test", "spec"].flatMap((suffix) =>
      ["ts", "tsx", "js", "jsx"].map((ext) => `${suffix}.${ext}`),
    ),
  )("keeps test setup warnings in %s files", (extension) => {
    const result = lintFixture(`setup.${extension}`, "initialise();\n");
    expect(result.diagnostics.map(({ code }) => code)).toContain(
      "eslint-plugin-jest(require-hook)",
    );
  });

  it("rejects focused tests", () => {
    const result = lintFixture(
      "focused.test.ts",
      'import { it } from "vitest";\nit.only("focused", () => {});\n',
    );
    expect(result.status).toBe(1);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "eslint-plugin-jest(no-focused-tests)",
        severity: "error",
      }),
    );
  });

  it.each([
    "entry.ts",
    "entry.test.ts",
    "packages/server/src/entry.ts",
    "scripts/check.test.ts",
    "packages/app/metro.config.cjs",
  ])("keeps error rules active in %s", (filename) => {
    const result = lintFixture(filename, "const unused = 1;\ndebugger;\n");
    expect(result.status).toBe(1);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "eslint(no-unused-vars)", severity: "error" }),
        expect.objectContaining({ code: "eslint(no-debugger)", severity: "error" }),
      ]),
    );
  });
});

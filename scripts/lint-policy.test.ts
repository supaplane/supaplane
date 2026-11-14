import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
  writeFileSync(fixturePath, source);
  const result = spawnSync(oxlintPath, ["--config", configPath, "--format", "json", fixturePath], {
    encoding: "utf8",
    cwd: fixtureDir,
  });
  expect(result.error).toBeUndefined();
  expect(result.signal).toBeNull();
  const report = JSON.parse(result.stdout) as {
    diagnostics: { code: string; severity: string }[];
  };
  return { status: result.status, diagnostics: report.diagnostics };
}

describe("lint policy", () => {
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

  it.each(["entry.ts", "entry.test.ts"])("keeps error rules active in %s", (filename) => {
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

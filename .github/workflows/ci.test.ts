import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isSeq, parseDocument } from "yaml";

const workflow = parseDocument(readFileSync(new URL("./ci.yml", import.meta.url), "utf8"));
const requiredJobs = ["lint", "format", "typecheck", "test", "build"];

function runGate(needs: Record<string, { result: string; outputs: Record<string, string> }>) {
  const script = String(workflow.getIn(["jobs", "all", "steps", 0, "run"])).replaceAll(
    /\$\{\{ needs\.(\w+)\.result \}\}/g,
    (_expression, job: string) => needs[job]?.result ?? "",
  );

  return spawnSync("bash", ["--noprofile", "--norc", "-e", "-o", "pipefail", "-c", script], {
    encoding: "utf8",
    env: { ...process.env, JOB_RESULTS: JSON.stringify(needs) },
  });
}

function jobResults(job?: string, result = "success") {
  return Object.fromEntries(
    requiredJobs.map((name) => [name, { result: name === job ? result : "success", outputs: {} }]),
  );
}

describe("aggregate CI gate", () => {
  it("always waits for every required job and passes their results to the shell", () => {
    const needs = workflow.getIn(["jobs", "all", "needs"]);
    expect(isSeq(needs)).toBe(true);
    expect(isSeq(needs) ? needs.items.map(String) : []).toStrictEqual(requiredJobs);
    expect(workflow.getIn(["jobs", "all", "if"])).toBe("${{ always() }}");
    expect(workflow.getIn(["jobs", "all", "steps", 0, "env", "JOB_RESULTS"])).toBe(
      "${{ toJSON(needs) }}",
    );
  });

  it("passes when every required job succeeds", () => {
    const result = runGate(jobResults());
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
  });

  it.each(
    requiredJobs.flatMap((job) =>
      ["failure", "cancelled", "skipped"].map((result) => ({ job, result })),
    ),
  )("fails when $job is $result", ({ job, result }) => {
    const gate = runGate(jobResults(job, result));
    expect(gate.error).toBeUndefined();
    expect(gate.status).toBe(1);
    expect(gate.stdout).toContain(`${job}: ${result}`);
  });

  it("fails when no dependency results are supplied", () => {
    const result = runGate({});
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
  });
});

#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const docs = path.join(root, "docs", "benchmarks", "phase-05.1", "stage-2c4");
const logs = path.join(docs, "logs");
mkdirSync(logs, { recursive: true });

const tests = [
  {
    id: "0",
    name: "Parent supervisor timeout cleanup",
    timeout: 2500,
    command: ["node", "scripts/stage2c4/timeout-child.mjs"],
    expectedTimeout: true,
    evidence: "logs/test0.stderr.log",
    note: "SIGTERM to child process group; grandchild PID also gone.",
  },
  {
    id: "1",
    name: "Process startup",
    timeout: 15000,
    command: ["node", "scripts/stage2c4/01-startup.mjs"],
    trace: true,
    evidence: "logs/test1.trace.log",
    note: "Synchronous marker before application imports.",
  },
  {
    id: "2",
    name: "Module loading",
    timeout: 30000,
    command: [
      "./node_modules/.bin/tsx",
      "--tsconfig",
      "apps/web/tsconfig.json",
      "scripts/stage2c4/02-imports.ts",
    ],
    trace: true,
    evidence: "logs/test2.trace.log",
    note: "Sharp, Playwright, folk-motion, production renderer imported separately.",
  },
  {
    id: "3",
    name: "Decode paid images",
    timeout: 60000,
    command: ["./node_modules/.bin/tsx", "scripts/stage2c4/03-decode.ts"],
    trace: true,
    evidence: "smoke/03-decode.json",
    note: "OpenAI PNG and Gemini JPEG/PNG decoded; hashes and alpha recorded.",
  },
  {
    id: "4",
    name: "Extract persistent masks",
    timeout: 60000,
    command: ["./node_modules/.bin/tsx", "scripts/stage2c4/04-extract.ts"],
    trace: true,
    evidence: "smoke/04-extract.json",
    note: "Masks saved, reloaded, and applied for arm and leg candidates.",
  },
  {
    id: "5",
    name: "Render one sprite",
    timeout: 30000,
    command: ["./node_modules/.bin/tsx", "scripts/stage2c4/05-sprite.ts"],
    trace: true,
    evidence: "single-sprite-openai.png",
    note: "One paid upper-arm candidate rendered to PNG.",
  },
  {
    id: "6",
    name: "Production articulated assembly",
    timeout: 60000,
    command: ["./node_modules/.bin/tsx", "scripts/stage2c4/06-production-assembly.ts"],
    trace: true,
    evidence: "smoke/06-assembly.json",
    note: "Neutral, reach, elbow -45 and -90 through production FolkRenderer.",
  },
  {
    id: "7",
    name: "24-frame MP4",
    timeout: 120000,
    command: ["./node_modules/.bin/tsx", "scripts/stage2c4/07-video.ts"],
    trace: true,
    evidence: "smoke/07-video.json",
    note: "640x360, 24 FPS, 24 frames, FFprobe and full decode.",
  },
];

function lastLine(file) {
  if (!existsSync(file)) return "none";
  const lines = readFileSync(file, "utf8").trim().split("\n").filter(Boolean);
  return lines.at(-1) ?? "none";
}

const rows = [];
let stopped = false;
for (const test of tests) {
  if (stopped) {
    rows.push({ test: test.id, name: test.name, status: "NOT RUN" });
    continue;
  }
  const base = path.join(logs, `test${test.id}`);
  const trace = `${base}.trace.log`;
  const stdout = `${base}.stdout.log`;
  const stderr = `${base}.stderr.log`;
  const result = `${base}.result.json`;
  const args = [
    "scripts/stage2c4/supervise.mjs",
    "--timeout",
    String(test.timeout),
    "--stdout",
    stdout,
    "--stderr",
    stderr,
    "--result",
    result,
    "--",
    ...test.command,
  ];
  const child = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, ...(test.trace ? { STAGE2C4_TRACE: trace } : {}) },
    timeout: test.timeout + 20000,
  });
  const resultData = existsSync(result)
    ? JSON.parse(readFileSync(result, "utf8"))
    : { timedOut: false, exitCode: child.status, elapsedMs: null, startedAt: null };
  const pass = test.expectedTimeout
    ? resultData.timedOut === true && resultData.exitCode === null
    : resultData.exitCode === 0;
  const checkpoint = test.trace ? lastLine(trace) : lastLine(stdout);
  rows.push({
    test: test.id,
    name: test.name,
    status: pass ? "PASS" : "FAIL",
    started: resultData.startedAt,
    lastCheckpoint: checkpoint,
    durationMs: resultData.elapsedMs,
    exitCode: resultData.exitCode,
    timedOut: resultData.timedOut,
    evidence: test.evidence,
    note: test.note,
  });
  if (!pass) stopped = true;
}

const matrix = {
  generatedAt: new Date().toISOString(),
  platform: `${process.platform} ${process.arch}`,
  node: process.version,
  tests: rows,
};
writeFileSync(path.join(docs, "EXECUTION_MATRIX.json"), `${JSON.stringify(matrix, null, 2)}\n`);
const lines = [
  "# Stage 2C.4 Execution Matrix",
  "",
  "| Test | Started | Last checkpoint | Duration | Result | Evidence |",
  "|---|---|---|---:|---|---|",
  ...rows.map(
    (row) =>
      `| ${row.test}. ${row.name} | ${row.started ?? "—"} | ${row.lastCheckpoint ?? "—"} | ${row.durationMs ?? "—"} ms | **${row.status}** | ${row.evidence} |`,
  ),
  "",
  "The parent supervisor is `scripts/stage2c4/supervise.mjs`; it records child PID, wall-clock timeout, exit code, signal, stdout and stderr.",
  "The supervisor self-test expects a controlled timeout: the parent and grandchild PIDs must both be gone after SIGTERM.",
  "",
];
writeFileSync(path.join(docs, "EXECUTION_MATRIX.md"), lines.join("\n"));
console.log(JSON.stringify(matrix, null, 2));
if (rows.some((row) => row.status !== "PASS")) process.exit(1);

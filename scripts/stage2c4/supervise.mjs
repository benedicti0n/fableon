#!/usr/bin/env node
import { spawn } from "node:child_process";
import { closeSync, mkdirSync, openSync, writeFileSync, writeSync } from "node:fs";
import path from "node:path";

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1 || process.argv[index + 1] === undefined) return fallback;
  return process.argv[index + 1];
}

const separator = process.argv.indexOf("--");
if (separator === -1 || separator === process.argv.length - 1) {
  console.error(
    "Usage: supervise.mjs --timeout MS --stdout PATH --stderr PATH --result PATH -- command [args...]",
  );
  process.exit(2);
}
const timeoutMs = Number(arg("timeout", "60000"));
const stdoutPath = path.resolve(arg("stdout", "smoke.stdout.log"));
const stderrPath = path.resolve(arg("stderr", "smoke.stderr.log"));
const resultPath = path.resolve(arg("result", "smoke.result.json"));
const command = process.argv.slice(separator + 1);
const commandName = command[0];
const commandArgs = command.slice(1);
if (!commandName || !Number.isFinite(timeoutMs) || timeoutMs <= 0) {
  console.error("Invalid supervisor arguments.");
  process.exit(2);
}
for (const file of [stdoutPath, stderrPath, resultPath])
  mkdirSync(path.dirname(file), { recursive: true });

const startedAt = new Date();
const started = performance.now();
const stdoutFd = openSync(stdoutPath, "w");
const stderrFd = openSync(stderrPath, "w");
const child = spawn(commandName, commandArgs, {
  cwd: process.cwd(),
  env: process.env,
  detached: true,
  stdio: ["ignore", "pipe", "pipe"],
});
let timedOut = false;
let killTimer = null;
let settled = false;

child.stdout.on("data", (chunk) => writeSync(stdoutFd, chunk));
child.stderr.on("data", (chunk) => writeSync(stderrFd, chunk));

function killGroup(signal) {
  try {
    process.kill(-child.pid, signal);
  } catch {
    /* already gone */
  }
}

const timer = setTimeout(() => {
  timedOut = true;
  writeSync(
    stderrFd,
    `\n[supervisor] wall-clock timeout after ${timeoutMs} ms; sending SIGTERM to process group ${child.pid}\n`,
  );
  killGroup("SIGTERM");
  killTimer = setTimeout(() => {
    writeSync(stderrFd, `[supervisor] process group still alive; sending SIGKILL\n`);
    killGroup("SIGKILL");
  }, 2000);
}, timeoutMs);

function finish(code, signal) {
  if (settled) return;
  settled = true;
  clearTimeout(timer);
  if (killTimer) clearTimeout(killTimer);
  if (timedOut) {
    killGroup("SIGKILL");
    writeSync(stderrFd, `[supervisor] final status: TIMEOUT\n`);
  } else {
    writeSync(
      stderrFd,
      `[supervisor] final status: child exit ${code ?? "null"} signal ${signal ?? "none"}\n`,
    );
  }
  closeSync(stdoutFd);
  closeSync(stderrFd);
  const elapsedMs = Math.round(performance.now() - started);
  const result = {
    command: [commandName, ...commandArgs],
    pid: child.pid,
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    elapsedMs,
    timeoutMs,
    timedOut,
    exitCode: code,
    signal,
    stdout: path.relative(process.cwd(), stdoutPath),
    stderr: path.relative(process.cwd(), stderrPath),
  };
  writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result));
  process.exit(timedOut ? 124 : code === 0 ? 0 : (code ?? 1));
}

child.on("error", (error) => {
  writeSync(stderrFd, `[supervisor] spawn error: ${error.message}\n`);
  finish(127, null);
});
child.on("exit", (code, signal) => finish(code, signal));

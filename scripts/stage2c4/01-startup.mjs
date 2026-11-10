#!/usr/bin/env node
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
const trace = process.env.STAGE2C4_TRACE;
if (!trace) throw new Error("STAGE2C4_TRACE is required");
mkdirSync(path.dirname(trace), { recursive: true });
writeFileSync(trace, "");
const log = (message) => appendFileSync(trace, `${new Date().toISOString()} ${message}\n`);
log("process-start");
log(`pid ${process.pid} ppid ${process.ppid}`);
log(`cwd ${process.cwd()}`);
log(`node ${process.version} ${process.platform} ${process.arch}`);
console.log(
  JSON.stringify({
    marker: "startup-ok",
    pid: process.pid,
    cwd: process.cwd(),
    node: process.version,
    platform: process.platform,
    arch: process.arch,
  }),
);
log("process-done");

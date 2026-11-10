import { spawn } from "node:child_process";
const child = spawn(process.execPath, ["-e", "setInterval(()=>{},1000)"], {
  stdio: "ignore",
});
console.log(
  JSON.stringify({ parent: process.pid, grandchild: child.pid, marker: "timeout-child-started" }),
);
setInterval(() => {}, 1000);

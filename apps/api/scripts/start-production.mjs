import { spawn } from "node:child_process";

const port = process.env.PORT || "3001";
const hostname = process.env.HOSTNAME || "0.0.0.0";

const child = spawn(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["next", "start", "-p", port, "-H", hostname],
  {
    stdio: "inherit",
    shell: false,
    env: process.env,
  }
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

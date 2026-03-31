import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const port = process.env.PORT || "3001";
const hostname = process.env.APP_HOST || "0.0.0.0";
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.join(currentDir, "..");
const standaloneCandidates = [
  path.join(appDir, ".next", "standalone", "server.js"),
  path.join(appDir, ".next", "standalone", "apps", "api", "server.js"),
];
const standaloneServer = standaloneCandidates.find((candidate) => fs.existsSync(candidate));

if (!standaloneServer) {
  throw new Error("Không tìm thấy Next standalone server. Hãy chạy `npm run build` trong apps/api trước.");
}

const child = spawn(
  process.execPath,
  [standaloneServer],
  {
    stdio: "inherit",
    shell: false,
    cwd: appDir,
    env: {
      ...process.env,
      PORT: port,
      HOSTNAME: hostname,
    },
  }
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

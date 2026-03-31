import { spawn } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
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
  throw new Error("Khong tim thay Next standalone server. Hay chay `npm run build` trong apps/api truoc.");
}

async function copyDirIfExists(sourceDir, targetDir) {
  if (!fs.existsSync(sourceDir)) {
    return;
  }
  await fsp.mkdir(path.dirname(targetDir), { recursive: true });
  await fsp.cp(sourceDir, targetDir, { recursive: true, force: true });
}

async function prepareStandaloneAssets() {
  const standaloneAppDir = path.dirname(standaloneServer);
  const standaloneRoot = standaloneAppDir.endsWith(path.join("apps", "api"))
    ? path.dirname(path.dirname(standaloneAppDir))
    : path.dirname(standaloneAppDir);

  await copyDirIfExists(path.join(appDir, "public"), path.join(standaloneAppDir, "public"));
  await copyDirIfExists(path.join(appDir, ".next", "static"), path.join(standaloneRoot, ".next", "static"));
}

await prepareStandaloneAssets();

const child = spawn(process.execPath, [standaloneServer], {
  stdio: "inherit",
  shell: false,
  cwd: appDir,
  env: {
    ...process.env,
    PORT: port,
    HOSTNAME: hostname,
  },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

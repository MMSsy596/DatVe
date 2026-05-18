import { spawn, spawnSync } from "node:child_process";

const webOnly = process.argv.includes("--web");
const portsToFree = webOnly ? [3000, 3001] : [3000, 3001, 8081];

const services = [
  { name: "API", args: ["run", "dev", "--workspace", "api"] },
  { name: "Admin", args: ["run", "dev", "--workspace", "admin"] },
  ...(
    webOnly
      ? []
      : [{ name: "User", args: ["run", "web", "--workspace", "mobile"] }]
  ),
];

const children = new Set();
let shuttingDown = false;

function npmSpawnArgs(args) {
  if (process.platform !== "win32") {
    return { command: "npm", args };
  }

  return {
    command: process.env.ComSpec ?? "cmd.exe",
    args: ["/d", "/s", "/c", ["npm", ...args].join(" ")],
  };
}

function freeLocalPorts(ports) {
  if (process.platform !== "win32") return;

  const portList = ports.join(",");
  spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      `$ports=@(${portList}); Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $ports -contains $_.LocalPort } | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }`,
    ],
    { stdio: "ignore" }
  );
}

function prefixOutput(serviceName, stream) {
  let pending = "";
  return (chunk) => {
    pending += chunk.toString();
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() ?? "";
    for (const line of lines) {
      if (line.trim()) {
        stream.write(`[${serviceName}] ${line}\n`);
      }
    }
  };
}

function stopAll(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log("Đang dừng các tiến trình local...");
  for (const child of children) {
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore" });
    } else {
      child.kill("SIGTERM");
    }
  }
  setTimeout(() => process.exit(exitCode), 600);
}

console.log(
  webOnly
    ? "Đang chạy local: API và Admin."
    : "Đang chạy local: API, Admin và User Web."
);
console.log(`Đang dọn port local: ${portsToFree.join(", ")}.`);
freeLocalPorts(portsToFree);

for (const service of services) {
  const npmProcess = npmSpawnArgs(service.args);
  const child = spawn(npmProcess.command, npmProcess.args, {
    cwd: process.cwd(),
    env: process.env,
    windowsHide: false,
  });

  children.add(child);
  child.stdout.on("data", prefixOutput(service.name, process.stdout));
  child.stderr.on("data", prefixOutput(service.name, process.stderr));

  child.on("exit", (code, signal) => {
    children.delete(child);
    if (!shuttingDown && code !== 0) {
      console.error(`${service.name} đã dừng bất thường (${signal ?? code}).`);
      stopAll(code ?? 1);
    }
  });
}

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));

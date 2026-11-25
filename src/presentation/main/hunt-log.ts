import { execSync } from "child_process";
import { appendFileSync, existsSync, writeFileSync } from "fs";
import path from "path";

export function createHuntLogger(userData: string): (message: string) => void {
  useUtf8Console();
  const file = path.join(userData, "pengu-hunt.log");
  if (!existsSync(file)) writeFileSync(file, "\uFEFF", "utf8");
  write("감시 시작", file);
  return (message: string) => write(message, file);
}

function write(message: string, file: string): void {
  const line = `[pengu] ${message}`;
  try {
    process.stdout.write(`${line}\n`);
  } catch {
    return;
  }
  try {
    appendFileSync(file, `${new Date().toISOString()} ${message}\n`, "utf8");
  } catch {
    return;
  }
}

function useUtf8Console(): void {
  if (process.platform !== "win32") return;
  try {
    execSync("chcp 65001", { stdio: "ignore", windowsHide: true });
  } catch {
    return;
  }
}

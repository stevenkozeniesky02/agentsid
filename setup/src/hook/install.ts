import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";

const HOOK_INSTALL_DIR = path.join(os.homedir(), ".agentsid", "hooks");
const HOOK_FILENAME = "post-tool.sh";

/**
 * Return the path where the hook will be installed.
 */
export function getHookPath(): string {
  return path.join(HOOK_INSTALL_DIR, HOOK_FILENAME);
}

/**
 * Copy post-tool.sh to ~/.agentsid/hooks/post-tool.sh and chmod 755.
 * Creates parent directories as needed.
 *
 * Returns the installed path.
 */
export async function installHook(): Promise<string> {
  const sourceDir = path.dirname(fileURLToPath(import.meta.url));
  const sourcePath = path.join(sourceDir, HOOK_FILENAME);

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Hook source file not found: ${sourcePath}`);
  }

  const destPath = getHookPath();
  const destDir = path.dirname(destPath);

  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(sourcePath, destPath);
  fs.chmodSync(destPath, 0o755);

  return destPath;
}

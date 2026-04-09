import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";

interface StoredConfig {
  readonly api_key: string;
  readonly api_url: string;
}

const CONFIG_PATH = join(homedir(), ".agentsid", "config.json");

export function getStoredConfig(): StoredConfig | null {
  const envKey = process.env["AGENTSID_API_KEY"];
  if (envKey) {
    return {
      api_key: envKey,
      api_url: process.env["AGENTSID_API_URL"] ?? "https://api.agentsid.dev",
    };
  }
  if (!existsSync(CONFIG_PATH)) return null;
  try {
    const raw = JSON.parse(readFileSync(CONFIG_PATH, "utf-8")) as Record<string, unknown>;
    if (typeof raw["api_key"] === "string") {
      return {
        api_key: raw["api_key"],
        api_url: typeof raw["api_url"] === "string" ? raw["api_url"] : "https://api.agentsid.dev",
      };
    }
  } catch {
    // ignore parse errors
  }
  return null;
}

export function storeConfig(
  apiKey: string,
  apiUrl: string = "https://api.agentsid.dev",
): void {
  const dir = dirname(CONFIG_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(
    CONFIG_PATH,
    JSON.stringify({ api_key: apiKey, api_url: apiUrl }, null, 2) + "\n",
    "utf-8",
  );
}

export async function validateKey(
  apiKey: string,
  apiUrl: string = "https://api.agentsid.dev",
): Promise<boolean> {
  try {
    const resp = await fetch(`${apiUrl}/api/v1/agents/?limit=1`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    return resp.ok;
  } catch {
    return false;
  }
}

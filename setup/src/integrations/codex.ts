import type { PlatformIntegration, IntegrationConfig } from "./types.js";
import os from "os";
import path from "path";

export const codexIntegration: PlatformIntegration = {
  name: "codex",
  label: "Codex",
  configFormat: "toml",
  instructions:
    "AgentsID will be registered as an MCP server in your Codex config. " +
    "Restart Codex after setup to activate the guard.",

  configPath(scope) {
    if (scope === "global") {
      return path.join(os.homedir(), ".codex", "config.toml");
    }
    return path.join(".codex", "config.toml");
  },

  generateConfig(config: IntegrationConfig) {
    return {
      mcp_servers: {
        agentsid: {
          command: "npx",
          args: ["-y", "@agentsid/guard"],
          env: {
            AGENTSID_PROJECT_KEY: config.apiKey,
            AGENTSID_AGENT_TOKEN: config.agentToken,
          },
        },
      },
    };
  },
};

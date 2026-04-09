import type { PlatformIntegration, IntegrationConfig } from "./types.js";
import os from "os";
import path from "path";

export const cursorIntegration: PlatformIntegration = {
  name: "cursor",
  label: "Cursor",
  configFormat: "json",
  instructions:
    "AgentsID will be registered as an MCP server in your Cursor settings. " +
    "Restart Cursor after setup to activate the guard.",

  configPath(scope) {
    if (scope === "global") {
      return path.join(os.homedir(), ".cursor", "mcp.json");
    }
    return path.join(".cursor", "mcp.json");
  },

  generateConfig(config: IntegrationConfig) {
    return {
      mcpServers: {
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

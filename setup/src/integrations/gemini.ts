import type { PlatformIntegration, IntegrationConfig } from "./types.js";
import os from "os";
import path from "path";

export const geminiIntegration: PlatformIntegration = {
  name: "gemini",
  label: "Gemini",
  configFormat: "json",
  instructions:
    "AgentsID will be registered as an MCP server in your Gemini settings. " +
    "Restart Gemini after setup to activate the guard.",

  configPath(scope) {
    if (scope === "global") {
      return path.join(os.homedir(), ".gemini", "settings.json");
    }
    return path.join(".gemini", "settings.json");
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

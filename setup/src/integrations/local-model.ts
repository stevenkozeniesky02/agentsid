import type { PlatformIntegration, IntegrationConfig } from "./types.js";

const PROXY_PORT = 3847;

export const localModelIntegration: PlatformIntegration = {
  name: "local-model",
  label: "Local Model",
  configFormat: "json",
  instructions:
    "No config file is written for local models. Start the AgentsID proxy with the " +
    "command below, then point your local model client at http://localhost:" +
    PROXY_PORT +
    ". Set the env vars shown in the generated config.",

  configPath(_scope) {
    return "";
  },

  generateConfig(config: IntegrationConfig) {
    return {
      command: `npx -y @agentsid/proxy --port ${PROXY_PORT}`,
      env: {
        AGENTSID_PROJECT_KEY: config.apiKey,
        AGENTSID_AGENT_TOKEN: config.agentToken,
      },
    };
  },
};

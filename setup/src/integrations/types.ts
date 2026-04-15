export interface IntegrationConfig {
  readonly apiKey: string;
  readonly agentToken: string;
  readonly scope: "global" | "project";
  readonly agentId?: string;
  readonly apiUrl?: string;
}

export interface PlatformIntegration {
  readonly name: string;
  readonly label: string;
  readonly configPath: (scope: "global" | "project") => string;
  readonly generateConfig: (config: IntegrationConfig) => Record<string, unknown>;
  readonly configFormat: "json" | "toml";
  readonly instructions: string;
}

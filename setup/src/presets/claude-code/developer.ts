import type { PolicyPreset, PolicyRule, PolicyCategory } from "../types.js";

// Claude Code tool names: Bash, Read, Write, Edit, Glob, Grep,
// Agent, WebFetch, WebSearch, NotebookEdit, AskUserQuestion

const ALLOW_ALL: PolicyRule = {
  toolPattern: "*",
  action: "allow",
  priority: 0,
};

// Deny specific write/destructive tools — reads always pass through via allow-all
const DENY_WRITE: PolicyRule = {
  toolPattern: "Write",
  action: "deny",
  priority: 100,
};

const DENY_EDIT: PolicyRule = {
  toolPattern: "Edit",
  action: "deny",
  priority: 100,
};

const DENY_BASH: PolicyRule = {
  toolPattern: "Bash",
  action: "deny",
  priority: 100,
};

const DENY_AGENT: PolicyRule = {
  toolPattern: "Agent",
  action: "deny",
  priority: 100,
};

const DENY_WEBFETCH: PolicyRule = {
  toolPattern: "WebFetch",
  action: "deny",
  priority: 90,
};

const DENY_WEBSEARCH: PolicyRule = {
  toolPattern: "WebSearch",
  action: "deny",
  priority: 90,
};

const DENY_NOTEBOOK: PolicyRule = {
  toolPattern: "NotebookEdit",
  action: "deny",
  priority: 90,
};

const categories: readonly PolicyCategory[] = [
  {
    name: "shell",
    label: "Shell Commands",
    toggles: [
      {
        id: "shell.block",
        label: "Block shell commands",
        description: "Prevents agents from running any shell commands (Bash tool)",
        defaultOn: false,
        rules: [DENY_BASH],
      },
    ],
  },
  {
    name: "files",
    label: "File Modifications",
    toggles: [
      {
        id: "files.write",
        label: "Block file creation",
        description: "Prevents agents from creating new files (Write tool)",
        defaultOn: false,
        rules: [DENY_WRITE],
      },
      {
        id: "files.edit",
        label: "Block file editing",
        description: "Prevents agents from modifying existing files (Edit tool)",
        defaultOn: false,
        rules: [DENY_EDIT],
      },
    ],
  },
  {
    name: "network",
    label: "Network Access",
    toggles: [
      {
        id: "network.fetch",
        label: "Block web fetching",
        description: "Prevents agents from fetching web content (WebFetch tool)",
        defaultOn: false,
        rules: [DENY_WEBFETCH],
      },
      {
        id: "network.search",
        label: "Block web search",
        description: "Prevents agents from searching the web (WebSearch tool)",
        defaultOn: false,
        rules: [DENY_WEBSEARCH],
      },
    ],
  },
  {
    name: "agents",
    label: "Sub-Agents",
    toggles: [
      {
        id: "agents.block",
        label: "Block sub-agent spawning",
        description: "Prevents agents from launching sub-agents (Agent tool)",
        defaultOn: false,
        rules: [DENY_AGENT],
      },
    ],
  },
  {
    name: "notebooks",
    label: "Notebooks",
    toggles: [
      {
        id: "notebooks.block",
        label: "Block notebook editing",
        description: "Prevents agents from modifying Jupyter notebooks",
        defaultOn: false,
        rules: [DENY_NOTEBOOK],
      },
    ],
  },
];

export const claudeCodeDeveloperPreset: PolicyPreset = {
  name: "Developer",
  description:
    "Optimized for developer productivity. All tools allowed by default. Toggle individual restrictions as needed — block shell, file writes, web access, or sub-agents.",
  rules: [ALLOW_ALL],
  categories,
};

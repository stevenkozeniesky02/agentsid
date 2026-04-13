import type { PolicyPreset, PolicyRule, PolicyCategory } from "../types.js";

// Security Team: block all writes and shell by default, allow reads.
// Toggle to re-enable specific capabilities as needed.

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

const ALLOW_ALL: PolicyRule = {
  toolPattern: "*",
  action: "allow",
  priority: 0,
};

const categories: readonly PolicyCategory[] = [
  {
    name: "shell",
    label: "Shell Commands",
    toggles: [
      {
        id: "shell.block",
        label: "Block shell commands",
        description: "Prevents all shell command execution",
        defaultOn: true,
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
        description: "Prevents creating new files",
        defaultOn: true,
        rules: [DENY_WRITE],
      },
      {
        id: "files.edit",
        label: "Block file editing",
        description: "Prevents modifying existing files",
        defaultOn: true,
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
        description: "Prevents fetching web content",
        defaultOn: true,
        rules: [DENY_WEBFETCH],
      },
      {
        id: "network.search",
        label: "Block web search",
        description: "Prevents web searching",
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
        description: "Prevents launching sub-agents",
        defaultOn: true,
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
        description: "Prevents modifying Jupyter notebooks",
        defaultOn: true,
        rules: [DENY_NOTEBOOK],
      },
    ],
  },
];

export const claudeCodeSecurityTeamPreset: PolicyPreset = {
  name: "Security Team",
  description:
    "Read-only by default. Blocks shell, file writes, file edits, web fetching, and sub-agents. Read, Glob, and Grep remain available for code review and analysis.",
  rules: [
    DENY_WRITE,
    DENY_EDIT,
    DENY_BASH,
    DENY_AGENT,
    DENY_WEBFETCH,
    DENY_NOTEBOOK,
    ALLOW_ALL,
  ],
  categories,
};

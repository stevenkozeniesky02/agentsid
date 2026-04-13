import type { PolicyPreset, PolicyRule, PolicyCategory } from "../types.js";

// Lockdown: deny every tool that can modify state or reach the network.
// Only Read, Glob, and Grep pass through.
//
// NOTE: deny-first engine evaluates ALL deny rules before any allow rules,
// so we cannot use a wildcard deny + specific allows. Instead we explicitly
// deny every mutable tool and allow-all for the rest (reads).

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
  priority: 100,
};

const DENY_WEBSEARCH: PolicyRule = {
  toolPattern: "WebSearch",
  action: "deny",
  priority: 100,
};

const DENY_NOTEBOOK: PolicyRule = {
  toolPattern: "NotebookEdit",
  action: "deny",
  priority: 100,
};

const DENY_ASK: PolicyRule = {
  toolPattern: "AskUserQuestion",
  action: "deny",
  priority: 100,
};

const ALLOW_ALL: PolicyRule = {
  toolPattern: "*",
  action: "allow",
  priority: 0,
};

const categories: readonly PolicyCategory[] = [
  {
    name: "reads",
    label: "Read Access",
    toggles: [
      {
        id: "reads.allow",
        label: "Allow read-only tools",
        description: "Read, Glob, and Grep remain available",
        defaultOn: true,
        rules: [],
      },
    ],
  },
  {
    name: "network",
    label: "Network",
    toggles: [
      {
        id: "network.search",
        label: "Allow web search",
        description: "Re-enable WebSearch (removes the deny rule)",
        defaultOn: false,
        rules: [],
      },
    ],
  },
];

export const claudeCodeLockdownPreset: PolicyPreset = {
  name: "Lockdown",
  description:
    "Maximum restriction. Every tool that can modify files, run commands, spawn agents, or access the network is blocked. Only Read, Glob, and Grep are allowed.",
  rules: [
    DENY_WRITE,
    DENY_EDIT,
    DENY_BASH,
    DENY_AGENT,
    DENY_WEBFETCH,
    DENY_WEBSEARCH,
    DENY_NOTEBOOK,
    DENY_ASK,
    ALLOW_ALL,
  ],
  categories,
};

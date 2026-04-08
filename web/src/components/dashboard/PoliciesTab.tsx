// --- Policies Tab ---
// Project-wide view of permission rules across all agents

import { useState, useEffect, useCallback } from "react";
import type { Agent, PermissionRule } from "./types";
import { apiFetch } from "./utils";
import { PermissionEditor } from "./PermissionEditor";

interface PoliciesTabProps {
  readonly apiKey: string;
  readonly agents: readonly Agent[];
}

interface AgentRules {
  readonly agentId: string;
  readonly agentName: string;
  readonly agentStatus: string;
  readonly rules: readonly PermissionRule[];
}

function PoliciesTab({ apiKey, agents }: PoliciesTabProps) {
  const [agentRules, setAgentRules] = useState<readonly AgentRules[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  const loadAllRules = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        agents.map(async (agent) => {
          try {
            const data = await apiFetch<{ rules: readonly PermissionRule[] }>(
              `/agents/${agent.id}/permissions`,
              apiKey,
            );
            return {
              agentId: agent.id,
              agentName: agent.name,
              agentStatus: agent.status,
              rules: data.rules ?? [],
            };
          } catch {
            return {
              agentId: agent.id,
              agentName: agent.name,
              agentStatus: agent.status,
              rules: [],
            };
          }
        }),
      );
      setAgentRules(results);
    } finally {
      setLoading(false);
    }
  }, [agents, apiKey]);

  useEffect(() => {
    loadAllRules();
  }, [loadAllRules]);

  const totalRules = agentRules.reduce((sum, ar) => sum + ar.rules.length, 0);
  const denyRules = agentRules.reduce(
    (sum, ar) => sum + ar.rules.filter((r) => r.action === "deny").length,
    0,
  );
  const allowRules = totalRules - denyRules;
  const agentsWithRules = agentRules.filter((ar) => ar.rules.length > 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Policies</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Deny-first permission rules across all agents
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Rules" value={totalRules} />
        <StatCard label="Deny Rules" value={denyRules} color="text-red-400" />
        <StatCard label="Allow Rules" value={allowRules} color="text-green-400" />
        <StatCard label="Agents with Policies" value={`${agentsWithRules}/${agents.length}`} />
      </div>

      {/* Deny-first explainer */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 text-xs text-muted-foreground">
        <span className="font-semibold text-primary">Deny-first evaluation:</span>{" "}
        Deny rules are checked first. If no deny rule matches, allow rules are checked.
        If no rule matches at all, the default action is <span className="font-semibold text-red-400">deny</span>.
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Loading policies...
        </div>
      )}

      {/* Agent rule groups */}
      {!loading && agentRules.map((ar) => (
        <div
          key={ar.agentId}
          className="bg-card border border-border rounded-xl overflow-hidden"
        >
          {/* Agent header */}
          <button
            onClick={() =>
              setExpandedAgent((prev) =>
                prev === ar.agentId ? null : ar.agentId,
              )
            }
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-primary/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span
                className={`w-2 h-2 rounded-full ${
                  ar.agentStatus === "active"
                    ? "bg-green-400"
                    : "bg-muted-foreground/30"
                }`}
              />
              <span className="font-medium text-sm text-foreground">
                {ar.agentName}
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                {ar.agentId}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {ar.rules.length} rule{ar.rules.length !== 1 ? "s" : ""}
              </span>
              <span
                className={`text-muted-foreground transition-transform ${
                  expandedAgent === ar.agentId ? "rotate-180" : ""
                }`}
              >
                {"\u25BE"}
              </span>
            </div>
          </button>

          {/* Expanded: rule list + editor */}
          {expandedAgent === ar.agentId && (
            <div className="border-t border-border px-4 py-4">
              {ar.rules.length === 0 && (
                <p className="text-xs text-muted-foreground mb-3">
                  No rules defined. All tool calls will be denied by default.
                </p>
              )}

              {/* Rule summary table */}
              {ar.rules.length > 0 && (
                <div className="mb-4 space-y-1.5">
                  {ar.rules.map((rule, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg bg-background border border-border text-xs"
                    >
                      <span
                        className={`px-2 py-0.5 rounded font-semibold uppercase text-[10px] ${
                          rule.action === "deny"
                            ? "bg-red-500/10 text-red-400 border border-red-500/20"
                            : "bg-green-500/10 text-green-400 border border-green-500/20"
                        }`}
                      >
                        {rule.action}
                      </span>
                      <span className="font-mono text-foreground">
                        {rule.tool_pattern}
                      </span>
                      {rule.priority !== undefined && rule.priority > 0 && (
                        <span className="text-muted-foreground">
                          priority: {rule.priority}
                        </span>
                      )}
                      {rule.requires_approval && (
                        <span className="text-amber-400 text-[10px]">
                          approval required
                        </span>
                      )}
                      {rule.schedule && (
                        <span className="text-muted-foreground">scheduled</span>
                      )}
                      {rule.rate_limit && (
                        <span className="text-muted-foreground">
                          rate: {rule.rate_limit.max}/{rule.rate_limit.per}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Inline editor */}
              <PermissionEditor
                agentId={ar.agentId}
                apiKey={apiKey}
                initialRules={ar.rules}
                onSaved={loadAllRules}
              />
            </div>
          )}
        </div>
      ))}

      {/* Empty state */}
      {!loading && agents.length === 0 && (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No agents registered yet. Register an agent to start defining policies.
        </div>
      )}
    </div>
  );
}

// --- Stat Card ---

interface StatCardProps {
  readonly label: string;
  readonly value: string | number;
  readonly color?: string;
}

function StatCard({ label, value, color }: StatCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3">
      <div className="text-[11px] text-muted-foreground uppercase tracking-wider">
        {label}
      </div>
      <div className={`text-2xl font-bold mt-1 ${color ?? "text-foreground"}`}>
        {value}
      </div>
    </div>
  );
}

export { PoliciesTab };

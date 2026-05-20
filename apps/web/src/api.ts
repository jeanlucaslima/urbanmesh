const AGENT_URL =
  (import.meta as any).env?.VITE_AGENT_URL || "http://localhost:5005";

export type ActorRole =
  | "AI_ASSISTANT"
  | "SUPPORT_AGENT"
  | "FINANCE_AGENT"
  | "ADMIN";

export interface PolicyDecision {
  field: string;
  decision: "ALLOW" | "DENY";
  reason: string;
  actorRole: string;
}

export interface ExecutionMetadata {
  servicesTouched: string[];
  blockedFields: string[];
  policyDecisions: PolicyDecision[];
}

export interface AgentRunResponse {
  answer: string;
  query: string;
  variables: { id: string; actorRole: ActorRole };
  data: unknown;
  executionMetadata: ExecutionMetadata;
}

export interface AgentErrorResponse {
  error: string;
  message: string;
}

export async function runAgent(
  task: string,
  actorRole: ActorRole
): Promise<AgentRunResponse> {
  const res = await fetch(`${AGENT_URL}/run`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ task, actorRole }),
  });
  const body = (await res.json()) as AgentRunResponse | AgentErrorResponse;
  if (!res.ok) {
    const err = body as AgentErrorResponse;
    throw new Error(err.message || `agent returned HTTP ${res.status}`);
  }
  return body as AgentRunResponse;
}

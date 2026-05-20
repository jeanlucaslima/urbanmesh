const AGENT_URL =
  (import.meta as any).env?.VITE_AGENT_URL || "http://localhost:5005";

export type ActorRole =
  | "PUBLIC_AI_ASSISTANT"
  | "CIVIC_OPERATOR"
  | "PERMIT_ANALYST"
  | "CITY_ADMIN";

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

export interface ValidationError {
  code: string;
  message: string;
}

export interface AgentRunResponse {
  answer: string | null;
  query: string | null;
  variables: { id: string; actorRole: ActorRole } | null;
  data: unknown | null;
  executionMetadata: ExecutionMetadata | null;
  validationError: ValidationError | null;
  graphQLErrors: unknown[] | null;
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
  const body = (await res.json()) as AgentRunResponse;
  if (!res.ok && !body.validationError && !body.graphQLErrors) {
    throw new Error(`agent returned HTTP ${res.status}`);
  }
  return body;
}

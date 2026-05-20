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

export interface ValidationError {
  code: string;
  message: string;
}

// Stable envelope returned by the agent for both success and error paths.
// Success: validationError and graphQLErrors are null; the rest are filled.
// Validation error: only validationError is non-null.
// Graph error: graphQLErrors and the planned query/variables are filled.
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
  // The envelope shape is stable across HTTP statuses; parse it either way.
  const body = (await res.json()) as AgentRunResponse;
  if (!res.ok && !body.validationError && !body.graphQLErrors) {
    throw new Error(`agent returned HTTP ${res.status}`);
  }
  return body;
}

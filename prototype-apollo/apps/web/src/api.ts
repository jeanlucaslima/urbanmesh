const AGENT_API_URL =
  (import.meta as any).env?.VITE_AGENT_API_URL || "http://localhost:4000";

export type ActorRole =
  | "AI_ASSISTANT"
  | "SUPPORT_AGENT"
  | "FINANCE_AGENT"
  | "ADMIN";

export interface RunRequest {
  task: string;
  customerId?: string;
  actorRole: ActorRole;
}

export interface BlockedField {
  path: string;
  reason: string;
}

export interface PolicyDecision {
  resource: string;
  field: string;
  action: string;
  allowed: boolean;
  reason: string;
}

export interface Execution {
  servicesTouched: string[];
  blockedFields: BlockedField[];
  policyDecisions: PolicyDecision[];
}

export interface RunResponse {
  answer: string;
  graphqlQuery: string;
  graphqlVariables: Record<string, unknown>;
  data: any;
  execution: Execution;
}

export async function runAgent(req: RunRequest): Promise<RunResponse> {
  const res = await fetch(`${AGENT_API_URL}/run`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Request failed: ${res.status} ${text}`);
  }
  return (await res.json()) as RunResponse;
}

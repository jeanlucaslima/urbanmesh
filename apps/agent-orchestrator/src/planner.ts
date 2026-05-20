export type ActorRole =
  | "AI_ASSISTANT"
  | "SUPPORT_AGENT"
  | "FINANCE_AGENT"
  | "ADMIN";

const KNOWN_ROLES: ActorRole[] = [
  "AI_ASSISTANT",
  "SUPPORT_AGENT",
  "FINANCE_AGENT",
  "ADMIN",
];

// Case-insensitive match of customer IDs like C-1027 or c-1027.
const CUSTOMER_ID_PATTERN = /\bC-\d{3,5}\b/gi;

export const CUSTOMER_CONTEXT_QUERY = `query CustomerContext($id: ID!, $actorRole: ActorRole!) {
  customer(id: $id, actorRole: $actorRole) {
    id
    name
    status
    riskLevel
    billing {
      balance
      overdueInvoices
      paymentRisk
    }
    support {
      openTickets
      latestIssue
      escalationStatus
    }
    usage {
      activeUsers
      monthlyEvents
      usageTrend
    }
  }
}`;

export interface PlannedRequest {
  customerId: string;
  actorRole: ActorRole;
  query: string;
  variables: { id: string; actorRole: ActorRole };
}

export class PlannerError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export function plan(task: string, actorRole: unknown): PlannedRequest {
  if (typeof task !== "string" || task.trim().length === 0) {
    throw new PlannerError("missing_task", "Task is required.");
  }
  if (
    typeof actorRole !== "string" ||
    !KNOWN_ROLES.includes(actorRole as ActorRole)
  ) {
    throw new PlannerError(
      "invalid_actor_role",
      `actorRole must be one of: ${KNOWN_ROLES.join(", ")}.`
    );
  }
  const matches = task.match(CUSTOMER_ID_PATTERN);
  if (!matches || matches.length === 0) {
    throw new PlannerError(
      "missing_customer_id",
      "Please include a customer ID like C-1027."
    );
  }
  const ids = Array.from(new Set(matches.map((m) => m.toUpperCase())));
  if (ids.length > 1) {
    throw new PlannerError(
      "multiple_customer_ids",
      `Please include exactly one customer ID; found: ${ids.join(", ")}.`
    );
  }
  const customerId = ids[0];
  return {
    customerId,
    actorRole: actorRole as ActorRole,
    query: CUSTOMER_CONTEXT_QUERY,
    variables: { id: customerId, actorRole: actorRole as ActorRole },
  };
}

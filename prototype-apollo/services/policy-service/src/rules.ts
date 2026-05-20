export type ActorRole =
  | "SUPPORT_AGENT"
  | "FINANCE_AGENT"
  | "ADMIN"
  | "AI_ASSISTANT";

export interface PolicyInput {
  actorRole: ActorRole;
  resource: string;
  field: string;
  action: string;
}

export interface PolicyResult {
  allowed: boolean;
  reason: string;
}

const SENSITIVE_BILLING = new Set([
  "paymentMethodLast4",
  "internalFinanceNotes",
  "riskScore",
]);

export function check(input: PolicyInput): PolicyResult {
  const { actorRole, resource, field } = input;

  if (actorRole === "ADMIN") {
    return { allowed: true, reason: "Admins have full access." };
  }

  if (resource === "BillingDetails" && SENSITIVE_BILLING.has(field)) {
    if (actorRole === "FINANCE_AGENT") {
      return {
        allowed: true,
        reason: "Finance agents may read sensitive billing fields.",
      };
    }
    if (actorRole === "SUPPORT_AGENT") {
      return {
        allowed: false,
        reason: "Support agents cannot access sensitive billing fields.",
      };
    }
    if (actorRole === "AI_ASSISTANT") {
      return {
        allowed: false,
        reason: "AI assistants cannot access sensitive billing fields.",
      };
    }
  }

  if (
    resource === "SupportTicket" &&
    field === "summary" &&
    actorRole === "FINANCE_AGENT"
  ) {
    return {
      allowed: false,
      reason: "Finance agents do not receive full support ticket summaries.",
    };
  }

  return { allowed: true, reason: "Allowed by default for this role." };
}

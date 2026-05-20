export type ActorRole =
  | "AI_ASSISTANT"
  | "SUPPORT_AGENT"
  | "FINANCE_AGENT"
  | "ADMIN";

export interface PolicyInput {
  actorRole: ActorRole;
  field: string;
  customerId?: string;
}

export interface PolicyResult {
  allowed: boolean;
  field: string;
  actorRole: ActorRole;
  reason: string;
}

// Deny rules per role. ADMIN is unrestricted.
// Fields not listed in any role-specific denial are allowed by default.
const DENIES: Record<Exclude<ActorRole, "ADMIN">, Record<string, string>> = {
  AI_ASSISTANT: {
    "Customer.riskLevel":
      "AI assistants cannot access customer risk level.",
    "BillingAccount.balance":
      "AI assistants cannot access billing balance.",
    "BillingAccount.paymentRisk":
      "AI assistants cannot access billing payment risk.",
    "SupportSummary.escalationStatus":
      "AI assistants cannot access support escalation status.",
  },
  SUPPORT_AGENT: {
    "BillingAccount.balance":
      "Support agents cannot access billing balance.",
    "BillingAccount.paymentRisk":
      "Support agents cannot access billing payment risk.",
  },
  FINANCE_AGENT: {
    "SupportSummary.escalationStatus":
      "Finance agents cannot access support escalation status.",
  },
};

export function check(input: PolicyInput): PolicyResult {
  const { actorRole, field } = input;

  if (actorRole === "ADMIN") {
    return {
      allowed: true,
      field,
      actorRole,
      reason: "Admins have full access.",
    };
  }

  const denials = DENIES[actorRole as Exclude<ActorRole, "ADMIN">];
  if (denials && field in denials) {
    return {
      allowed: false,
      field,
      actorRole,
      reason: denials[field],
    };
  }

  return {
    allowed: true,
    field,
    actorRole,
    reason: `Allowed by default for ${actorRole}.`,
  };
}

export type ActorRole =
  | "PUBLIC_AI_ASSISTANT"
  | "CIVIC_OPERATOR"
  | "PERMIT_ANALYST"
  | "CITY_ADMIN";

export interface PolicyInput {
  actorRole: ActorRole;
  field: string;
  blockId?: string;
}

export interface PolicyResult {
  allowed: boolean;
  field: string;
  actorRole: ActorRole;
  reason: string;
}

// Deny rules per role. CITY_ADMIN is unrestricted.
// Fields not listed in any role-specific denial are allowed by default.
const DENIES: Record<Exclude<ActorRole, "CITY_ADMIN">, Record<string, string>> = {
  PUBLIC_AI_ASSISTANT: {
    "CityBlock.planningRisk":
      "Public AI assistants cannot access internal planning risk.",
    "PermitSummary.estimatedProjectValue":
      "Public AI assistants cannot access estimated project value.",
    "PermitSummary.complianceRisk":
      "Public AI assistants cannot access permit compliance risk.",
    "CivicCaseSummary.escalationStatus":
      "Public AI assistants cannot access civic escalation status.",
  },
  CIVIC_OPERATOR: {
    "PermitSummary.estimatedProjectValue":
      "Civic operators cannot access estimated project value.",
    "PermitSummary.complianceRisk":
      "Civic operators cannot access permit compliance risk.",
  },
  PERMIT_ANALYST: {
    "CivicCaseSummary.escalationStatus":
      "Permit analysts cannot access civic escalation status.",
  },
};

export function check(input: PolicyInput): PolicyResult {
  const { actorRole, field } = input;

  if (actorRole === "CITY_ADMIN") {
    return {
      allowed: true,
      field,
      actorRole,
      reason: "City admins have full access.",
    };
  }

  const denials = DENIES[actorRole as Exclude<ActorRole, "CITY_ADMIN">];
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

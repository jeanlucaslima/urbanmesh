export type ActorRole =
  | "PUBLIC_AI_ASSISTANT"
  | "CIVIC_OPERATOR"
  | "PERMIT_ANALYST"
  | "CITY_ADMIN";

const KNOWN_ROLES: ActorRole[] = [
  "PUBLIC_AI_ASSISTANT",
  "CIVIC_OPERATOR",
  "PERMIT_ANALYST",
  "CITY_ADMIN",
];

const BLOCK_ID_PATTERN = /\bSF-\d{3,5}\b/gi;

// Friendly place names that resolve to a known block ID. Match the longest
// alias first so "Inner Sunset residential block" beats "Inner Sunset".
const PLACE_ALIASES: Array<{ pattern: RegExp; id: string }> = [
  { pattern: /16th\s*&\s*mission/i,             id: "SF-1027" },
  { pattern: /mission\s+district/i,             id: "SF-1027" },
  { pattern: /inner\s+sunset[^.,]*/i,           id: "SF-1001" },
  { pattern: /civic\s+center[^.,]*/i,           id: "SF-2044" },
];

export const URBAN_CONTEXT_QUERY = `query UrbanContext($id: ID!, $actorRole: ActorRole!) {
  block(id: $id, actorRole: $actorRole) {
    id
    name
    neighborhood
    planningStatus
    planningRisk
    zoning {
      district
      allowedUses
      heightLimit
      specialUseDistrict
    }
    permits {
      activePermits
      recentPermits
      estimatedProjectValue
      complianceRisk
    }
    civic {
      openCases
      latestIssue
      escalationStatus
      source
    }
    transit {
      nearbyStops
      accessScore
      ridershipTrend
    }
    census {
      population
      medianIncome
      housingDensity
    }
  }
}`;

export interface PlannedRequest {
  blockId: string;
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

function resolveBlockId(task: string): string[] {
  const matches = task.match(BLOCK_ID_PATTERN) ?? [];
  const ids = new Set(matches.map((m) => m.toUpperCase()));
  for (const alias of PLACE_ALIASES) {
    if (alias.pattern.test(task)) ids.add(alias.id);
  }
  return Array.from(ids);
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
  const ids = resolveBlockId(task);
  if (ids.length === 0) {
    throw new PlannerError(
      "missing_block_id",
      "Please include a block ID like SF-1027 or a place like 16th & Mission."
    );
  }
  if (ids.length > 1) {
    throw new PlannerError(
      "multiple_block_ids",
      `Please include exactly one block; found: ${ids.join(", ")}.`
    );
  }
  const blockId = ids[0];
  return {
    blockId,
    actorRole: actorRole as ActorRole,
    query: URBAN_CONTEXT_QUERY,
    variables: { id: blockId, actorRole: actorRole as ActorRole },
  };
}

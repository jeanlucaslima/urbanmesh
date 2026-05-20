import { ActorRole } from "./planner.js";

interface CityBlock {
  id: string;
  name?: string | null;
  neighborhood?: string | null;
  planningStatus?: string | null;
  planningRisk?: string | null;
  zoning?: {
    district?: string | null;
    allowedUses?: string | null;
    heightLimit?: string | null;
    specialUseDistrict?: string | null;
  } | null;
  permits?: {
    activePermits?: number | null;
    recentPermits?: number | null;
    estimatedProjectValue?: number | null;
    complianceRisk?: string | null;
  } | null;
  civic?: {
    openCases?: number | null;
    latestIssue?: string | null;
    escalationStatus?: string | null;
  } | null;
  transit?: {
    nearbyStops?: number | null;
    accessScore?: number | null;
    ridershipTrend?: string | null;
  } | null;
  census?: {
    population?: number | null;
    medianIncome?: number | null;
    housingDensity?: string | null;
  } | null;
}

interface ExecutionMetadata {
  servicesTouched?: string[];
  blockedFields?: string[];
  policyDecisions?: Array<{
    field: string;
    decision: "ALLOW" | "DENY";
    reason: string;
    actorRole: string;
  }>;
}

const ROLE_LABEL: Record<ActorRole, string> = {
  PUBLIC_AI_ASSISTANT: "Public AI Assistant",
  CIVIC_OPERATOR: "Civic Operator",
  PERMIT_ANALYST: "Permit Analyst",
  CITY_ADMIN: "City Admin",
};

function fmtMoney(n: number | null | undefined): string | null {
  if (n === null || n === undefined) return null;
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

function bulletIfPresent(label: string, value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  return `- ${label}: ${value}`;
}

export function buildAnswer(
  block: CityBlock | null | undefined,
  actorRole: ActorRole,
  metadata: ExecutionMetadata
): string {
  const roleLabel = ROLE_LABEL[actorRole];

  if (!block) {
    return `UrbanMesh found no block for the given ID.`;
  }

  const lines: string[] = [];
  const heading = block.name
    ? `${block.id}: ${block.name}${block.neighborhood ? ` in the ${block.neighborhood}` : ""}`
    : block.id;
  lines.push(`UrbanMesh found context for ${heading}.`);
  lines.push("");

  const isAdmin = actorRole === "CITY_ADMIN";
  lines.push(
    isAdmin
      ? `${roleLabel} received the full planning context:`
      : `Visible context for ${roleLabel}:`
  );

  const ctxBullets: (string | null)[] = [
    bulletIfPresent("Planning status", block.planningStatus),
    bulletIfPresent("Planning risk", block.planningRisk),
    bulletIfPresent("Zoning district", block.zoning?.district),
    bulletIfPresent("Allowed uses", block.zoning?.allowedUses),
    bulletIfPresent("Height limit", block.zoning?.heightLimit),
    bulletIfPresent("Special use district", block.zoning?.specialUseDistrict),
    bulletIfPresent("Active permits", block.permits?.activePermits),
    bulletIfPresent("Recent permits", block.permits?.recentPermits),
    bulletIfPresent(
      "Estimated project value",
      fmtMoney(block.permits?.estimatedProjectValue)
    ),
    bulletIfPresent("Permit compliance risk", block.permits?.complianceRisk),
    bulletIfPresent("Open civic cases", block.civic?.openCases),
    bulletIfPresent("Latest civic issue", block.civic?.latestIssue),
    bulletIfPresent("Civic escalation status", block.civic?.escalationStatus),
    bulletIfPresent("Transit nearby stops", block.transit?.nearbyStops),
    bulletIfPresent("Transit access score", block.transit?.accessScore),
    bulletIfPresent("Ridership trend", block.transit?.ridershipTrend),
    bulletIfPresent("Population", block.census?.population),
    bulletIfPresent("Median income", block.census?.medianIncome),
    bulletIfPresent("Housing density", block.census?.housingDensity),
  ];
  for (const b of ctxBullets) if (b) lines.push(b);

  const blocked = metadata.blockedFields ?? [];
  lines.push("");
  if (blocked.length === 0) {
    lines.push(`No fields were blocked.`);
  } else {
    lines.push(`Some sensitive planning fields were restricted for ${roleLabel}:`);
    for (const f of blocked) lines.push(`- ${f}`);
  }

  lines.push("");
  lines.push(
    `The agent used the Viaduct graph. It did not call city services directly.`
  );

  return lines.join("\n");
}

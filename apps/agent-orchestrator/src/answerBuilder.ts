import { ActorRole } from "./planner.js";

interface Customer {
  id: string;
  name?: string | null;
  status?: string | null;
  riskLevel?: string | null;
  billing?: {
    balance?: number | null;
    overdueInvoices?: number | null;
    paymentRisk?: string | null;
  } | null;
  support?: {
    openTickets?: number | null;
    latestIssue?: string | null;
    escalationStatus?: string | null;
  } | null;
  usage?: {
    activeUsers?: number | null;
    monthlyEvents?: number | null;
    usageTrend?: string | null;
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

function fmtMoney(n: number | null | undefined): string | null {
  if (n === null || n === undefined) return null;
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

function bulletIfPresent(label: string, value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  return `- ${label}: ${value}`;
}

export function buildAnswer(
  customer: Customer | null | undefined,
  actorRole: ActorRole,
  metadata: ExecutionMetadata
): string {
  if (!customer) {
    return `No customer found for the given ID.`;
  }

  const lines: string[] = [];
  lines.push(
    `Customer ${customer.id} is ${customer.name ?? "(name hidden)"}.`
  );
  lines.push("");

  const isAdmin = actorRole === "ADMIN";
  lines.push(
    isAdmin
      ? `ADMIN can see the full customer context:`
      : `Visible context for ${actorRole}:`
  );

  const ctxBullets: (string | null)[] = [
    bulletIfPresent("Status", customer.status),
    bulletIfPresent("Risk level", customer.riskLevel),
    bulletIfPresent("Billing balance", fmtMoney(customer.billing?.balance)),
    bulletIfPresent("Billing overdue invoices", customer.billing?.overdueInvoices),
    bulletIfPresent("Billing payment risk", customer.billing?.paymentRisk),
    bulletIfPresent("Support open tickets", customer.support?.openTickets),
    bulletIfPresent("Support latest issue", customer.support?.latestIssue),
    bulletIfPresent("Support escalation status", customer.support?.escalationStatus),
    bulletIfPresent("Usage active users", customer.usage?.activeUsers),
    bulletIfPresent("Usage monthly events", customer.usage?.monthlyEvents),
    bulletIfPresent("Usage trend", customer.usage?.usageTrend),
  ];
  for (const b of ctxBullets) if (b) lines.push(b);

  const blocked = metadata.blockedFields ?? [];
  lines.push("");
  if (blocked.length === 0) {
    lines.push(`No fields were blocked.`);
  } else {
    lines.push(`Some sensitive fields were restricted for ${actorRole}:`);
    for (const f of blocked) lines.push(`- ${f}`);
  }

  lines.push("");
  lines.push(
    `The agent did not call internal systems directly. It used the Viaduct graph, ` +
      `which enforced policy and returned execution metadata.`
  );

  return lines.join("\n");
}

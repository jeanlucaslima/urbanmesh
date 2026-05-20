import {
  customerClient,
  billingClient,
  supportClient,
  usageClient,
  policyClient,
  PolicyDecision,
} from "./serviceClients.js";

const SENSITIVE_BILLING_FIELDS = [
  "paymentMethodLast4",
  "internalFinanceNotes",
  "riskScore",
] as const;

const SEVERITY_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 };

export const resolvers = {
  Query: {
    async customerSituation(
      _parent: unknown,
      args: { id: string; actorRole: string }
    ) {
      const { id, actorRole } = args;
      const servicesTouched: string[] = [];
      const blockedFields: { path: string; reason: string }[] = [];
      const policyDecisions: PolicyDecision[] = [];

      const [customer, billingRaw, ticketsRaw, usage] = await Promise.all([
        customerClient.get(id).then((r) => {
          servicesTouched.push("customer-service");
          return r;
        }),
        billingClient.get(id).then((r) => {
          servicesTouched.push("billing-service");
          return r;
        }),
        supportClient.list(id).then((r) => {
          servicesTouched.push("support-service");
          return r;
        }),
        usageClient.get(id).then((r) => {
          servicesTouched.push("usage-service");
          return r;
        }),
      ]);

      const billing = { ...billingRaw };
      for (const field of SENSITIVE_BILLING_FIELDS) {
        const decision = await policyClient.check(
          actorRole,
          "BillingDetails",
          field,
          "read"
        );
        policyDecisions.push(decision);
        if (!decision.allowed) {
          billing[field] = null;
          blockedFields.push({
            path: `billing.${field}`,
            reason: decision.reason,
          });
        }
      }
      servicesTouched.push("policy-service");

      let tickets = ticketsRaw;
      const ticketSummaryDecision = await policyClient.check(
        actorRole,
        "SupportTicket",
        "summary",
        "read"
      );
      policyDecisions.push(ticketSummaryDecision);
      if (!ticketSummaryDecision.allowed) {
        tickets = tickets.map((t: any) => ({ ...t, summary: "" }));
        blockedFields.push({
          path: "support.tickets[].summary",
          reason: ticketSummaryDecision.reason,
        });
      }

      const openTickets = tickets.filter((t: any) => t.status === "open");
      const highestSeverity =
        openTickets
          .map((t: any) => t.severity)
          .sort(
            (a: string, b: string) =>
              (SEVERITY_RANK[b] ?? 0) - (SEVERITY_RANK[a] ?? 0)
          )[0] ?? "none";

      const recommendedActions = buildRecommendedActions({
        customer,
        billing: billingRaw,
        usage,
        openTickets,
        actorRole,
      });

      return {
        customer,
        billing: {
          billingStatus: billing.billingStatus,
          unpaidInvoiceCount: billing.unpaidInvoiceCount,
          unpaidAmount: billing.unpaidAmount,
          paymentMethodLast4: billing.paymentMethodLast4,
          internalFinanceNotes: billing.internalFinanceNotes,
          riskScore: billing.riskScore,
        },
        support: {
          openTicketCount: openTickets.length,
          highestSeverity,
          tickets,
        },
        usage: {
          activeUsers: usage.activeUsers,
          apiCallsLast30Days: usage.apiCallsLast30Days,
          usageTrend: usage.usageTrend,
          lastLoginAt: new Date(usage.lastLoginAt).toISOString(),
          featureAdoptionScore: usage.featureAdoptionScore,
        },
        recommendedActions,
        execution: {
          servicesTouched: Array.from(new Set(servicesTouched)),
          blockedFields,
          policyDecisions,
        },
      };
    },
  },
};

function buildRecommendedActions(ctx: {
  customer: any;
  billing: any;
  usage: any;
  openTickets: any[];
  actorRole: string;
}) {
  const actions: { label: string; reason: string; allowed: boolean }[] = [];
  const highSev = ctx.openTickets.find((t) => t.severity === "high");
  if (highSev) {
    actions.push({
      label: "Escalate to Customer Success",
      reason: `Open high-severity ticket: ${highSev.title}.`,
      allowed: true,
    });
  }
  if (ctx.billing.billingStatus === "overdue") {
    actions.push({
      label: "Notify Finance about overdue invoices",
      reason: `Account has ${ctx.billing.unpaidInvoiceCount} unpaid invoice(s).`,
      allowed: ctx.actorRole !== "AI_ASSISTANT",
    });
  }
  if (ctx.usage.usageTrend === "declining") {
    actions.push({
      label: "Schedule technical onboarding call",
      reason: "Usage trend is declining; product engagement intervention recommended.",
      allowed: true,
    });
  }
  if (actions.length === 0) {
    actions.push({
      label: "No immediate action required",
      reason: "Account indicators look healthy.",
      allowed: true,
    });
  }
  return actions;
}

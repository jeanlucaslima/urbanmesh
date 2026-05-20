export function buildAnswer(data: any): string {
  const sit = data?.customerSituation;
  if (!sit) return "No data returned.";

  const { customer, billing, support, usage, recommendedActions } = sit;
  const parts: string[] = [];

  const risk =
    usage.usageTrend === "declining" || billing.billingStatus === "overdue"
      ? "moderate to high"
      : customer.healthScore < 70
      ? "moderate"
      : "low";

  parts.push(
    `${customer.name} (plan: ${customer.plan}, owner: ${customer.accountOwner}) appears to be at ${risk} risk. ` +
      `Health score is ${customer.healthScore}.`
  );

  parts.push(
    `Billing status is ${billing.billingStatus}` +
      (billing.unpaidInvoiceCount
        ? ` with ${billing.unpaidInvoiceCount} unpaid invoice(s).`
        : ".")
  );

  parts.push(
    `Support has ${support.openTicketCount} open ticket(s); highest severity: ${support.highestSeverity}.`
  );

  parts.push(
    `Usage trend is ${usage.usageTrend} (${usage.activeUsers} active users, ` +
      `${usage.apiCallsLast30Days.toLocaleString()} API calls in the last 30 days).`
  );

  const allowedActions = (recommendedActions || []).filter((a: any) => a.allowed);
  if (allowedActions.length > 0) {
    const top = allowedActions[0];
    parts.push(`Recommended next action: ${top.label} — ${top.reason}`);
  }

  return parts.join(" ");
}

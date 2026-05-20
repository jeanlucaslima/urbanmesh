export const CUSTOMER_SITUATION_QUERY = `query CustomerSituation($id: ID!, $actorRole: ActorRole!) {
  customerSituation(id: $id, actorRole: $actorRole) {
    customer {
      id
      name
      plan
      industry
      healthScore
      accountOwner
    }
    billing {
      billingStatus
      unpaidInvoiceCount
      unpaidAmount
      paymentMethodLast4
      internalFinanceNotes
      riskScore
    }
    support {
      openTicketCount
      highestSeverity
      tickets {
        id
        title
        severity
        status
        summary
      }
    }
    usage {
      activeUsers
      apiCallsLast30Days
      usageTrend
      lastLoginAt
      featureAdoptionScore
    }
    recommendedActions {
      label
      reason
      allowed
    }
    execution {
      servicesTouched
      blockedFields {
        path
        reason
      }
      policyDecisions {
        resource
        field
        action
        allowed
        reason
      }
    }
  }
}`;

const CUSTOMER_ID_PATTERN = /\bC-\d{3,5}\b/;

export function planQuery(task: string, providedCustomerId?: string) {
  const match = task.match(CUSTOMER_ID_PATTERN);
  const customerId = providedCustomerId || match?.[0] || "C-1027";
  return {
    query: CUSTOMER_SITUATION_QUERY,
    variables: { id: customerId, actorRole: "AI_ASSISTANT" as const },
  };
}

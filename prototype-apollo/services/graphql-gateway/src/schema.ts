import gql from "graphql-tag";

export const typeDefs = gql`
  type Query {
    customerSituation(id: ID!, actorRole: ActorRole!): CustomerSituation!
  }

  enum ActorRole {
    SUPPORT_AGENT
    FINANCE_AGENT
    ADMIN
    AI_ASSISTANT
  }

  type CustomerSituation {
    customer: Customer!
    billing: BillingSummary!
    support: SupportSummary!
    usage: UsageSummary!
    recommendedActions: [RecommendedAction!]!
    execution: ExecutionMetadata!
  }

  type Customer {
    id: ID!
    name: String!
    industry: String!
    plan: String!
    accountOwner: String!
    healthScore: Int!
  }

  type BillingSummary {
    billingStatus: String!
    unpaidInvoiceCount: Int!
    unpaidAmount: Float
    paymentMethodLast4: String
    internalFinanceNotes: String
    riskScore: Int
  }

  type SupportSummary {
    openTicketCount: Int!
    highestSeverity: String!
    tickets: [SupportTicket!]!
  }

  type SupportTicket {
    id: ID!
    title: String!
    severity: String!
    status: String!
    summary: String!
  }

  type UsageSummary {
    activeUsers: Int!
    apiCallsLast30Days: Int!
    usageTrend: String!
    lastLoginAt: String!
    featureAdoptionScore: Int!
  }

  type RecommendedAction {
    label: String!
    reason: String!
    allowed: Boolean!
  }

  type ExecutionMetadata {
    servicesTouched: [String!]!
    blockedFields: [BlockedField!]!
    policyDecisions: [PolicyDecision!]!
  }

  type BlockedField {
    path: String!
    reason: String!
  }

  type PolicyDecision {
    resource: String!
    field: String!
    action: String!
    allowed: Boolean!
    reason: String!
  }
`;

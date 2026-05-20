package com.example.viadapp.resolvers.billing

import com.example.viadapp.resolvers.internal.InternalClient
import com.example.viadapp.resolvers.internal.PolicyClient
import com.example.viadapp.resolvers.internal.ServiceUrls
import com.example.viadapp.resolvers.resolverbases.CustomerResolvers
import viaduct.api.grts.BillingAccount
import viaduct.api.resolver.Resolver

@Resolver("id")
class CustomerBillingResolver : CustomerResolvers.Billing() {
    override suspend fun resolve(ctx: Context): BillingAccount? {
        val customerId = ctx.getObjectValue().getId()
        val node = InternalClient.getJson(
            "billing-service",
            "${ServiceUrls.billing}/billing/$customerId"
        ) ?: return null

        val rawBalance = node["unpaidAmount"]?.takeUnless { it.isNull }?.asDouble()
        val overdueInvoices = node["unpaidInvoiceCount"]?.takeUnless { it.isNull }?.asInt()
        val riskScore = node["riskScore"]?.takeUnless { it.isNull }?.asInt()
        val rawPaymentRisk = when {
            riskScore == null -> null
            riskScore >= 70 -> "HIGH"
            riskScore >= 40 -> "MEDIUM"
            else -> "LOW"
        }

        val balance = if (PolicyClient.isAllowed("BillingAccount.balance", customerId)) rawBalance else null
        val paymentRisk = if (PolicyClient.isAllowed("BillingAccount.paymentRisk", customerId)) rawPaymentRisk else null

        return BillingAccount.of(ctx) {
            balance(balance)
            overdueInvoices(overdueInvoices)
            paymentRisk(paymentRisk)
        }
    }
}

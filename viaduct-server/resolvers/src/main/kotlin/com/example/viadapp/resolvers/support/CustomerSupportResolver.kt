package com.example.viadapp.resolvers.support

import com.example.viadapp.resolvers.internal.InternalClient
import com.example.viadapp.resolvers.internal.ServiceUrls
import com.example.viadapp.resolvers.resolverbases.CustomerResolvers
import viaduct.api.grts.SupportSummary
import viaduct.api.resolver.Resolver

@Resolver("id")
class CustomerSupportResolver : CustomerResolvers.Support() {
    override suspend fun resolve(ctx: Context): SupportSummary? {
        val customerId = ctx.getObjectValue().getId()
        val node = InternalClient.getJson(
            "${ServiceUrls.support}/support/customers/$customerId/tickets"
        ) ?: return null

        val tickets = if (node.isArray) node.toList() else emptyList()
        val openTickets = tickets.filter { it["status"]?.asText() == "open" }
        val highSev = openTickets.any { it["severity"]?.asText() == "high" }
        val medSev = openTickets.any { it["severity"]?.asText() == "medium" }

        val severityRank = { s: String? ->
            when (s) { "high" -> 3; "medium" -> 2; "low" -> 1; else -> 0 }
        }
        val latest = openTickets.maxByOrNull { severityRank(it["severity"]?.asText()) }
        val latestIssue = latest?.get("title")?.takeUnless { it.isNull }?.asText()

        val escalationStatus = when {
            highSev -> "ESCALATED"
            medSev -> "MONITORING"
            openTickets.isNotEmpty() -> "NORMAL"
            else -> "NONE"
        }

        return SupportSummary.of(ctx) {
            openTickets(openTickets.size)
            latestIssue(latestIssue)
            escalationStatus(escalationStatus)
        }
    }
}

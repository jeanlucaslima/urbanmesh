package com.example.viadapp.resolvers.civic

import com.example.viadapp.resolvers.internal.InternalClient
import com.example.viadapp.resolvers.internal.PolicyClient
import com.example.viadapp.resolvers.internal.ServiceUrls
import com.example.viadapp.resolvers.resolverbases.CityBlockResolvers
import viaduct.api.grts.CivicCaseSummary
import viaduct.api.resolver.Resolver

@Resolver("id")
class CityBlockCivicResolver : CityBlockResolvers.Civic() {
    override suspend fun resolve(ctx: Context): CivicCaseSummary? {
        val blockId = ctx.getObjectValue().getId()
        val node = InternalClient.getJson(
            "civic-service",
            "${ServiceUrls.civic}/civic/blocks/$blockId/cases"
        ) ?: return null

        val cases = if (node.isArray) node.toList() else emptyList()
        val openCases = cases.filter { it["status"]?.asText() == "open" }
        val highSev = openCases.any { it["severity"]?.asText() == "high" }
        val medSev = openCases.any { it["severity"]?.asText() == "medium" }

        val severityRank = { s: String? ->
            when (s) { "high" -> 3; "medium" -> 2; "low" -> 1; else -> 0 }
        }
        val latest = openCases.maxByOrNull { severityRank(it["severity"]?.asText()) }
        val latestIssue = latest?.get("title")?.takeUnless { it.isNull }?.asText()

        val rawEscalation = when {
            highSev -> "ESCALATED"
            medSev -> "MONITORING"
            openCases.isNotEmpty() -> "NORMAL"
            else -> "NONE"
        }
        val escalationStatus = if (PolicyClient.isAllowed("CivicCaseSummary.escalationStatus", blockId)) {
            rawEscalation
        } else {
            null
        }

        return CivicCaseSummary.of(ctx) {
            openCases(openCases.size)
            latestIssue(latestIssue)
            escalationStatus(escalationStatus)
        }
    }
}

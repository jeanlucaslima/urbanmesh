package com.example.viadapp.resolvers.civic

import com.example.viadapp.resolvers.internal.InternalClient
import com.example.viadapp.resolvers.internal.PolicyClient
import com.example.viadapp.resolvers.internal.ServiceUrls
import com.example.viadapp.resolvers.resolverbases.CityBlockResolvers
import viaduct.api.grts.CivicCase
import viaduct.api.grts.CivicCaseSummary
import viaduct.api.resolver.Resolver

@Resolver("id")
class CityBlockCivicResolver : CityBlockResolvers.Civic() {
    override suspend fun resolve(ctx: Context): CivicCaseSummary? {
        val blockId = ctx.getObjectValue().getId()
        val node = InternalClient.getJson(
            "civic-service",
            "${ServiceUrls.civic}/blocks/$blockId/civic"
        ) ?: return null

        val openCases = node["openCases"]?.takeUnless { it.isNull }?.asInt() ?: 0
        val latestIssue = node["latestIssue"]?.takeUnless { it.isNull }?.asText()
        val rawEscalation = node["escalationStatus"]?.takeUnless { it.isNull }?.asText()
        val source = node["source"]?.takeUnless { it.isNull }?.asText()

        val escalationStatus = if (PolicyClient.isAllowed("CivicCaseSummary.escalationStatus", blockId)) {
            rawEscalation
        } else {
            null
        }

        val recentCasesNode = node["recentCases"]
        val recentCases: List<CivicCase> = if (recentCasesNode != null && recentCasesNode.isArray) {
            recentCasesNode.map { c ->
                CivicCase.of(ctx) {
                    caseId(c["caseId"]?.takeUnless { it.isNull }?.asText())
                    category(c["category"]?.takeUnless { it.isNull }?.asText())
                    type(c["type"]?.takeUnless { it.isNull }?.asText())
                    status(c["status"]?.takeUnless { it.isNull }?.asText())
                    openedAt(c["openedAt"]?.takeUnless { it.isNull }?.asText())
                    address(c["address"]?.takeUnless { it.isNull }?.asText())
                }
            }
        } else {
            emptyList()
        }

        return CivicCaseSummary.of(ctx) {
            openCases(openCases)
            latestIssue(latestIssue)
            escalationStatus(escalationStatus)
            source(source)
            recentCases(recentCases)
        }
    }
}

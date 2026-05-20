package com.example.viadapp.resolvers.permits

import com.example.viadapp.resolvers.internal.InternalClient
import com.example.viadapp.resolvers.internal.PolicyClient
import com.example.viadapp.resolvers.internal.ServiceUrls
import com.example.viadapp.resolvers.resolverbases.CityBlockResolvers
import viaduct.api.grts.PermitSummary
import viaduct.api.resolver.Resolver

@Resolver("id")
class CityBlockPermitsResolver : CityBlockResolvers.Permits() {
    override suspend fun resolve(ctx: Context): PermitSummary? {
        val blockId = ctx.getObjectValue().getId()
        val node = InternalClient.getJson(
            "permits-service",
            "${ServiceUrls.permits}/permits/$blockId"
        ) ?: return null

        val activePermits = node["activePermits"]?.takeUnless { it.isNull }?.asInt()
        val recentPermits = node["recentPermits"]?.takeUnless { it.isNull }?.asInt()
        val rawProjectValue = node["estimatedProjectValue"]?.takeUnless { it.isNull }?.asDouble()
        val rawComplianceRisk = node["complianceRisk"]?.takeUnless { it.isNull }?.asText()

        val estimatedProjectValue = if (PolicyClient.isAllowed("PermitSummary.estimatedProjectValue", blockId)) {
            rawProjectValue
        } else {
            null
        }
        val complianceRisk = if (PolicyClient.isAllowed("PermitSummary.complianceRisk", blockId)) {
            rawComplianceRisk
        } else {
            null
        }

        return PermitSummary.of(ctx) {
            activePermits(activePermits)
            recentPermits(recentPermits)
            estimatedProjectValue(estimatedProjectValue)
            complianceRisk(complianceRisk)
        }
    }
}

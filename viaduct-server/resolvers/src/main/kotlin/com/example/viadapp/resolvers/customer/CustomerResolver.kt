package com.example.viadapp.resolvers.customer

import com.example.viadapp.resolvers.internal.InternalClient
import com.example.viadapp.resolvers.internal.PolicyClient
import com.example.viadapp.resolvers.internal.RequestStateHolder
import com.example.viadapp.resolvers.internal.ServiceUrls
import com.example.viadapp.resolvers.resolverbases.QueryResolvers
import viaduct.api.grts.Customer
import viaduct.api.resolver.Resolver

@Resolver
class CustomerResolver : QueryResolvers.Customer() {
    override suspend fun resolve(ctx: Context): Customer? {
        val id = ctx.arguments.id
        val actorRole = ctx.arguments.actorRole.toString()

        // Stash the actor role in the request state so child field resolvers
        // (billing, support, usage) can read it without re-receiving it as
        // an argument.
        RequestStateHolder.current()?.also { it.actorRole = actorRole }

        val node = InternalClient.getJson(
            "customer-service",
            "${ServiceUrls.customer}/customers/$id"
        ) ?: return null

        val rawRiskLevel = node["riskLevel"]?.takeUnless { it.isNull }?.asText()
        val riskLevel = if (PolicyClient.isAllowed("Customer.riskLevel", id)) {
            rawRiskLevel
        } else {
            null
        }

        return Customer.of(ctx) {
            id(node["id"].asText())
            name(node["name"]?.takeUnless { it.isNull }?.asText())
            status(node["status"]?.takeUnless { it.isNull }?.asText())
            riskLevel(riskLevel)
        }
    }
}

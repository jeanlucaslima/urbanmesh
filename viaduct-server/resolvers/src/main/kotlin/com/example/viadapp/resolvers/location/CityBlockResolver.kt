package com.example.viadapp.resolvers.location

import com.example.viadapp.resolvers.internal.InternalClient
import com.example.viadapp.resolvers.internal.PolicyClient
import com.example.viadapp.resolvers.internal.RequestStateHolder
import com.example.viadapp.resolvers.internal.ServiceUrls
import com.example.viadapp.resolvers.resolverbases.QueryResolvers
import viaduct.api.grts.CityBlock
import viaduct.api.resolver.Resolver

@Resolver
class CityBlockResolver : QueryResolvers.Block() {
    override suspend fun resolve(ctx: Context): CityBlock? {
        val id = ctx.arguments.id
        val actorRole = ctx.arguments.actorRole.toString()

        RequestStateHolder.current()?.also { it.actorRole = actorRole }

        val node = InternalClient.getJson(
            "location-service",
            "${ServiceUrls.location}/blocks/$id"
        ) ?: return null

        val rawPlanningRisk = node["planningRisk"]?.takeUnless { it.isNull }?.asText()
        val planningRisk = if (PolicyClient.isAllowed("CityBlock.planningRisk", id)) {
            rawPlanningRisk
        } else {
            null
        }

        return CityBlock.of(ctx) {
            id(node["id"].asText())
            name(node["name"]?.takeUnless { it.isNull }?.asText())
            neighborhood(node["neighborhood"]?.takeUnless { it.isNull }?.asText())
            planningStatus(node["planningStatus"]?.takeUnless { it.isNull }?.asText())
            planningRisk(planningRisk)
        }
    }
}

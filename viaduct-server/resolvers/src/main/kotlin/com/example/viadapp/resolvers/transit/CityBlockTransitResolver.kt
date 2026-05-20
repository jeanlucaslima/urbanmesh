package com.example.viadapp.resolvers.transit

import com.example.viadapp.resolvers.internal.InternalClient
import com.example.viadapp.resolvers.internal.ServiceUrls
import com.example.viadapp.resolvers.resolverbases.CityBlockResolvers
import viaduct.api.grts.TransitSummary
import viaduct.api.resolver.Resolver

@Resolver("id")
class CityBlockTransitResolver : CityBlockResolvers.Transit() {
    override suspend fun resolve(ctx: Context): TransitSummary? {
        val blockId = ctx.getObjectValue().getId()
        val node = InternalClient.getJson(
            "transit-service",
            "${ServiceUrls.transit}/transit/blocks/$blockId"
        ) ?: return null

        val nearbyStops = node["nearbyStops"]?.takeUnless { it.isNull }?.asInt()
        val accessScore = node["accessScore"]?.takeUnless { it.isNull }?.asInt()
        val ridershipTrend = node["ridershipTrend"]?.takeUnless { it.isNull }?.asText()

        return TransitSummary.of(ctx) {
            nearbyStops(nearbyStops)
            accessScore(accessScore)
            ridershipTrend(ridershipTrend)
        }
    }
}

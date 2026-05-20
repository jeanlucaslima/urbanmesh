package com.example.viadapp.resolvers.location

import com.example.viadapp.resolvers.internal.InternalClient
import com.example.viadapp.resolvers.internal.ServiceUrls
import com.example.viadapp.resolvers.resolverbases.CityBlockResolvers
import viaduct.api.grts.ZoningInfo
import viaduct.api.resolver.Resolver

@Resolver("id")
class CityBlockZoningResolver : CityBlockResolvers.Zoning() {
    override suspend fun resolve(ctx: Context): ZoningInfo? {
        val blockId = ctx.getObjectValue().getId()
        val node = InternalClient.getJson(
            "location-service",
            "${ServiceUrls.location}/blocks/$blockId/zoning"
        ) ?: return null

        return ZoningInfo.of(ctx) {
            district(node["district"]?.takeUnless { it.isNull }?.asText())
            allowedUses(node["allowedUses"]?.takeUnless { it.isNull }?.asText())
            heightLimit(node["heightLimit"]?.takeUnless { it.isNull }?.asText())
            specialUseDistrict(node["specialUseDistrict"]?.takeUnless { it.isNull }?.asText())
        }
    }
}

package com.example.viadapp.resolvers.census

import com.example.viadapp.resolvers.internal.InternalClient
import com.example.viadapp.resolvers.internal.ServiceUrls
import com.example.viadapp.resolvers.resolverbases.CityBlockResolvers
import viaduct.api.grts.CensusProfile
import viaduct.api.resolver.Resolver

@Resolver("id")
class CityBlockCensusResolver : CityBlockResolvers.Census() {
    override suspend fun resolve(ctx: Context): CensusProfile? {
        val blockId = ctx.getObjectValue().getId()
        val node = InternalClient.getJson(
            "census-service",
            "${ServiceUrls.census}/census/blocks/$blockId"
        ) ?: return null

        val population = node["population"]?.takeUnless { it.isNull }?.asInt()
        val medianIncome = node["medianIncome"]?.takeUnless { it.isNull }?.asInt()
        val housingDensity = node["housingDensity"]?.takeUnless { it.isNull }?.asText()

        return CensusProfile.of(ctx) {
            population(population)
            medianIncome(medianIncome)
            housingDensity(housingDensity)
        }
    }
}

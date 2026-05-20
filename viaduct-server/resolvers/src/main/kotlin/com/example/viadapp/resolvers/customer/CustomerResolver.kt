package com.example.viadapp.resolvers.customer

import com.example.viadapp.resolvers.internal.InternalClient
import com.example.viadapp.resolvers.internal.ServiceUrls
import com.example.viadapp.resolvers.resolverbases.QueryResolvers
import viaduct.api.grts.Customer
import viaduct.api.resolver.Resolver

@Resolver
class CustomerResolver : QueryResolvers.Customer() {
    override suspend fun resolve(ctx: Context): Customer? {
        val id = ctx.arguments.id
        val node = InternalClient.getJson("${ServiceUrls.customer}/customers/$id") ?: return null
        return Customer.of(ctx) {
            id(node["id"].asText())
            name(node["name"]?.takeUnless { it.isNull }?.asText())
            status(node["status"]?.takeUnless { it.isNull }?.asText())
            riskLevel(node["riskLevel"]?.takeUnless { it.isNull }?.asText())
        }
    }
}

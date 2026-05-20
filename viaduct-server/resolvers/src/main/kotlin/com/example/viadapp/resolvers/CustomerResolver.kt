package com.example.viadapp.resolvers

import com.example.viadapp.resolvers.resolverbases.QueryResolvers
import viaduct.api.grts.Customer
import viaduct.api.resolver.Resolver

@Resolver
class CustomerResolver : QueryResolvers.Customer() {
    override suspend fun resolve(ctx: Context): Customer? {
        val id = ctx.arguments.id
        val fixture = CustomerFixtures.byId[id] ?: return null
        return Customer.of(ctx) {
            id(fixture.id)
            name(fixture.name)
            status(fixture.status)
        }
    }
}

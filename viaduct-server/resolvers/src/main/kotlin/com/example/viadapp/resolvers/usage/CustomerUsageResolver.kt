package com.example.viadapp.resolvers.usage

import com.example.viadapp.resolvers.internal.InternalClient
import com.example.viadapp.resolvers.internal.ServiceUrls
import com.example.viadapp.resolvers.resolverbases.CustomerResolvers
import viaduct.api.grts.UsageSummary
import viaduct.api.resolver.Resolver

@Resolver("id")
class CustomerUsageResolver : CustomerResolvers.Usage() {
    override suspend fun resolve(ctx: Context): UsageSummary? {
        val customerId = ctx.getObjectValue().getId()
        val node = InternalClient.getJson(
            "${ServiceUrls.usage}/usage/customers/$customerId"
        ) ?: return null

        val activeUsers = node["activeUsers"]?.takeUnless { it.isNull }?.asInt()
        val monthlyEvents = node["apiCallsLast30Days"]?.takeUnless { it.isNull }?.asInt()
        val usageTrend = node["usageTrend"]?.takeUnless { it.isNull }?.asText()

        return UsageSummary.of(ctx) {
            activeUsers(activeUsers)
            monthlyEvents(monthlyEvents)
            usageTrend(usageTrend)
        }
    }
}

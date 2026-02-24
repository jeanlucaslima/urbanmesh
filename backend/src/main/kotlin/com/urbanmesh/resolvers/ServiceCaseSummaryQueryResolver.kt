package com.urbanmesh.resolvers

import com.urbanmesh.resolvers.resolverbases.QueryResolvers
import com.urbanmesh.services.SFDataService
import viaduct.api.Resolver
import viaduct.api.grts.SummaryItem

/**
 * Resolver for the serviceCaseSummary query.
 * Returns aggregated 311 service case counts grouped by a specified field.
 * Supported groupBy values: "status_description", "service_name",
 * "agency_responsible", "neighborhood", "supervisor_district".
 * Public endpoint — no authentication required.
 */
@Resolver
class ServiceCaseSummaryQueryResolver(
    private val sfDataService: SFDataService
) : QueryResolvers.ServiceCaseSummary() {
    override suspend fun resolve(ctx: Context): List<SummaryItem> {
        val groupBy = ctx.arguments.groupBy
        val aggregations = sfDataService.getServiceCaseSummary(groupBy)

        return aggregations.mapNotNull { dto ->
            val category = dto.category ?: return@mapNotNull null
            val count = dto.count?.toIntOrNull() ?: 0
            SummaryItem.Builder(ctx)
                .category(category)
                .count(count)
                .build()
        }
    }
}

package com.urbanmesh.resolvers

import com.urbanmesh.resolvers.resolverbases.QueryResolvers
import com.urbanmesh.services.SFDataService
import viaduct.api.Resolver
import viaduct.api.grts.SummaryItem

/**
 * Resolver for the policeIncidentSummary query.
 * Returns aggregated police incident counts grouped by a specified field.
 * Supported groupBy values: "incident_category", "resolution",
 * "analysis_neighborhood", "supervisor_district".
 * Public endpoint — no authentication required.
 */
@Resolver
class PoliceIncidentSummaryQueryResolver(
    private val sfDataService: SFDataService
) : QueryResolvers.PoliceIncidentSummary() {
    override suspend fun resolve(ctx: Context): List<SummaryItem> {
        val groupBy = ctx.arguments.groupBy
        val aggregations = sfDataService.getPoliceIncidentSummary(groupBy)

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

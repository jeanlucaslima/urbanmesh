package com.urbanmesh.resolvers

import com.urbanmesh.resolvers.resolverbases.QueryResolvers
import com.urbanmesh.services.SFDataService
import viaduct.api.Resolver
import viaduct.api.grts.PermitSummary

/**
 * Resolver for the permitSummary query.
 * Returns aggregated permit counts grouped by a specified field.
 * Supported groupBy values: "status", "permit_type_definition",
 * "neighborhoods_analysis_boundaries", "supervisor_district".
 * Public endpoint — no authentication required.
 */
@Resolver
class PermitSummaryQueryResolver(
    private val sfDataService: SFDataService
) : QueryResolvers.PermitSummary() {
    override suspend fun resolve(ctx: Context): List<PermitSummary> {
        val groupBy = ctx.arguments.groupBy
        val aggregations = sfDataService.getPermitSummary(groupBy)

        return aggregations.mapNotNull { dto ->
            val category = dto.category ?: return@mapNotNull null
            val count = dto.count?.toIntOrNull() ?: 0
            PermitSummary.Builder(ctx)
                .category(category)
                .count(count)
                .build()
        }
    }
}

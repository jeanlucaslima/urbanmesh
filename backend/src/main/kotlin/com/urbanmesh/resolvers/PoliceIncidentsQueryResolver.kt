package com.urbanmesh.resolvers

import com.urbanmesh.resolvers.resolverbases.QueryResolvers
import com.urbanmesh.services.IncidentFilter
import com.urbanmesh.services.SFDataService
import viaduct.api.Resolver
import viaduct.api.grts.PoliceIncident

/**
 * Resolver for the policeIncidents query.
 * Returns a list of SF police incident reports from SF Open Data (dataset wg3w-h783).
 * Public endpoint — no authentication required.
 */
@Resolver
class PoliceIncidentsQueryResolver(
    private val sfDataService: SFDataService
) : QueryResolvers.PoliceIncidents() {
    override suspend fun resolve(ctx: Context): List<PoliceIncident> {
        val filter = ctx.arguments.filter?.let { f ->
            IncidentFilter(
                incidentCategory = f.incidentCategory,
                resolution = f.resolution,
                supervisorDistrict = f.supervisorDistrict,
                neighborhood = f.neighborhood,
                search = f.search
            )
        }
        val pagination = ctx.arguments.pagination
        val limit = pagination?.limit ?: 20
        val offset = pagination?.offset ?: 0

        val incidents = sfDataService.getPoliceIncidents(filter, limit, offset)

        return incidents.map { dto ->
            PoliceIncident.Builder(ctx)
                .incidentId(dto.incidentId ?: "")
                .incidentDatetime(dto.incidentDatetime)
                .incidentCategory(dto.incidentCategory)
                .incidentSubcategory(dto.incidentSubcategory)
                .incidentDescription(dto.incidentDescription)
                .resolution(dto.resolution)
                .address(dto.address)
                .supervisorDistrict(dto.supervisorDistrict)
                .neighborhood(dto.neighborhood)
                .latitude(dto.latitude?.toDoubleOrNull())
                .longitude(dto.longitude?.toDoubleOrNull())
                .build()
        }
    }
}

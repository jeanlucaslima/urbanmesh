package com.urbanmesh.resolvers

import com.urbanmesh.resolvers.resolverbases.QueryResolvers
import com.urbanmesh.services.PermitFilter
import com.urbanmesh.services.SFDataService
import viaduct.api.Resolver
import viaduct.api.grts.BuildingPermit

/**
 * Resolver for the buildingPermits query.
 * Returns a list of SF building permits from SF Open Data (dataset i98e-djp9).
 * Public endpoint — no authentication required.
 */
@Resolver
class BuildingPermitsQueryResolver(
    private val sfDataService: SFDataService
) : QueryResolvers.BuildingPermits() {
    override suspend fun resolve(ctx: Context): List<BuildingPermit> {
        val filter = ctx.arguments.filter?.let { f ->
            PermitFilter(
                neighborhood = f.neighborhood,
                status = f.status,
                supervisorDistrict = f.supervisorDistrict,
                zipcode = f.zipcode,
                search = f.search
            )
        }
        val pagination = ctx.arguments.pagination
        val limit = pagination?.limit ?: 20
        val offset = pagination?.offset ?: 0

        val permits = sfDataService.getPermits(filter, limit, offset)

        return permits.map { dto ->
            BuildingPermit.Builder(ctx)
                .permitNumber(dto.permitNumber ?: "")
                .permitType(dto.permitTypeDefinition)
                .address(dto.address)
                .zipcode(dto.zipcode)
                .status(dto.status)
                .filedDate(dto.filedDate)
                .issuedDate(dto.issuedDate)
                .neighborhood(dto.neighborhood)
                .supervisorDistrict(dto.supervisorDistrict)
                .existingUse(dto.existingUse)
                .proposedUse(dto.proposedUse)
                .estimatedCost(dto.estimatedCost)
                .description(dto.description)
                .latitude(dto.latitude)
                .longitude(dto.longitude)
                .build()
        }
    }
}

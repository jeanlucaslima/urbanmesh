package com.urbanmesh.resolvers

import com.urbanmesh.resolvers.resolverbases.QueryResolvers
import com.urbanmesh.services.SFDataService
import viaduct.api.Resolver
import viaduct.api.grts.BuildingPermit

/**
 * Resolver for the buildingPermit query.
 * Returns a single SF building permit by permit number.
 * Public endpoint — no authentication required.
 */
@Resolver
class BuildingPermitQueryResolver(
    private val sfDataService: SFDataService
) : QueryResolvers.BuildingPermit() {
    override suspend fun resolve(ctx: Context): BuildingPermit? {
        val permitNumber = ctx.arguments.permitNumber
        val dto = sfDataService.getPermitByNumber(permitNumber) ?: return null

        return BuildingPermit.Builder(ctx)
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

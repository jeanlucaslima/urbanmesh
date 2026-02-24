package com.urbanmesh.resolvers

import com.urbanmesh.resolvers.resolverbases.QueryResolvers
import com.urbanmesh.services.CaseFilter
import com.urbanmesh.services.SFDataService
import viaduct.api.Resolver
import viaduct.api.grts.ServiceCase

/**
 * Resolver for the serviceCases query.
 * Returns a list of SF 311 service cases from SF Open Data (dataset vw6y-z8j6).
 * Public endpoint — no authentication required.
 */
@Resolver
class ServiceCasesQueryResolver(
    private val sfDataService: SFDataService
) : QueryResolvers.ServiceCases() {
    override suspend fun resolve(ctx: Context): List<ServiceCase> {
        val filter = ctx.arguments.filter?.let { f ->
            CaseFilter(
                serviceName = f.serviceName,
                status = f.status,
                supervisorDistrict = f.supervisorDistrict,
                neighborhood = f.neighborhood,
                search = f.search
            )
        }
        val pagination = ctx.arguments.pagination
        val limit = pagination?.limit ?: 20
        val offset = pagination?.offset ?: 0

        val cases = sfDataService.getServiceCases(filter, limit, offset)

        return cases.map { dto ->
            ServiceCase.Builder(ctx)
                .serviceRequestId(dto.serviceRequestId ?: "")
                .requestedDatetime(dto.requestedDatetime)
                .closedDate(dto.closedDate)
                .statusDescription(dto.statusDescription)
                .serviceName(dto.serviceName)
                .serviceSubtype(dto.serviceSubtype)
                .address(dto.address)
                .supervisorDistrict(dto.supervisorDistrict)
                .neighborhood(dto.neighborhood)
                .latitude(dto.latitude)
                .longitude(dto.longitude)
                .source(dto.source)
                .agencyResponsible(dto.agencyResponsible)
                .build()
        }
    }
}

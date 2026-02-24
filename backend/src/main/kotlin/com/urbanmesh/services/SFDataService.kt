package com.urbanmesh.services

import io.ktor.client.HttpClient
import io.ktor.client.request.*
import io.ktor.client.statement.bodyAsText
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

private const val PERMITS_URL = "https://data.sfgov.org/resource/i98e-djp9.json"
private const val CASES_URL = "https://data.sfgov.org/resource/vw6y-z8j6.json"
private const val INCIDENTS_URL = "https://data.sfgov.org/resource/wg3w-h783.json"
private const val DEFAULT_LIMIT = 20
private const val MAX_LIMIT = 100

/**
 * SODA API response DTO for building permits (dataset i98e-djp9).
 */
@Serializable
data class PermitDto(
    @SerialName("permit_number") val permitNumber: String? = null,
    @SerialName("permit_type_definition") val permitTypeDefinition: String? = null,
    @SerialName("street_number") val streetNumber: String? = null,
    @SerialName("street_name") val streetName: String? = null,
    @SerialName("zipcode") val zipcode: String? = null,
    @SerialName("status") val status: String? = null,
    @SerialName("filed_date") val filedDate: String? = null,
    @SerialName("issued_date") val issuedDate: String? = null,
    @SerialName("neighborhoods_analysis_boundaries") val neighborhood: String? = null,
    @SerialName("supervisor_district") val supervisorDistrict: String? = null,
    @SerialName("existing_use") val existingUse: String? = null,
    @SerialName("proposed_use") val proposedUse: String? = null,
    @SerialName("estimated_cost") val estimatedCost: String? = null,
    @SerialName("description") val description: String? = null,
    @SerialName("latitude") val latitude: String? = null,
    @SerialName("longitude") val longitude: String? = null
) {
    val address: String?
        get() = listOfNotNull(streetNumber, streetName)
            .joinToString(" ")
            .takeIf { it.isNotBlank() }
}

/**
 * SODA API response DTO for 311 service cases (dataset vw6y-z8j6).
 */
@Serializable
data class ServiceCaseDto(
    @SerialName("service_request_id") val serviceRequestId: String? = null,
    @SerialName("requested_datetime") val requestedDatetime: String? = null,
    @SerialName("closed_date") val closedDate: String? = null,
    @SerialName("status_description") val statusDescription: String? = null,
    @SerialName("service_name") val serviceName: String? = null,
    @SerialName("service_subtype") val serviceSubtype: String? = null,
    @SerialName("address") val address: String? = null,
    @SerialName("supervisor_district") val supervisorDistrict: String? = null,
    @SerialName("neighborhood") val neighborhood: String? = null,
    @SerialName("lat") val latitude: String? = null,
    @SerialName("long") val longitude: String? = null,
    @SerialName("source") val source: String? = null,
    @SerialName("agency_responsible") val agencyResponsible: String? = null
)

/**
 * SODA API response DTO for police incident reports (dataset wg3w-h783).
 */
@Serializable
data class PoliceIncidentDto(
    @SerialName("incident_id") val incidentId: String? = null,
    @SerialName("incident_datetime") val incidentDatetime: String? = null,
    @SerialName("incident_category") val incidentCategory: String? = null,
    @SerialName("incident_subcategory") val incidentSubcategory: String? = null,
    @SerialName("incident_description") val incidentDescription: String? = null,
    @SerialName("resolution") val resolution: String? = null,
    @SerialName("intersection") val address: String? = null,
    @SerialName("supervisor_district") val supervisorDistrict: String? = null,
    @SerialName("analysis_neighborhood") val neighborhood: String? = null,
    @SerialName("latitude") val latitude: String? = null,
    @SerialName("longitude") val longitude: String? = null
)

/**
 * SODA API response DTO for aggregation queries.
 */
@Serializable
data class AggregationDto(
    val category: String? = null,
    @SerialName("count") val count: String? = null
)

/**
 * Filter parameters for building permit queries.
 */
data class PermitFilter(
    val neighborhood: String? = null,
    val status: String? = null,
    val supervisorDistrict: String? = null,
    val zipcode: String? = null,
    val search: String? = null
)

/**
 * Filter parameters for 311 service case queries.
 */
data class CaseFilter(
    val serviceName: String? = null,
    val status: String? = null,
    val supervisorDistrict: String? = null,
    val neighborhood: String? = null,
    val search: String? = null
)

/**
 * Filter parameters for police incident queries.
 */
data class IncidentFilter(
    val incidentCategory: String? = null,
    val resolution: String? = null,
    val supervisorDistrict: String? = null,
    val neighborhood: String? = null,
    val search: String? = null
)

/**
 * Service for fetching live data from the SF Open Data SODA API.
 * Proxies building permits, 311 cases, and police incidents through the GraphQL backend.
 */
class SFDataService(private val httpClient: HttpClient) {
    private val json = Json { ignoreUnknownKeys = true }

    /**
     * Fetch building permits from SF Open Data with optional filtering and pagination.
     */
    suspend fun getPermits(
        filter: PermitFilter? = null,
        limit: Int = DEFAULT_LIMIT,
        offset: Int = 0
    ): List<PermitDto> {
        val effectiveLimit = limit.coerceAtMost(MAX_LIMIT)
        val whereClauses = buildPermitWhereClauses(filter)

        val response = httpClient.get(PERMITS_URL) {
            parameter("\$limit", effectiveLimit)
            parameter("\$offset", offset)
            parameter("\$order", "filed_date DESC")
            if (whereClauses.isNotEmpty()) {
                parameter("\$where", whereClauses.joinToString(" AND "))
            }
            filter?.search?.takeIf { it.isNotBlank() }?.let {
                parameter("\$q", it)
            }
        }

        return json.decodeFromString(response.bodyAsText())
    }

    /**
     * Fetch a single building permit by permit number.
     */
    suspend fun getPermitByNumber(permitNumber: String): PermitDto? {
        val response = httpClient.get(PERMITS_URL) {
            parameter("\$where", "permit_number='${permitNumber.replace("'", "\\'")}'")
            parameter("\$limit", 1)
        }

        val permits: List<PermitDto> = json.decodeFromString(response.bodyAsText())
        return permits.firstOrNull()
    }

    /**
     * Fetch 311 service cases from SF Open Data with optional filtering and pagination.
     */
    suspend fun getServiceCases(
        filter: CaseFilter? = null,
        limit: Int = DEFAULT_LIMIT,
        offset: Int = 0
    ): List<ServiceCaseDto> {
        val effectiveLimit = limit.coerceAtMost(MAX_LIMIT)
        val whereClauses = buildCaseWhereClauses(filter)

        val response = httpClient.get(CASES_URL) {
            parameter("\$limit", effectiveLimit)
            parameter("\$offset", offset)
            parameter("\$order", "requested_datetime DESC")
            if (whereClauses.isNotEmpty()) {
                parameter("\$where", whereClauses.joinToString(" AND "))
            }
            filter?.search?.takeIf { it.isNotBlank() }?.let {
                parameter("\$q", it)
            }
        }

        return json.decodeFromString(response.bodyAsText())
    }

    /**
     * Fetch aggregated permit counts grouped by a SODA column.
     * Returns a list of category/count pairs.
     */
    suspend fun getPermitSummary(groupByColumn: String): List<AggregationDto> {
        // Allowlist to prevent SoQL injection
        val safeColumn = when (groupByColumn) {
            "status" -> "status"
            "permit_type_definition" -> "permit_type_definition"
            "neighborhoods_analysis_boundaries" -> "neighborhoods_analysis_boundaries"
            "supervisor_district" -> "supervisor_district"
            else -> "status"
        }

        val response = httpClient.get(PERMITS_URL) {
            parameter("\$select", "$safeColumn AS category, count(*) AS count")
            parameter("\$group", safeColumn)
            parameter("\$order", "count DESC")
            parameter("\$limit", 50)
        }

        return json.decodeFromString(response.bodyAsText())
    }

    /**
     * Fetch police incident reports from SF Open Data with optional filtering and pagination.
     */
    suspend fun getPoliceIncidents(
        filter: IncidentFilter? = null,
        limit: Int = DEFAULT_LIMIT,
        offset: Int = 0
    ): List<PoliceIncidentDto> {
        val effectiveLimit = limit.coerceAtMost(MAX_LIMIT)
        val whereClauses = buildIncidentWhereClauses(filter)

        val response = httpClient.get(INCIDENTS_URL) {
            parameter("\$limit", effectiveLimit)
            parameter("\$offset", offset)
            parameter("\$order", "incident_datetime DESC")
            if (whereClauses.isNotEmpty()) {
                parameter("\$where", whereClauses.joinToString(" AND "))
            }
            filter?.search?.takeIf { it.isNotBlank() }?.let {
                parameter("\$q", it)
            }
        }

        return json.decodeFromString(response.bodyAsText())
    }

    private fun buildIncidentWhereClauses(filter: IncidentFilter?): List<String> {
        if (filter == null) return emptyList()
        val clauses = mutableListOf<String>()
        filter.incidentCategory?.takeIf { it.isNotBlank() }?.let {
            clauses.add("upper(incident_category) = upper('${it.replace("'", "\\'")}')")
        }
        filter.resolution?.takeIf { it.isNotBlank() }?.let {
            clauses.add("upper(resolution) = upper('${it.replace("'", "\\'")}')")
        }
        filter.supervisorDistrict?.takeIf { it.isNotBlank() }?.let {
            clauses.add("supervisor_district = '${it.replace("'", "\\'")}'")
        }
        filter.neighborhood?.takeIf { it.isNotBlank() }?.let {
            clauses.add("upper(analysis_neighborhood) = upper('${it.replace("'", "\\'")}')")
        }
        return clauses
    }

    private fun buildPermitWhereClauses(filter: PermitFilter?): List<String> {
        if (filter == null) return emptyList()
        val clauses = mutableListOf<String>()
        filter.neighborhood?.takeIf { it.isNotBlank() }?.let {
            clauses.add("upper(neighborhoods_analysis_boundaries) = upper('${it.replace("'", "\\'")}')")
        }
        filter.status?.takeIf { it.isNotBlank() }?.let {
            clauses.add("upper(status) = upper('${it.replace("'", "\\'")}')")
        }
        filter.supervisorDistrict?.takeIf { it.isNotBlank() }?.let {
            clauses.add("supervisor_district = '${it.replace("'", "\\'")}'")
        }
        filter.zipcode?.takeIf { it.isNotBlank() }?.let {
            clauses.add("zipcode = '${it.replace("'", "\\'")}'")
        }
        return clauses
    }

    private fun buildCaseWhereClauses(filter: CaseFilter?): List<String> {
        if (filter == null) return emptyList()
        val clauses = mutableListOf<String>()
        filter.serviceName?.takeIf { it.isNotBlank() }?.let {
            clauses.add("upper(service_name) = upper('${it.replace("'", "\\'")}')")
        }
        filter.status?.takeIf { it.isNotBlank() }?.let {
            clauses.add("upper(status_description) = upper('${it.replace("'", "\\'")}')")
        }
        filter.supervisorDistrict?.takeIf { it.isNotBlank() }?.let {
            clauses.add("supervisor_district = '${it.replace("'", "\\'")}'")
        }
        filter.neighborhood?.takeIf { it.isNotBlank() }?.let {
            clauses.add("upper(neighborhood) = upper('${it.replace("'", "\\'")}')")
        }
        return clauses
    }
}

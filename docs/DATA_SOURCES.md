# SF Open Data Sources

This document describes the external data sources used for the City Explorer feature.

## Overview

UrbanMesh proxies public San Francisco civic data through the GraphQL backend. No API key is required for basic usage. Data is fetched live on every request — no local database tables are involved.

All queries use the [Socrata Open Data API (SODA)](https://dev.socrata.com/docs/queries/).

---

## Datasets

### Building Permits

| Field | Value |
|-------|-------|
| Dataset | San Francisco Building Permits |
| Dataset ID | `i98e-djp9` |
| Endpoint | `https://data.sfgov.org/resource/i98e-djp9.json` |
| Portal | https://data.sfgov.org/Housing-and-Buildings/Building-Permits/i98e-djp9 |

#### Field Mappings

| SODA Field | GraphQL Field | Description |
|-----------|---------------|-------------|
| `permit_number` | `permitNumber` | Unique permit identifier |
| `permit_type_definition` | `permitType` | Type of permit (e.g., "new construction") |
| `street_number` + `street_name` | `address` | Formatted address |
| `zipcode` | `zipcode` | ZIP code |
| `status` | `status` | Current permit status |
| `filed_date` | `filedDate` | Date the permit was filed |
| `issued_date` | `issuedDate` | Date the permit was issued |
| `neighborhoods_analysis_boundaries` | `neighborhood` | Neighborhood name |
| `supervisor_district` | `supervisorDistrict` | SF supervisor district |
| `existing_use` | `existingUse` | Existing building use |
| `proposed_use` | `proposedUse` | Proposed building use |
| `estimated_cost` | `estimatedCost` | Estimated construction cost |
| `description` | `description` | Permit description |
| `point.coordinates[1]` | `latitude` | Latitude |
| `point.coordinates[0]` | `longitude` | Longitude |

---

### 311 Service Cases

| Field | Value |
|-------|-------|
| Dataset | SF 311 Cases |
| Dataset ID | `vw6y-z8j6` |
| Endpoint | `https://data.sfgov.org/resource/vw6y-z8j6.json` |
| Portal | https://data.sfgov.org/City-Infrastructure/311-Cases/vw6y-z8j6 |

#### Field Mappings

| SODA Field | GraphQL Field | Description |
|-----------|---------------|-------------|
| `service_request_id` | `serviceRequestId` | Unique case identifier |
| `requested_datetime` | `requestedDatetime` | When the case was opened |
| `closed_date` | `closedDate` | When the case was closed |
| `status_description` | `statusDescription` | Current status description |
| `service_name` | `serviceName` | Category of service request |
| `service_subtype` | `serviceSubtype` | Subcategory |
| `address` | `address` | Incident address |
| `supervisor_district` | `supervisorDistrict` | SF supervisor district |
| `neighborhood` | `neighborhood` | Neighborhood name |
| `lat` | `latitude` | Latitude |
| `long` | `longitude` | Longitude |
| `source` | `source` | How the case was reported (e.g., "Phone", "Web") |
| `agency_responsible` | `agencyResponsible` | SF agency handling the case |

---

## SoQL Query Patterns

SODA supports a SQL-like query language called SoQL. Parameters are passed as URL query parameters.

### Filtering (`$where`)

```
$where=status='issued'
$where=neighborhoods_analysis_boundaries='Mission'
$where=supervisor_district='3'
$where=upper(street_name) like upper('%MARKET%')
```

### Text search (`$q`)

Full-text search across all indexed fields:
```
$q=foundation
```

### Selecting fields (`$select`)

```
$select=permit_number,status,street_number,street_name
```

### Aggregation

```
$select=status, count(*)&$group=status&$order=count desc
```

### Pagination

```
$limit=20&$offset=0
```

### Ordering

```
$order=filed_date desc
```

### Combining parameters

```
https://data.sfgov.org/resource/i98e-djp9.json?$where=status='issued'&$limit=20&$offset=0&$order=filed_date desc
```

---

## Rate Limits

| Auth level | Limit |
|-----------|-------|
| Anonymous (no API key) | 1,000 requests/hour |
| With API key (free registration) | 50,000 requests/hour |

UrbanMesh currently uses anonymous access. No API key is required. For production use with higher traffic, register at https://data.sfgov.org and set `X-App-Token` header.

---

## Adding New Datasets

To add a new SF Open Data dataset:
1. Find the dataset on https://data.sfgov.org
2. Note the dataset ID from the URL (e.g., `i98e-djp9`)
3. Add a `@Serializable` DTO to `SFDataService.kt`
4. Add a new method to `SFDataService`
5. Add GraphQL types and queries to `SFData.graphqls`
6. Create a resolver in `backend/src/main/kotlin/com/urbanmesh/resolvers/`
7. Register in `KoinModule.kt`
8. Add query name to `PUBLIC_OPERATIONS` in `AuthenticationPlugin.kt`

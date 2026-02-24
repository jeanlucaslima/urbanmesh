# 002 — Police Incidents + Cross-Domain Leaflet Map

## What we did

Added a third SF Open Data domain (police incident reports) to UrbanMesh and
built an interactive Leaflet map that plots all three domains as color-coded
markers — demonstrating the conference talk thesis: *"What if a city could run
as a GraphQL server?"*

No database migration needed. All data is fetched live from `data.sfgov.org`.

---

## Backend: adding a new domain follows the same Viaduct workflow

### 1. Extend the schema

Added to `SFData.graphqls`:

- `PoliceIncident` type — 11 fields including `latitude: Float` and
  `longitude: Float` (typed as `Float`, not `String` like the other domains)
- `PoliceIncidentFilter` input
- `policeIncidents` query in the existing `extend type Query @scope(to: ["public"])` block

```graphql
type PoliceIncident @scope(to: ["public"]) {
  incidentId: String!
  incidentCategory: String
  address: String
  latitude: Float
  longitude: Float
  # ...
}

extend type Query @scope(to: ["public"]) {
  # ...existing queries...
  policeIncidents(filter: PoliceIncidentFilter, pagination: PaginationInput): [PoliceIncident!]! @resolver
}
```

### 2. Run the generator

```bash
./gradlew build -x test
```

Generates `QueryResolvers.PoliceIncidents` and `PoliceIncident.Builder(ctx)`.
One thing to verify: check the generated builder's method signatures to know
the exact types. `latitude: Float` in GraphQL maps to `latitude(Double?)` in
the Java/Kotlin builder — use `javap` on the generated `.class` if unsure:

```bash
javap -classpath build/generated-sources/viaduct/grtClasses \
  "viaduct.api.grts.PoliceIncident\$Builder"
```

### 3. Extend `SFDataService`

Added `PoliceIncidentDto` (dataset `wg3w-h783`), `IncidentFilter`, and
`getPoliceIncidents()` following the same SoQL pattern as `getPermits()`.

Latitude and longitude come back as strings from the SODA API, so the DTO
stores them as `String?` and the resolver parses them:

```kotlin
.latitude(dto.latitude?.toDoubleOrNull())
.longitude(dto.longitude?.toDoubleOrNull())
```

### 4. Create the resolver

```kotlin
@Resolver
class PoliceIncidentsQueryResolver(private val sfDataService: SFDataService) :
    QueryResolvers.PoliceIncidents() {

    override suspend fun resolve(ctx: Context): List<PoliceIncident> {
        val filter = ctx.arguments.filter?.let { f ->
            IncidentFilter(incidentCategory = f.incidentCategory, ...)
        }
        return sfDataService.getPoliceIncidents(filter, limit, offset).map { dto ->
            PoliceIncident.Builder(ctx)
                .incidentId(dto.incidentId ?: "")
                .latitude(dto.latitude?.toDoubleOrNull())
                .longitude(dto.longitude?.toDoubleOrNull())
                .build()
        }
    }
}
```

### 5. Register and wire auth

```kotlin
// KoinModule.kt
singleOf(::PoliceIncidentsQueryResolver)

// AuthenticationPlugin.kt
private val PUBLIC_OPERATIONS = setOf(
    "signIn", "signUp", "refreshToken", "supabaseConfig",
    "buildingPermits", "buildingPermit", "serviceCases", "permitSummary",
    "policeIncidents"
)
```

The `@scope(to: ["public"])` directive is the schema declaration; the
`PUBLIC_OPERATIONS` set is the runtime enforcement. Both are required.

---

## Frontend: Leaflet map + Police Incidents tab

### Installing react-leaflet

```bash
npm install react-leaflet leaflet @types/leaflet --legacy-peer-deps
```

The `--legacy-peer-deps` flag is needed due to a peer dependency conflict with
the existing React version.

### `CityMap.tsx` — why `CircleMarker` over `Marker`

Used `CircleMarker` instead of `Marker` for all three layers:

- No default icon image loading — avoids Vite's asset path issues with
  Leaflet's default PNG markers
- SVG-based, so hundreds of points render efficiently
- Easy to color per domain: blue for permits, amber for 311, red for incidents

```tsx
<CircleMarker
  center={[lat, lng]}
  radius={5}
  pathOptions={{ color: "#dc2626", fillColor: "#ef4444", fillOpacity: 0.7 }}
>
  <Popup>...</Popup>
</CircleMarker>
```

Wrapped each domain's markers in a `LayersControl.Overlay` so each layer can
be toggled on/off independently.

### Leaflet CSS

Must be imported explicitly — Leaflet's map tiles and controls won't render
without it:

```tsx
import "leaflet/dist/leaflet.css";
```

### Adding lat/lng to existing queries

The `latitude` and `longitude` fields were already in the backend schema for
`BuildingPermit` and `ServiceCase` — they just weren't being requested. Added
them to both GraphQL query strings and TypeScript interfaces in `City.tsx`.

---

## Local dev fix: Podman socket detection on macOS

The `mise run backend` task was failing with:

```
Error: could not find "gvproxy" in [$BINDIR/../libexec/podman ...]
```

Two fixes:

**1. `~/.config/containers/containers.conf`** (local machine only)

When Podman is installed via the `.pkg` installer, `gvproxy` lands in
`/opt/podman/bin` instead of the `libexec/podman` path Podman searches. Fixed
by pointing Podman to the right directory:

```toml
[engine]
helper_binaries_dir = ["/opt/podman/bin"]
```

This is machine-specific — the path depends on how Podman was installed.

**2. `.mise/scripts/get-podman-socket.sh`** (project fix, committed)

The script searched for sockets matching `/tmp/podman/...` but on macOS,
`$TMPDIR` resolves to `/var/folders/...`. Updated the grep pattern to match
any path ending in `api.sock` from `podman machine inspect`, then added
`$TMPDIR`-aware fallbacks.

---

## Commits

`9d2cb3f` — Add Police Incidents domain + Leaflet map with cross-domain visualization

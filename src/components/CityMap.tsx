import { MapContainer, TileLayer, CircleMarker, Popup, LayersControl } from "react-leaflet";

interface BuildingPermit {
  permitNumber: string;
  permitType?: string;
  address?: string;
  status?: string;
  neighborhood?: string;
  latitude?: string;
  longitude?: string;
}

interface ServiceCase {
  serviceRequestId: string;
  serviceName?: string;
  address?: string;
  statusDescription?: string;
  neighborhood?: string;
  latitude?: string;
  longitude?: string;
}

interface PoliceIncident {
  incidentId: string;
  incidentCategory?: string;
  incidentDescription?: string;
  address?: string;
  resolution?: string;
  neighborhood?: string;
  latitude?: number;
  longitude?: number;
}

interface CityMapProps {
  permits: BuildingPermit[];
  cases: ServiceCase[];
  incidents: PoliceIncident[];
}

const SF_CENTER: [number, number] = [37.76, -122.44];
const DEFAULT_ZOOM = 12;

export function CityMap({ permits, cases, incidents }: CityMapProps) {
  return (
    <MapContainer
      center={SF_CENTER}
      zoom={DEFAULT_ZOOM}
      style={{ height: "600px", width: "100%", borderRadius: "8px" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <LayersControl position="topright">
        <LayersControl.Overlay checked name="Building Permits">
          <>
            {permits
              .filter(p => p.latitude && p.longitude && !isNaN(parseFloat(p.latitude)) && !isNaN(parseFloat(p.longitude)))
              .map(p => (
                <CircleMarker
                  key={`permit-${p.permitNumber}`}
                  center={[parseFloat(p.latitude!), parseFloat(p.longitude!)]}
                  radius={5}
                  pathOptions={{ color: "#2563eb", fillColor: "#3b82f6", fillOpacity: 0.7, weight: 1 }}
                >
                  <Popup>
                    <strong>{p.permitNumber}</strong><br />
                    {p.permitType && <>{p.permitType}<br /></>}
                    {p.address && <>{p.address}<br /></>}
                    {p.status && <>Status: {p.status}<br /></>}
                    {p.neighborhood && <>Neighborhood: {p.neighborhood}</>}
                  </Popup>
                </CircleMarker>
              ))}
          </>
        </LayersControl.Overlay>

        <LayersControl.Overlay checked name="311 Cases">
          <>
            {cases
              .filter(c => c.latitude && c.longitude && !isNaN(parseFloat(c.latitude)) && !isNaN(parseFloat(c.longitude)))
              .map(c => (
                <CircleMarker
                  key={`case-${c.serviceRequestId}`}
                  center={[parseFloat(c.latitude!), parseFloat(c.longitude!)]}
                  radius={5}
                  pathOptions={{ color: "#d97706", fillColor: "#f59e0b", fillOpacity: 0.7, weight: 1 }}
                >
                  <Popup>
                    <strong>{c.serviceRequestId}</strong><br />
                    {c.serviceName && <>{c.serviceName}<br /></>}
                    {c.address && <>{c.address}<br /></>}
                    {c.statusDescription && <>Status: {c.statusDescription}<br /></>}
                    {c.neighborhood && <>Neighborhood: {c.neighborhood}</>}
                  </Popup>
                </CircleMarker>
              ))}
          </>
        </LayersControl.Overlay>

        <LayersControl.Overlay checked name="Police Incidents">
          <>
            {incidents
              .filter(i => i.latitude != null && i.longitude != null)
              .map(i => (
                <CircleMarker
                  key={`incident-${i.incidentId}`}
                  center={[i.latitude!, i.longitude!]}
                  radius={5}
                  pathOptions={{ color: "#dc2626", fillColor: "#ef4444", fillOpacity: 0.7, weight: 1 }}
                >
                  <Popup>
                    <strong>{i.incidentId}</strong><br />
                    {i.incidentCategory && <>{i.incidentCategory}<br /></>}
                    {i.incidentDescription && <>{i.incidentDescription}<br /></>}
                    {i.address && <>{i.address}<br /></>}
                    {i.resolution && <>Resolution: {i.resolution}<br /></>}
                    {i.neighborhood && <>Neighborhood: {i.neighborhood}</>}
                  </Popup>
                </CircleMarker>
              ))}
          </>
        </LayersControl.Overlay>
      </LayersControl>
    </MapContainer>
  );
}

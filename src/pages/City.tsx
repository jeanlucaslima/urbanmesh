import { useState, useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { executePublicGraphQL } from "@/lib/graphql";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, AlertCircle, ArrowLeft, RefreshCw, Phone, Shield } from "lucide-react";
import { CityMap } from "@/components/CityMap";
import "leaflet/dist/leaflet.css";

// ---- GraphQL queries -------------------------------------------------------

const BUILDING_PERMITS_QUERY = `
  query BuildingPermits($filter: BuildingPermitFilter, $pagination: PaginationInput) {
    buildingPermits(filter: $filter, pagination: $pagination) {
      permitNumber
      permitType
      address
      zipcode
      status
      filedDate
      issuedDate
      neighborhood
      supervisorDistrict
      estimatedCost
      description
      latitude
      longitude
    }
  }
`;

const SERVICE_CASES_QUERY = `
  query ServiceCases($filter: ServiceCaseFilter, $pagination: PaginationInput) {
    serviceCases(filter: $filter, pagination: $pagination) {
      serviceRequestId
      requestedDatetime
      closedDate
      statusDescription
      serviceName
      serviceSubtype
      address
      neighborhood
      supervisorDistrict
      agencyResponsible
      source
      latitude
      longitude
    }
  }
`;

const PERMIT_SUMMARY_QUERY = `
  query PermitSummary($groupBy: String!) {
    permitSummary(groupBy: $groupBy) {
      category
      count
    }
  }
`;

const SERVICE_CASE_SUMMARY_QUERY = `
  query ServiceCaseSummary($groupBy: String!) {
    serviceCaseSummary(groupBy: $groupBy) {
      category
      count
    }
  }
`;

const POLICE_INCIDENT_SUMMARY_QUERY = `
  query PoliceIncidentSummary($groupBy: String!) {
    policeIncidentSummary(groupBy: $groupBy) {
      category
      count
    }
  }
`;

const POLICE_INCIDENTS_QUERY = `
  query PoliceIncidents($filter: PoliceIncidentFilter, $pagination: PaginationInput) {
    policeIncidents(filter: $filter, pagination: $pagination) {
      incidentId
      incidentDatetime
      incidentCategory
      incidentSubcategory
      incidentDescription
      resolution
      address
      neighborhood
      supervisorDistrict
      latitude
      longitude
    }
  }
`;

// ---- Types -----------------------------------------------------------------

interface BuildingPermit {
  permitNumber: string;
  permitType?: string;
  address?: string;
  zipcode?: string;
  status?: string;
  filedDate?: string;
  issuedDate?: string;
  neighborhood?: string;
  supervisorDistrict?: string;
  estimatedCost?: string;
  description?: string;
  latitude?: string;
  longitude?: string;
}

interface ServiceCase {
  serviceRequestId: string;
  requestedDatetime?: string;
  closedDate?: string;
  statusDescription?: string;
  serviceName?: string;
  serviceSubtype?: string;
  address?: string;
  neighborhood?: string;
  supervisorDistrict?: string;
  agencyResponsible?: string;
  source?: string;
  latitude?: string;
  longitude?: string;
}

interface PoliceIncident {
  incidentId: string;
  incidentDatetime?: string;
  incidentCategory?: string;
  incidentSubcategory?: string;
  incidentDescription?: string;
  resolution?: string;
  address?: string;
  neighborhood?: string;
  supervisorDistrict?: string;
  latitude?: number;
  longitude?: number;
}

interface SummaryItem {
  category: string;
  count: number;
}

// ---- Helpers ----------------------------------------------------------------

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

function formatCurrency(value?: string | null): string {
  if (!value) return "—";
  const num = parseFloat(value);
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(num);
}

function statusColor(status?: string | null): "default" | "secondary" | "destructive" | "outline" {
  if (!status) return "outline";
  const s = status.toLowerCase();
  if (s.includes("issued") || s.includes("complete") || s.includes("closed")) return "default";
  if (s.includes("filed") || s.includes("open") || s.includes("pending")) return "secondary";
  if (s.includes("expired") || s.includes("revoked") || s.includes("cancel")) return "destructive";
  return "outline";
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ---- DomainSummaryCard component -------------------------------------------

interface DomainSummaryCardProps {
  title: string;
  icon: ReactNode;
  items: SummaryItem[];
  loading: boolean;
  error: string | null;
  tabValue: string;
  borderClass: string;
  badgeBgClass: string;
  barClass: string;
  onSelect: (tab: string) => void;
}

function DomainSummaryCard({
  title, icon, items, loading, error, tabValue, borderClass, badgeBgClass, barClass, onSelect
}: DomainSummaryCardProps) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  const top5 = items.slice(0, 5);

  return (
    <Card
      className={`border-t-4 ${borderClass} cursor-pointer hover:shadow-md transition-shadow`}
      onClick={() => onSelect(tabValue)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${badgeBgClass}`}>
            {icon}
          </div>
          <div>
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
            {!loading && !error && (
              <p className="text-xs text-muted-foreground">{total.toLocaleString()} total</p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="flex items-center gap-2 text-destructive text-xs">
            <AlertCircle className="h-3 w-3" />
            Failed to load
          </div>
        ) : loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {top5.map(item => {
              const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
              return (
                <div key={item.category}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="truncate max-w-[70%] capitalize" title={item.category}>
                      {item.category}
                    </span>
                    <span className="text-muted-foreground ml-1 shrink-0">
                      {item.count.toLocaleString()} ({pct}%)
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barClass}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---- Main page -------------------------------------------------------------

const PAGE_SIZE = 20;

const PERMIT_STATUS_OPTIONS = [
  "issued", "filed", "expired", "complete", "revoked", "cancelled", "withdrawn", "disapproved"
];

const CASE_STATUS_OPTIONS = ["Open", "Closed"];

const INCIDENT_CATEGORY_OPTIONS = [
  "Larceny Theft", "Assault", "Burglary", "Motor Vehicle Theft", "Vandalism",
  "Drug Offense", "Robbery", "Fraud", "Disorderly Conduct", "Missing Person",
  "Warrant", "Traffic Collision", "Suspicious Occ", "Other Miscellaneous"
];

const INCIDENT_RESOLUTION_OPTIONS = [
  "Cite or Arrest Adult", "Exceptional Adult", "Unfounded", "Open or Active", "Not Prosecuted"
];

const NEIGHBORHOOD_OPTIONS = [
  "Mission", "Castro/Upper Market", "Haight Ashbury", "South of Market", "Tenderloin",
  "Financial District/South Beach", "Nob Hill", "North Beach", "Richmond", "Sunset/Parkside",
  "Western Addition", "Potrero Hill", "Bernal Heights", "Excelsior", "Bayview Hunters Point",
  "Noe Valley", "Glen Park", "Twin Peaks", "Chinatown", "Pacific Heights"
];

const City = () => {
  // ----- Active tab -----
  const [activeTab, setActiveTab] = useState("permits");

  // ----- Summary state -----
  const [permitSummary, setPermitSummary] = useState<SummaryItem[]>([]);
  const [permitSummaryLoading, setPermitSummaryLoading] = useState(true);
  const [permitSummaryError, setPermitSummaryError] = useState<string | null>(null);

  const [caseSummary, setCaseSummary] = useState<SummaryItem[]>([]);
  const [caseSummaryLoading, setCaseSummaryLoading] = useState(true);
  const [caseSummaryError, setCaseSummaryError] = useState<string | null>(null);

  const [incidentSummary, setIncidentSummary] = useState<SummaryItem[]>([]);
  const [incidentSummaryLoading, setIncidentSummaryLoading] = useState(true);
  const [incidentSummaryError, setIncidentSummaryError] = useState<string | null>(null);

  // ----- Permits state -----
  const [permits, setPermits] = useState<BuildingPermit[]>([]);
  const [permitsLoading, setPermitsLoading] = useState(false);
  const [permitsError, setPermitsError] = useState<string | null>(null);
  const [permitsOffset, setPermitsOffset] = useState(0);
  const [permitsHasMore, setPermitsHasMore] = useState(true);

  const [permitSearch, setPermitSearch] = useState("");
  const [permitStatus, setPermitStatus] = useState("");
  const [permitNeighborhood, setPermitNeighborhood] = useState("");
  const debouncedPermitSearch = useDebounce(permitSearch, 300);

  // ----- Cases state -----
  const [cases, setCases] = useState<ServiceCase[]>([]);
  const [casesLoading, setCasesLoading] = useState(false);
  const [casesError, setCasesError] = useState<string | null>(null);
  const [casesOffset, setCasesOffset] = useState(0);
  const [casesHasMore, setCasesHasMore] = useState(true);

  const [caseSearch, setCaseSearch] = useState("");
  const [caseStatus, setCaseStatus] = useState("");
  const [caseNeighborhood, setCaseNeighborhood] = useState("");
  const debouncedCaseSearch = useDebounce(caseSearch, 300);

  // ----- Incidents state -----
  const [incidents, setIncidents] = useState<PoliceIncident[]>([]);
  const [incidentsLoading, setIncidentsLoading] = useState(false);
  const [incidentsError, setIncidentsError] = useState<string | null>(null);
  const [incidentsOffset, setIncidentsOffset] = useState(0);
  const [incidentsHasMore, setIncidentsHasMore] = useState(true);

  const [incidentSearch, setIncidentSearch] = useState("");
  const [incidentCategory, setIncidentCategory] = useState("");
  const [incidentNeighborhood, setIncidentNeighborhood] = useState("");
  const debouncedIncidentSearch = useDebounce(incidentSearch, 300);

  // ----- Load summaries -----
  useEffect(() => {
    setPermitSummaryLoading(true);
    setPermitSummaryError(null);
    executePublicGraphQL<{ permitSummary: SummaryItem[] }>(PERMIT_SUMMARY_QUERY, { groupBy: "status" })
      .then(data => setPermitSummary(data.permitSummary))
      .catch(err => setPermitSummaryError(err.message))
      .finally(() => setPermitSummaryLoading(false));

    setCaseSummaryLoading(true);
    setCaseSummaryError(null);
    executePublicGraphQL<{ serviceCaseSummary: SummaryItem[] }>(SERVICE_CASE_SUMMARY_QUERY, { groupBy: "status_description" })
      .then(data => setCaseSummary(data.serviceCaseSummary))
      .catch(err => setCaseSummaryError(err.message))
      .finally(() => setCaseSummaryLoading(false));

    setIncidentSummaryLoading(true);
    setIncidentSummaryError(null);
    executePublicGraphQL<{ policeIncidentSummary: SummaryItem[] }>(POLICE_INCIDENT_SUMMARY_QUERY, { groupBy: "incident_category" })
      .then(data => setIncidentSummary(data.policeIncidentSummary))
      .catch(err => setIncidentSummaryError(err.message))
      .finally(() => setIncidentSummaryLoading(false));
  }, []);

  // Generation counters prevent stale fetches from writing state under React StrictMode.
  const permitsFetchGen = useRef(0);
  const casesFetchGen = useRef(0);
  const incidentsFetchGen = useRef(0);

  // Keep refs to current filter values so load-more handlers always use fresh state
  const permitFilterRef = useRef({ debouncedPermitSearch, permitStatus, permitNeighborhood });
  permitFilterRef.current = { debouncedPermitSearch, permitStatus, permitNeighborhood };

  const caseFilterRef = useRef({ debouncedCaseSearch, caseStatus, caseNeighborhood });
  caseFilterRef.current = { debouncedCaseSearch, caseStatus, caseNeighborhood };

  const incidentFilterRef = useRef({ debouncedIncidentSearch, incidentCategory, incidentNeighborhood });
  incidentFilterRef.current = { debouncedIncidentSearch, incidentCategory, incidentNeighborhood };

  // ----- Load permits on filter change -----
  useEffect(() => {
    const gen = ++permitsFetchGen.current;

    setPermits([]);
    setPermitsOffset(0);
    setPermitsHasMore(true);
    setPermitsLoading(true);
    setPermitsError(null);

    const filter: Record<string, string> = {};
    if (debouncedPermitSearch) filter.search = debouncedPermitSearch;
    if (permitStatus) filter.status = permitStatus;
    if (permitNeighborhood) filter.neighborhood = permitNeighborhood;

    executePublicGraphQL<{ buildingPermits: BuildingPermit[] }>(BUILDING_PERMITS_QUERY, {
      filter: Object.keys(filter).length > 0 ? filter : null,
      pagination: { limit: PAGE_SIZE, offset: 0 },
    })
      .then(data => {
        if (permitsFetchGen.current !== gen) return;
        setPermits(data.buildingPermits);
        setPermitsHasMore(data.buildingPermits.length === PAGE_SIZE);
      })
      .catch(err => { if (permitsFetchGen.current === gen) setPermitsError(err.message); })
      .finally(() => { if (permitsFetchGen.current === gen) setPermitsLoading(false); });
  }, [debouncedPermitSearch, permitStatus, permitNeighborhood]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMorePermits = () => {
    const next = permitsOffset + PAGE_SIZE;
    setPermitsOffset(next);
    setPermitsLoading(true);

    const { debouncedPermitSearch: s, permitStatus: st, permitNeighborhood: n } = permitFilterRef.current;
    const filter: Record<string, string> = {};
    if (s) filter.search = s;
    if (st) filter.status = st;
    if (n) filter.neighborhood = n;

    executePublicGraphQL<{ buildingPermits: BuildingPermit[] }>(BUILDING_PERMITS_QUERY, {
      filter: Object.keys(filter).length > 0 ? filter : null,
      pagination: { limit: PAGE_SIZE, offset: next },
    })
      .then(data => {
        setPermits(prev => [...prev, ...data.buildingPermits]);
        setPermitsHasMore(data.buildingPermits.length === PAGE_SIZE);
      })
      .catch(err => setPermitsError(err.message))
      .finally(() => setPermitsLoading(false));
  };

  // ----- Load cases on filter change -----
  useEffect(() => {
    const gen = ++casesFetchGen.current;

    setCases([]);
    setCasesOffset(0);
    setCasesHasMore(true);
    setCasesLoading(true);
    setCasesError(null);

    const filter: Record<string, string> = {};
    if (debouncedCaseSearch) filter.search = debouncedCaseSearch;
    if (caseStatus) filter.status = caseStatus;
    if (caseNeighborhood) filter.neighborhood = caseNeighborhood;

    executePublicGraphQL<{ serviceCases: ServiceCase[] }>(SERVICE_CASES_QUERY, {
      filter: Object.keys(filter).length > 0 ? filter : null,
      pagination: { limit: PAGE_SIZE, offset: 0 },
    })
      .then(data => {
        if (casesFetchGen.current !== gen) return;
        setCases(data.serviceCases);
        setCasesHasMore(data.serviceCases.length === PAGE_SIZE);
      })
      .catch(err => { if (casesFetchGen.current === gen) setCasesError(err.message); })
      .finally(() => { if (casesFetchGen.current === gen) setCasesLoading(false); });
  }, [debouncedCaseSearch, caseStatus, caseNeighborhood]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMoreCases = () => {
    const next = casesOffset + PAGE_SIZE;
    setCasesOffset(next);
    setCasesLoading(true);

    const { debouncedCaseSearch: s, caseStatus: st, caseNeighborhood: n } = caseFilterRef.current;
    const filter: Record<string, string> = {};
    if (s) filter.search = s;
    if (st) filter.status = st;
    if (n) filter.neighborhood = n;

    executePublicGraphQL<{ serviceCases: ServiceCase[] }>(SERVICE_CASES_QUERY, {
      filter: Object.keys(filter).length > 0 ? filter : null,
      pagination: { limit: PAGE_SIZE, offset: next },
    })
      .then(data => {
        setCases(prev => [...prev, ...data.serviceCases]);
        setCasesHasMore(data.serviceCases.length === PAGE_SIZE);
      })
      .catch(err => setCasesError(err.message))
      .finally(() => setCasesLoading(false));
  };

  // ----- Load incidents on filter change -----
  useEffect(() => {
    const gen = ++incidentsFetchGen.current;

    setIncidents([]);
    setIncidentsOffset(0);
    setIncidentsHasMore(true);
    setIncidentsLoading(true);
    setIncidentsError(null);

    const filter: Record<string, string> = {};
    if (debouncedIncidentSearch) filter.search = debouncedIncidentSearch;
    if (incidentCategory) filter.incidentCategory = incidentCategory;
    if (incidentNeighborhood) filter.neighborhood = incidentNeighborhood;

    executePublicGraphQL<{ policeIncidents: PoliceIncident[] }>(POLICE_INCIDENTS_QUERY, {
      filter: Object.keys(filter).length > 0 ? filter : null,
      pagination: { limit: PAGE_SIZE, offset: 0 },
    })
      .then(data => {
        if (incidentsFetchGen.current !== gen) return;
        setIncidents(data.policeIncidents);
        setIncidentsHasMore(data.policeIncidents.length === PAGE_SIZE);
      })
      .catch(err => { if (incidentsFetchGen.current === gen) setIncidentsError(err.message); })
      .finally(() => { if (incidentsFetchGen.current === gen) setIncidentsLoading(false); });
  }, [debouncedIncidentSearch, incidentCategory, incidentNeighborhood]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMoreIncidents = () => {
    const next = incidentsOffset + PAGE_SIZE;
    setIncidentsOffset(next);
    setIncidentsLoading(true);

    const { debouncedIncidentSearch: s, incidentCategory: cat, incidentNeighborhood: n } = incidentFilterRef.current;
    const filter: Record<string, string> = {};
    if (s) filter.search = s;
    if (cat) filter.incidentCategory = cat;
    if (n) filter.neighborhood = n;

    executePublicGraphQL<{ policeIncidents: PoliceIncident[] }>(POLICE_INCIDENTS_QUERY, {
      filter: Object.keys(filter).length > 0 ? filter : null,
      pagination: { limit: PAGE_SIZE, offset: next },
    })
      .then(data => {
        setIncidents(prev => [...prev, ...data.policeIncidents]);
        setIncidentsHasMore(data.policeIncidents.length === PAGE_SIZE);
      })
      .catch(err => setIncidentsError(err.message))
      .finally(() => setIncidentsLoading(false));
  };

  // ---- Render ----------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary-glow">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                SF City Explorer
              </h1>
              <p className="text-sm text-muted-foreground">Live data from SF Open Data — no login required</p>
            </div>
          </div>
          <Link to="/">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        {/* Summary cards */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
            Data Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <DomainSummaryCard
              title="Building Permits"
              icon={<Building2 className="h-4 w-4 text-blue-700" />}
              items={permitSummary}
              loading={permitSummaryLoading}
              error={permitSummaryError}
              tabValue="permits"
              borderClass="border-t-blue-500"
              badgeBgClass="bg-blue-100"
              barClass="bg-blue-500"
              onSelect={setActiveTab}
            />
            <DomainSummaryCard
              title="311 Service Cases"
              icon={<Phone className="h-4 w-4 text-amber-700" />}
              items={caseSummary}
              loading={caseSummaryLoading}
              error={caseSummaryError}
              tabValue="cases"
              borderClass="border-t-amber-500"
              badgeBgClass="bg-amber-100"
              barClass="bg-amber-500"
              onSelect={setActiveTab}
            />
            <DomainSummaryCard
              title="Police Incidents"
              icon={<Shield className="h-4 w-4 text-red-700" />}
              items={incidentSummary}
              loading={incidentSummaryLoading}
              error={incidentSummaryError}
              tabValue="incidents"
              borderClass="border-t-red-500"
              badgeBgClass="bg-red-100"
              barClass="bg-red-500"
              onSelect={setActiveTab}
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="permits">Building Permits</TabsTrigger>
            <TabsTrigger value="cases">311 Cases</TabsTrigger>
            <TabsTrigger value="incidents">Police Incidents</TabsTrigger>
            <TabsTrigger value="map">Map</TabsTrigger>
          </TabsList>

          {/* ---- Building Permits Tab ---- */}
          <TabsContent value="permits" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Filter Permits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    placeholder="Search permits..."
                    value={permitSearch}
                    onChange={e => setPermitSearch(e.target.value)}
                    className="flex-1"
                  />
                  <Select value={permitStatus || "all"} onValueChange={v => setPermitStatus(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      {PERMIT_STATUS_OPTIONS.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={permitNeighborhood || "all"} onValueChange={v => setPermitNeighborhood(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-full sm:w-52">
                      <SelectValue placeholder="All neighborhoods" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All neighborhoods</SelectItem>
                      {NEIGHBORHOOD_OPTIONS.map(n => (
                        <SelectItem key={n} value={n}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {permitsError ? (
              <div className="flex items-center gap-2 text-destructive text-sm p-4">
                <AlertCircle className="h-4 w-4" />
                {permitsError}
              </div>
            ) : (
              <Card>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Permit #</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Neighborhood</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Filed</TableHead>
                        <TableHead>Est. Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {permitsLoading && permits.length === 0
                        ? Array.from({ length: 8 }).map((_, i) => (
                            <TableRow key={i}>
                              {Array.from({ length: 7 }).map((_, j) => (
                                <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                              ))}
                            </TableRow>
                          ))
                        : permits
                            .filter(p =>
                              (!permitNeighborhood || p.neighborhood?.toLowerCase().includes(permitNeighborhood.toLowerCase())) &&
                              (!permitStatus || p.status?.toLowerCase().includes(permitStatus.toLowerCase()))
                            )
                            .map((permit, idx) => (
                            <TableRow key={`${permit.permitNumber}-${permit.address ?? idx}`}>
                              <TableCell className="font-mono text-xs whitespace-nowrap">
                                {permit.permitNumber}
                              </TableCell>
                              <TableCell className="text-xs max-w-[120px] truncate" title={permit.permitType ?? undefined}>
                                {permit.permitType ?? "—"}
                              </TableCell>
                              <TableCell className="text-xs max-w-[160px] truncate" title={permit.address ?? undefined}>
                                {permit.address ?? "—"}
                              </TableCell>
                              <TableCell className="text-xs">{permit.neighborhood ?? "—"}</TableCell>
                              <TableCell>
                                <Badge variant={statusColor(permit.status)} className="text-xs capitalize">
                                  {permit.status ?? "—"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs whitespace-nowrap">
                                {formatDate(permit.filedDate)}
                              </TableCell>
                              <TableCell className="text-xs whitespace-nowrap">
                                {formatCurrency(permit.estimatedCost)}
                              </TableCell>
                            </TableRow>
                          ))
                      }
                    </TableBody>
                  </Table>
                </div>
                {permits.length > 0 && (
                  <div className="p-4 border-t flex items-center justify-between text-sm text-muted-foreground">
                    <span>Showing {permits.length} permits</span>
                    {permitsHasMore && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={loadMorePermits}
                        disabled={permitsLoading}
                      >
                        {permitsLoading ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : null}
                        Load More
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            )}
          </TabsContent>

          {/* ---- 311 Cases Tab ---- */}
          <TabsContent value="cases" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Filter 311 Cases</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    placeholder="Search cases..."
                    value={caseSearch}
                    onChange={e => setCaseSearch(e.target.value)}
                    className="flex-1"
                  />
                  <Select value={caseStatus || "all"} onValueChange={v => setCaseStatus(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      {CASE_STATUS_OPTIONS.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={caseNeighborhood || "all"} onValueChange={v => setCaseNeighborhood(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-full sm:w-52">
                      <SelectValue placeholder="All neighborhoods" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All neighborhoods</SelectItem>
                      {NEIGHBORHOOD_OPTIONS.map(n => (
                        <SelectItem key={n} value={n}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {casesError ? (
              <div className="flex items-center gap-2 text-destructive text-sm p-4">
                <AlertCircle className="h-4 w-4" />
                {casesError}
              </div>
            ) : (
              <Card>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Case ID</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Subtype</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Neighborhood</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Opened</TableHead>
                        <TableHead>Agency</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {casesLoading && cases.length === 0
                        ? Array.from({ length: 8 }).map((_, i) => (
                            <TableRow key={i}>
                              {Array.from({ length: 8 }).map((_, j) => (
                                <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                              ))}
                            </TableRow>
                          ))
                        : cases
                            .filter(c =>
                              (!caseNeighborhood || c.neighborhood?.toLowerCase().includes(caseNeighborhood.toLowerCase())) &&
                              (!caseStatus || c.statusDescription?.toLowerCase().includes(caseStatus.toLowerCase()))
                            )
                            .map(c => (
                            <TableRow key={c.serviceRequestId}>
                              <TableCell className="font-mono text-xs whitespace-nowrap">
                                {c.serviceRequestId}
                              </TableCell>
                              <TableCell className="text-xs max-w-[140px] truncate" title={c.serviceName ?? undefined}>
                                {c.serviceName ?? "—"}
                              </TableCell>
                              <TableCell className="text-xs max-w-[120px] truncate" title={c.serviceSubtype ?? undefined}>
                                {c.serviceSubtype ?? "—"}
                              </TableCell>
                              <TableCell className="text-xs max-w-[160px] truncate" title={c.address ?? undefined}>
                                {c.address ?? "—"}
                              </TableCell>
                              <TableCell className="text-xs">{c.neighborhood ?? "—"}</TableCell>
                              <TableCell>
                                <Badge variant={statusColor(c.statusDescription)} className="text-xs capitalize">
                                  {c.statusDescription ?? "—"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs whitespace-nowrap">
                                {formatDate(c.requestedDatetime)}
                              </TableCell>
                              <TableCell className="text-xs max-w-[140px] truncate" title={c.agencyResponsible ?? undefined}>
                                {c.agencyResponsible ?? "—"}
                              </TableCell>
                            </TableRow>
                          ))
                      }
                    </TableBody>
                  </Table>
                </div>
                {cases.length > 0 && (
                  <div className="p-4 border-t flex items-center justify-between text-sm text-muted-foreground">
                    <span>Showing {cases.length} cases</span>
                    {casesHasMore && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={loadMoreCases}
                        disabled={casesLoading}
                      >
                        {casesLoading ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : null}
                        Load More
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            )}
          </TabsContent>

          {/* ---- Police Incidents Tab ---- */}
          <TabsContent value="incidents" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Filter Police Incidents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    placeholder="Search incidents..."
                    value={incidentSearch}
                    onChange={e => setIncidentSearch(e.target.value)}
                    className="flex-1"
                  />
                  <Select value={incidentCategory || "all"} onValueChange={v => setIncidentCategory(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-full sm:w-52">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {INCIDENT_CATEGORY_OPTIONS.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={incidentNeighborhood || "all"} onValueChange={v => setIncidentNeighborhood(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-full sm:w-52">
                      <SelectValue placeholder="All neighborhoods" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All neighborhoods</SelectItem>
                      {NEIGHBORHOOD_OPTIONS.map(n => (
                        <SelectItem key={n} value={n}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {incidentsError ? (
              <div className="flex items-center gap-2 text-destructive text-sm p-4">
                <AlertCircle className="h-4 w-4" />
                {incidentsError}
              </div>
            ) : (
              <Card>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Incident ID</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Subcategory</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Neighborhood</TableHead>
                        <TableHead>Resolution</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {incidentsLoading && incidents.length === 0
                        ? Array.from({ length: 8 }).map((_, i) => (
                            <TableRow key={i}>
                              {Array.from({ length: 7 }).map((_, j) => (
                                <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                              ))}
                            </TableRow>
                          ))
                        : incidents
                            .filter(i =>
                              (!incidentCategory || i.incidentCategory?.toLowerCase().includes(incidentCategory.toLowerCase())) &&
                              (!incidentNeighborhood || i.neighborhood?.toLowerCase().includes(incidentNeighborhood.toLowerCase()))
                            )
                            .map(i => (
                            <TableRow key={i.incidentId}>
                              <TableCell className="font-mono text-xs whitespace-nowrap">
                                {i.incidentId}
                              </TableCell>
                              <TableCell className="text-xs max-w-[140px] truncate" title={i.incidentCategory ?? undefined}>
                                {i.incidentCategory ?? "—"}
                              </TableCell>
                              <TableCell className="text-xs max-w-[140px] truncate" title={i.incidentSubcategory ?? undefined}>
                                {i.incidentSubcategory ?? "—"}
                              </TableCell>
                              <TableCell className="text-xs max-w-[160px] truncate" title={i.address ?? undefined}>
                                {i.address ?? "—"}
                              </TableCell>
                              <TableCell className="text-xs">{i.neighborhood ?? "—"}</TableCell>
                              <TableCell className="text-xs max-w-[140px] truncate" title={i.resolution ?? undefined}>
                                {i.resolution ?? "—"}
                              </TableCell>
                              <TableCell className="text-xs whitespace-nowrap">
                                {formatDate(i.incidentDatetime)}
                              </TableCell>
                            </TableRow>
                          ))
                      }
                    </TableBody>
                  </Table>
                </div>
                {incidents.length > 0 && (
                  <div className="p-4 border-t flex items-center justify-between text-sm text-muted-foreground">
                    <span>Showing {incidents.length} incidents</span>
                    {incidentsHasMore && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={loadMoreIncidents}
                        disabled={incidentsLoading}
                      >
                        {incidentsLoading ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : null}
                        Load More
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            )}
          </TabsContent>

          {/* ---- Map Tab ---- */}
          <TabsContent value="map" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">City Map</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-hidden rounded-b-lg">
                <div className="px-6 pb-3 pt-0 text-xs text-muted-foreground flex gap-4">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 rounded-full bg-blue-500"></span> Building Permits
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 rounded-full bg-amber-500"></span> 311 Cases
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 rounded-full bg-red-500"></span> Police Incidents
                  </span>
                </div>
                <div className="px-6 pb-6">
                  <CityMap permits={permits} cases={cases} incidents={incidents} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <p className="text-center text-xs text-muted-foreground">
          Data sourced from{" "}
          <a href="https://data.sfgov.org" target="_blank" rel="noopener noreferrer" className="underline">
            SF Open Data
          </a>{" "}
          via SODA API
        </p>
      </div>
    </div>
  );
};

export default City;

import { useState, useEffect, useRef } from "react";
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
import { Building2, AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";

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
}

interface PermitSummary {
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

// ---- Main page -------------------------------------------------------------

const PAGE_SIZE = 20;

const PERMIT_STATUS_OPTIONS = [
  "issued", "filed", "expired", "complete", "revoked", "cancelled", "withdrawn", "disapproved"
];

const CASE_STATUS_OPTIONS = ["Open", "Closed"];

const NEIGHBORHOOD_OPTIONS = [
  "Mission", "Castro/Upper Market", "Haight Ashbury", "South of Market", "Tenderloin",
  "Financial District/South Beach", "Nob Hill", "North Beach", "Richmond", "Sunset/Parkside",
  "Western Addition", "Potrero Hill", "Bernal Heights", "Excelsior", "Bayview Hunters Point",
  "Noe Valley", "Glen Park", "Twin Peaks", "Chinatown", "Pacific Heights"
];

const City = () => {
  // ----- Summary state -----
  const [summary, setSummary] = useState<PermitSummary[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

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

  // ----- Load summary -----
  useEffect(() => {
    setSummaryLoading(true);
    setSummaryError(null);
    executePublicGraphQL<{ permitSummary: PermitSummary[] }>(PERMIT_SUMMARY_QUERY, { groupBy: "status" })
      .then(data => setSummary(data.permitSummary))
      .catch(err => setSummaryError(err.message))
      .finally(() => setSummaryLoading(false));
  }, []);

  // Generation counters (shared via ref across all invocations) prevent stale fetches from
  // writing state even under React StrictMode's double-invocation of effects.
  const permitsFetchGen = useRef(0);
  const casesFetchGen = useRef(0);

  // Keep refs to current filter values so load-more handlers always use fresh state
  const permitFilterRef = useRef({ debouncedPermitSearch, permitStatus, permitNeighborhood });
  permitFilterRef.current = { debouncedPermitSearch, permitStatus, permitNeighborhood };

  const caseFilterRef = useRef({ debouncedCaseSearch, caseStatus, caseNeighborhood });
  caseFilterRef.current = { debouncedCaseSearch, caseStatus, caseNeighborhood };

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
            Permit Status Summary
          </h2>
          {summaryError ? (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              Failed to load summary: {summaryError}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {summaryLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <Card key={i}>
                      <CardContent className="pt-4 pb-4">
                        <Skeleton className="h-6 w-16 mb-1" />
                        <Skeleton className="h-4 w-24" />
                      </CardContent>
                    </Card>
                  ))
                : summary.slice(0, 10).map(item => (
                    <Card key={item.category}>
                      <CardContent className="pt-4 pb-4">
                        <p className="text-2xl font-bold">{item.count.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground capitalize truncate" title={item.category}>
                          {item.category}
                        </p>
                      </CardContent>
                    </Card>
                  ))
              }
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="permits">
          <TabsList>
            <TabsTrigger value="permits">Building Permits</TabsTrigger>
            <TabsTrigger value="cases">311 Cases</TabsTrigger>
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
